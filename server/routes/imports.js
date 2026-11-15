import { Router } from "express";
import crypto from "node:crypto";
import { authenticate, requireRole, sendValidationError } from "../middleware/auth.js";
import { createUser } from "./auth.js";
import { User } from "../models/User.js";
import { ClassSection } from "../models/ClassSection.js";
import { Subject } from "../models/Subject.js";
import { Enrollment } from "../models/Enrollment.js";
import { FacultyAssignment } from "../models/FacultyAssignment.js";
import { Attendance, ATTENDANCE_STATUSES } from "../models/Attendance.js";
import { Marks } from "../models/Marks.js";
import { ASSESSMENT_FIELDS, calculateAssessmentSummary, normalizeAssessmentScore } from "../utils/assessment.js";
import { ImportBatch } from "../models/ImportBatch.js";
import { ensureDataFolder, classFolderSegments, teachingFolderSegments } from "../utils/autoFolders.js";
import { studentEnrolledInClass } from "../access.js";

export const importsRouter = Router();
importsRouter.use(authenticate, requireRole("admin", "faculty"));

const MAX_ROWS = 2000;
const ADMIN_TYPES = new Set(["students", "faculty", "classes", "subjects", "enrollments", "faculty-assignments", "attendance", "marks"]);
const FACULTY_TYPES = new Set(["attendance", "marks"]);
const clean = (value, max = 160) => String(value ?? "").trim().slice(0, max);
const upper = (value) => clean(value, 80).toUpperCase();
const normal = (value) => clean(value, 160).toLocaleLowerCase("en-US");
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exactInsensitive = (value) => new RegExp(`^${escapeRegex(clean(value))}$`, "i");
const isBlank = (value) => value === null || value === undefined || String(value).trim() === "";

function rowError(rowNumber, message) { return { rowNumber, error: message }; }
function validateRowsInput(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "The worksheet contains no data rows.";
  if (rows.length > MAX_ROWS) return `A single import is limited to ${MAX_ROWS} data rows. Split larger files into smaller sheets.`;
  if (rows.some((row) => !row || typeof row !== "object" || Array.isArray(row))) return "Every worksheet row must be an object with column headers.";
  return "";
}
function parseSemester(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 12) throw new Error("Semester must be a whole number from 1 to 12.");
  return number;
}
function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = clean(value, 40);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day) return text;
    throw new Error("Date is not a valid calendar date. Use YYYY-MM-DD.");
  }
  if (/^\d+(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (serial > 20000 && serial < 80000) {
      const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
      return date.toISOString().slice(0, 10);
    }
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  throw new Error("Date must be a valid date. Use YYYY-MM-DD in the Excel template.");
}
function parseScore(value, field) {
  if (isBlank(value)) return null;
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error(`${field.toUpperCase()} must be between 0 and 100.`);
  return score;
}
function validateContext(context = {}) {
  if (!context.classId || !context.subjectId) throw new Error("Select a class and subject before importing attendance or marks.");
  return true;
}

async function getImportContext(req, context) {
  validateContext(context);
  const [classRecord, subject] = await Promise.all([
    ClassSection.findById(context.classId).lean(),
    Subject.findById(context.subjectId).lean(),
  ]);
  if (!classRecord || !subject) throw new Error("The selected class or subject no longer exists. Refresh and select it again.");
  let assignment;
  if (req.user.role === "faculty") {
    assignment = await FacultyAssignment.findOne({ facultyId: req.user.id, classId: classRecord._id, subjectId: subject._id }).lean();
    if (!assignment) throw Object.assign(new Error("This class and subject are not assigned to your faculty account."), { status: 403 });
  } else {
    const assignmentFilter = { classId: classRecord._id, subjectId: subject._id };
    if (context.facultyId) assignmentFilter.facultyId = context.facultyId;
    if (context.assignmentId) assignmentFilter._id = context.assignmentId;
    assignment = await FacultyAssignment.findOne(assignmentFilter).lean();
    if (!assignment) throw new Error("Select an existing faculty allocation for this class and subject before importing attendance or marks.");
  }
  return { classRecord, subject, assignment, facultyId: req.user.role === "faculty" ? req.user.id : String(assignment.facultyId) };
}

async function resolveStudent(identifier) {
  const key = upper(identifier);
  if (!key) throw new Error("Student ID / USN is required.");
  const student = await User.findOne({ role: "student", isActive: true, $or: [{ code: key }, { usn: key }] }).select("_id code usn name role").lean();
  if (!student) throw new Error(`No active student account found for '${key}'.`);
  return student;
}

async function prepareRow(req, type, row, rowNumber, context, resolvedContext) {
  const get = (...keys) => {
    for (const key of keys) if (Object.hasOwn(row, key) && !isBlank(row[key])) return row[key];
    return "";
  };

  if (type === "students" || type === "faculty") {
    const code = upper(get("userId", "code", "studentId", "facultyId"));
    const name = clean(get("name", "fullName"), 120);
    const role = type === "students" ? "student" : "faculty";
    if (!code || !/^[A-Z0-9._-]+$/.test(code)) throw new Error("User ID is required and may contain only letters, numbers, dot, underscore or hyphen.");
    if (!name) throw new Error("Name is required.");
    const usn = upper(get("usn"));
    const email = clean(get("email"), 254).toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email address is invalid.");
    if (type === "students" && !usn && !code) throw new Error("Student USN or User ID is required.");
    const semester = isBlank(get("semester")) ? null : parseSemester(get("semester"));
    const existing = await User.findOne({ $or: [{ code }, ...(usn ? [{ usn }] : []), ...(email ? [{ email }] : [])] }).select("code").lean();
    if (existing) throw new Error(`User ID, USN or email already belongs to ${existing.code}. Existing accounts are not overwritten by bulk import.`);
    return { data: { code, name, role, usn, email, phone: clean(get("phone"), 30), department: clean(get("department"), 120), program: clean(get("program", "programme"), 120), semester, section: clean(get("section"), 20) } };
  }

  if (type === "classes") {
    const department = clean(get("department"), 120);
    const academicYear = clean(get("academicYear"), 20);
    const semester = parseSemester(get("semester"));
    const section = clean(get("section"), 20).toUpperCase();
    const name = clean(get("name", "className"), 120) || `${department} · Semester ${semester} · Section ${section}`;
    if (!department || !academicYear || !section) throw new Error("Department, academicYear and section are required.");
    return { data: { department, academicYear, semester, section, name } };
  }

  if (type === "subjects") {
    const code = upper(get("subjectCode", "code"));
    const name = clean(get("subjectName", "name"), 160);
    if (!code || !name) throw new Error("subjectCode and subjectName are required.");
    const semester = isBlank(get("semester")) ? null : parseSemester(get("semester"));
    return { data: { code, name, department: clean(get("department"), 120), semester, section: clean(get("section"), 20) } };
  }

  if (type === "enrollments") {
    const student = await resolveStudent(get("studentId", "usn", "studentCode"));
    const department = clean(get("department"), 120);
    const academicYear = clean(get("academicYear"), 20);
    const semester = parseSemester(get("semester"));
    const section = clean(get("section"), 20);
    if (!department || !academicYear || !section) throw new Error("department, academicYear, semester and section are required to identify the class.");
    const classRecord = await ClassSection.findOne({ department: exactInsensitive(department), academicYear: exactInsensitive(academicYear), semester, section: exactInsensitive(section) }).lean();
    if (!classRecord) throw new Error(`Class not found for ${department}, ${academicYear}, semester ${semester}, section ${section}. Create it first.`);
    const exists = await Enrollment.exists({ studentId: student._id, classId: classRecord._id });
    return { data: { student, classRecord }, warning: exists ? "Student is already enrolled; import will keep the existing enrolment." : "" };
  }

  if (type === "faculty-assignments") {
    const facultyKey = upper(get("facultyId", "facultyCode", "userId"));
    const faculty = await User.findOne({ role: "faculty", isActive: true, code: facultyKey }).select("_id code name department").lean();
    if (!faculty) throw new Error(`Active faculty account '${facultyKey}' was not found.`);
    const subjectCode = upper(get("subjectCode"));
    const subject = await Subject.findOne({ code: subjectCode }).lean();
    if (!subject) throw new Error(`Subject '${subjectCode}' was not found. Create it first.`);
    const department = clean(get("department"), 120);
    const academicYear = clean(get("academicYear"), 20);
    const semester = parseSemester(get("semester"));
    const section = clean(get("section"), 20);
    const classRecord = await ClassSection.findOne({ department: exactInsensitive(department), academicYear: exactInsensitive(academicYear), semester, section: exactInsensitive(section) }).lean();
    if (!classRecord) throw new Error("Matching class was not found. Check department, academic year, semester and section.");
    if (normal(faculty.department) && normal(faculty.department) !== normal(classRecord.department)) throw new Error("Faculty department does not match the class department.");
    if (subject.department && normal(subject.department) !== normal(classRecord.department)) throw new Error("Subject department does not match the class department.");
    if (subject.semester !== null && subject.semester !== undefined && Number(subject.semester) !== Number(classRecord.semester)) throw new Error("Subject semester does not match the class semester.");
    return { data: { faculty, subject, classRecord, slot: clean(get("slot"), 40) } };
  }

  if (type === "attendance" || type === "marks") {
    const selected = resolvedContext || await getImportContext(req, context);
    const student = await resolveStudent(get("studentId", "usn", "studentCode"));
    if (!(await studentEnrolledInClass(student._id, selected.classRecord._id))) throw new Error(`${student.code} is not enrolled in the selected class.`);
    if (type === "attendance") {
      const date = parseDate(get("date"));
      const status = clean(get("status"), 20).toLowerCase();
      if (!ATTENDANCE_STATUSES.includes(status)) throw new Error("Status must be present, absent or late.");
      const existing = await Attendance.exists({ studentId: student._id, classId: selected.classRecord._id, subjectId: selected.subject._id, date });
      return { data: { ...selected, student, date, status, remarks: clean(get("remarks"), 500) }, warning: existing ? "An attendance record exists for this date; import will update its status and remarks." : "" };
    }
    const values = {};
    for (const field of ASSESSMENT_FIELDS) values[field] = parseScore(get(field, field.toUpperCase()), field);
    if (ASSESSMENT_FIELDS.every((field) => values[field] === null)) throw new Error("Enter at least one score across CIA 1–3 or Internal 1–2.");
    const studentKey = String(student.usn || student.code || "").trim().toUpperCase();
    const existing = await Marks.exists({ student_id: studentKey, subject_code: selected.subject.code });
    return { data: { ...selected, student, values, studentKey }, warning: existing ? "Marks already exist; non-empty imported CIA/Internal cells will update the existing mark sheet. Blank cells will be left unchanged." : "" };
  }

  throw new Error("Unsupported import type.");
}

async function commitRow(req, type, prepared) {
  const data = prepared.data;
  if (type === "students" || type === "faculty") {
    const temporaryPassword = crypto.randomBytes(12).toString("base64url");
    const user = await createUser({ ...data, password: temporaryPassword });
    return { action: "created", credential: { userId: user.code, name: user.name, role: user.role, temporaryPassword } };
  }
  if (type === "classes") {
    const folderId = await ensureDataFolder("Academic Records", classFolderSegments(data));
    const existing = await ClassSection.findOne({ department: exactInsensitive(data.department), semester: data.semester, academicYear: exactInsensitive(data.academicYear), section: exactInsensitive(data.section) });
    const record = existing
      ? await ClassSection.findByIdAndUpdate(existing._id, { $set: { ...data, folderId } }, { returnDocument: "after", runValidators: true })
      : await ClassSection.create({ ...data, folderId });
    return { action: existing ? "updated" : "created", recordId: String(record._id) };
  }
  if (type === "subjects") {
    const folderId = await ensureDataFolder("Academic Records", ["Subjects", data.department || "General Department", ...(data.semester ? [`Semester ${data.semester}`] : [])]);
    const existing = await Subject.findOne({ code: data.code });
    const record = await Subject.findOneAndUpdate({ code: data.code }, { $set: { ...data, folderId } }, { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true });
    return { action: existing ? "updated" : "created", recordId: String(record._id) };
  }
  if (type === "enrollments") {
    const folderId = await ensureDataFolder("Academic Records", teachingFolderSegments("Enrollments", data.classRecord));
    const existed = await Enrollment.exists({ studentId: data.student._id, classId: data.classRecord._id });
    await Enrollment.findOneAndUpdate({ studentId: data.student._id, classId: data.classRecord._id }, { $setOnInsert: { studentId: data.student._id, classId: data.classRecord._id }, $set: { folderId } }, { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true });
    return { action: existed ? "skipped" : "created" };
  }
  if (type === "faculty-assignments") {
    const folderId = await ensureDataFolder("Academic Records", teachingFolderSegments("Faculty Assignments", data.classRecord, data.subject.code));
    const existed = await FacultyAssignment.exists({ facultyId: data.faculty._id, classId: data.classRecord._id, subjectId: data.subject._id });
    await FacultyAssignment.findOneAndUpdate({ facultyId: data.faculty._id, classId: data.classRecord._id, subjectId: data.subject._id }, { $set: { slot: data.slot, folderId }, $setOnInsert: { facultyId: data.faculty._id, classId: data.classRecord._id, subjectId: data.subject._id } }, { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true });
    return { action: existed ? "skipped" : "created" };
  }
  if (type === "attendance") {
    const folderId = await ensureDataFolder("Academic Records", teachingFolderSegments("Attendance", data.classRecord, data.subject.code));
    const existed = await Attendance.exists({ studentId: data.student._id, classId: data.classRecord._id, subjectId: data.subject._id, date: data.date });
    await Attendance.findOneAndUpdate(
      { studentId: data.student._id, classId: data.classRecord._id, subjectId: data.subject._id, date: data.date },
      { $set: { facultyId: data.facultyId, studentId: data.student._id, classId: data.classRecord._id, subjectId: data.subject._id, date: data.date, status: data.status, remarks: data.remarks, folderId } },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
    );
    return { action: existed ? "updated" : "created" };
  }
  if (type === "marks") {
    const folderId = await ensureDataFolder("Academic Records", teachingFolderSegments("Marks", data.classRecord, data.subject.code));
    const existing = await Marks.findOne({ student_id: data.studentKey, subject_code: data.subject.code }).lean();
    const values = { ...(existing ? Object.fromEntries(ASSESSMENT_FIELDS.map((field) => [field, existing[field] ?? null])) : {}) };
    for (const field of ASSESSMENT_FIELDS) if (data.values[field] !== null) values[field] = normalizeAssessmentScore(data.values[field], field);
    const summary = calculateAssessmentSummary(values);
    await Marks.findOneAndUpdate(
      { student_id: data.studentKey, subject_code: data.subject.code },
      { $set: { ...values, ...summary, student_id: data.studentKey, subject_code: data.subject.code, folderId } },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
    );
    return { action: existing ? "updated" : "created" };
  }
  throw new Error("Unsupported import type.");
}

importsRouter.get("/imports/history", async (req, res) => {
  const filter = req.user.role === "admin" ? {} : { uploadedBy: req.user.id };
  const batches = await ImportBatch.find(filter).populate("uploadedBy", "name code role").sort({ createdAt: -1 }).limit(50).lean();
  return res.json({ batches });
});

importsRouter.get("/imports/context", async (req, res) => {
  const filter = req.user.role === "faculty" ? { facultyId: req.user.id } : {};
  const assignments = await FacultyAssignment.find(filter).populate("classId").populate("subjectId").populate("facultyId", "name code").lean();
  res.json({ assignments: assignments.filter((row) => row.classId && row.subjectId).map((row) => ({
    assignmentId: String(row._id), facultyId: String(row.facultyId?._id || row.facultyId), facultyName: row.facultyId?.name || "",
    classId: String(row.classId._id), className: row.classId.name, department: row.classId.department,
    academicYear: row.classId.academicYear, semester: row.classId.semester, section: row.classId.section,
    subjectId: String(row.subjectId._id), subjectCode: row.subjectId.code, subjectName: row.subjectId.name,
  })) });
});

function spreadsheetDuplicateKeys(type, row) {
  const first = (...keys) => keys.map((name) => upper(row?.[name])).find(Boolean) || "";
  const key = (...keys) => first(...keys);
  if (type === "students" || type === "faculty") {
    return [
      key("userId", "code", "studentId", "facultyId") && `code:${key("userId", "code", "studentId", "facultyId")}`,
      key("usn") && `usn:${key("usn")}`,
      key("email") && `email:${key("email")}`,
    ].filter(Boolean);
  }
  if (type === "classes") return [[normal(row?.department), clean(row?.academicYear), clean(row?.semester), normal(row?.section)].join("|")];
  if (type === "subjects") return [key("subjectCode", "code")];
  if (type === "enrollments") return [[key("studentId", "usn", "studentCode"), normal(row?.department), clean(row?.academicYear), clean(row?.semester), normal(row?.section)].join("|")];
  if (type === "faculty-assignments") return [[key("facultyId", "facultyCode", "userId"), key("subjectCode"), normal(row?.department), clean(row?.academicYear), clean(row?.semester), normal(row?.section)].join("|")];
  if (type === "attendance") return [[key("studentId", "usn", "studentCode"), clean(row?.date)].join("|")];
  if (type === "marks") return [key("studentId", "usn", "studentCode")];
  return [];
}

async function handleImport(req, res, mode) {
  const type = clean(req.params.type, 40).toLowerCase();
  const allowed = req.user.role === "admin" ? ADMIN_TYPES : FACULTY_TYPES;
  if (!allowed.has(type)) return res.status(403).json({ error: "This import type is not available in your portal." });
  const { rows, context = {} } = req.body || {};
  const issue = validateRowsInput(rows);
  if (issue) return sendValidationError(res, issue);
  let resolvedContext = null;
  if (["attendance", "marks"].includes(type)) {
    try { resolvedContext = await getImportContext(req, context); }
    catch (error) { return res.status(error.status || 400).json({ error: error.message }); }
  }

  const preparedRows = [];
  const errors = [];
  const warnings = [];
  const seenKeys = new Set();
  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 2;
    try {
      const duplicateKeys = spreadsheetDuplicateKeys(type, rows[index]).filter(Boolean);
      if (duplicateKeys.some((duplicateKey) => seenKeys.has(duplicateKey))) throw new Error("This row duplicates an earlier valid row in the same spreadsheet. Keep only one row per record key.");
      const prepared = await prepareRow(req, type, rows[index], rowNumber, context, resolvedContext);
      duplicateKeys.forEach((duplicateKey) => seenKeys.add(duplicateKey));
      preparedRows.push({ rowNumber, source: rows[index], ...prepared });
      if (prepared.warning) warnings.push({ rowNumber, warning: prepared.warning });
    } catch (error) {
      errors.push({ ...rowError(rowNumber, error.message || "Invalid row."), values: rows[index] });
    }
  }

  if (mode === "validate") {
    return res.json({
      type, totalRows: rows.length, validRows: preparedRows.length, invalidRows: errors.length,
      warnings, errors,
      preview: preparedRows.slice(0, 25).map((item) => ({ rowNumber: item.rowNumber, values: item.source, warning: item.warning || "" })),
      canImport: preparedRows.length > 0,
    });
  }

  const results = { created: 0, updated: 0, skipped: 0, failed: errors.length, errors: [...errors], warnings, credentials: [] };
  for (const item of preparedRows) {
    try {
      const outcome = await commitRow(req, type, item);
      results[outcome.action] = (results[outcome.action] || 0) + 1;
      if (outcome.credential) results.credentials.push(outcome.credential);
    } catch (error) {
      results.failed += 1;
      results.errors.push({ ...rowError(item.rowNumber, error.message || "Could not save this row."), values: item.source });
    }
  }
  let batchId = null;
  let auditWarning = "";
  try {
    const batch = await ImportBatch.create({
      uploadedBy: req.user.id, role: req.user.role, importType: type, fileName: clean(req.body?.fileName, 255),
      totalRows: rows.length, created: results.created, updated: results.updated, skipped: results.skipped, failed: results.failed,
      errorSummary: results.errors.slice(0, 500).map(({ rowNumber, error }) => ({ rowNumber, error })),
      context: ["attendance", "marks"].includes(type) ? { classId: context.classId, subjectId: context.subjectId, assignmentId: context.assignmentId } : {},
      completedAt: new Date(),
    });
    batchId = String(batch._id);
  } catch (auditError) {
    console.error("Bulk import audit could not be saved:", auditError.message);
    auditWarning = "Records were imported, but the audit-history entry could not be saved. Notify the ERP administrator.";
  }
  return res.status(results.failed ? 207 : 200).json({ success: results.failed === 0, type, totalRows: rows.length, batchId, auditWarning, ...results });
}

importsRouter.post("/imports/:type/validate", async (req, res, next) => {
  try { return await handleImport(req, res, "validate"); } catch (error) { return next(error); }
});
importsRouter.post("/imports/:type/commit", async (req, res, next) => {
  try { return await handleImport(req, res, "commit"); } catch (error) { return next(error); }
});
