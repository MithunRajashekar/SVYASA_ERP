import { Router } from "express";
import { ModuleRecord, MODULE_RECORD_KEYS } from "../models/ModuleRecord.js";
import { User } from "../models/User.js";
import { ClassSection } from "../models/ClassSection.js";
import { FacultyAssignment } from "../models/FacultyAssignment.js";
import { Enrollment } from "../models/Enrollment.js";
import { authenticate, isObjectId, requireRole, sendValidationError } from "../middleware/auth.js";
import { ensureDataFolder } from "../utils/autoFolders.js";
import { MODULES } from "../../shared/modules.js";

export const workspaceRouter = Router();

const LABELS = {
  "class-timetable": "Class Timetables", "exam-timetable": "Exam Timetables", "lesson-plans": "Lesson Plans",
  assessment: "Assessments", assignments: "Assignments", "assignment-submissions": "Assignment Submissions",
  mentoring: "Mentoring", "mentoring-requests": "Mentoring Requests", "academic-calendar": "Academic Calendar",
  notices: "Notices", fees: "Fees", "fee-queries": "Fee Queries", "library-books": "Library Catalogue",
  "library-requests": "Library Requests", "hostel-requests": "Hostel Requests", placements: "Placements",
  "placement-applications": "Placement Applications", internships: "Internships", "internship-applications": "Internship Applications",
  "soft-skills": "Soft Skills", "soft-skill-enrollments": "Soft Skill Enrollments", "student-requests": "Student Requests",
};

const RULES = {
  "class-timetable": { read: ["admin", "faculty", "student"], write: ["admin", "faculty"], publish: true },
  "exam-timetable": { read: ["admin", "faculty", "student"], write: ["admin", "faculty"], publish: true },
  "lesson-plans": { read: ["admin", "faculty"], write: ["admin", "faculty"] },
  assessment: { read: ["admin", "faculty", "student"], write: ["admin", "faculty"], publish: true },
  assignments: { read: ["admin", "faculty", "student"], write: ["admin", "faculty"], publish: true },
  "assignment-submissions": { read: ["admin", "faculty", "student"], write: ["admin", "faculty", "student"] },
  mentoring: { read: ["admin", "faculty", "student"], write: ["admin", "faculty"] },
  "mentoring-requests": { read: ["admin", "faculty", "student"], write: ["admin", "student"] },
  "academic-calendar": { read: ["admin", "faculty", "student"], write: ["admin", "faculty"], publish: true },
  notices: { read: ["admin", "faculty", "student"], write: ["admin", "faculty"], publish: true },
  fees: { read: ["admin", "student"], write: ["admin"] },
  "fee-queries": { read: ["admin", "student"], write: ["admin", "student"] },
  "library-books": { read: ["admin", "faculty", "student"], write: ["admin"], publish: true },
  "library-requests": { read: ["admin", "student"], write: ["admin", "student"] },
  "hostel-requests": { read: ["admin", "student"], write: ["admin", "student"] },
  placements: { read: ["admin", "faculty", "student"], write: ["admin"], publish: true },
  "placement-applications": { read: ["admin", "faculty", "student"], write: ["admin", "student"] },
  internships: { read: ["admin", "faculty", "student"], write: ["admin"], publish: true },
  "internship-applications": { read: ["admin", "faculty", "student"], write: ["admin", "student"] },
  "soft-skills": { read: ["admin", "faculty", "student"], write: ["admin"], publish: true },
  "soft-skill-enrollments": { read: ["admin", "faculty", "student"], write: ["admin", "student"] },
  "student-requests": { read: ["admin", "faculty", "student"], write: ["admin", "student"] },
};

const STUDENT_SUBMISSIONS = new Set([
  "assignment-submissions", "mentoring-requests", "fee-queries", "library-requests",
  "hostel-requests", "placement-applications", "internship-applications", "soft-skill-enrollments", "student-requests",
]);
const STUDENT_VISIBLE = new Set(["Published", "Approved", "Open", "Active", "Completed", "Paid", "Reviewed"]);
const FACULTY_CLASS_MODULES = new Set(["class-timetable", "exam-timetable", "lesson-plans", "assessment", "assignments", "mentoring"]);
const FACULTY_DEPARTMENT_MODULES = new Set(["academic-calendar", "notices"]);
const MAX_FIELDS_BYTES = 24000;

function cleanText(value, max = 180) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function sanitizeValue(value, depth = 0) {
  if (depth > 4) throw Object.assign(new Error("Fields are nested too deeply."), { status: 400 });
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    if (typeof value === "number" && !Number.isFinite(value)) throw Object.assign(new Error("Field numbers must be finite."), { status: 400 });
    return value;
  }
  if (typeof value === "string") return value.trim().slice(0, 3000);
  if (Array.isArray(value)) return value.slice(0, 40).map((item) => sanitizeValue(item, depth + 1));
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, child] of Object.entries(value).slice(0, 60)) {
      if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,48}$/.test(key)) throw Object.assign(new Error("Field name is invalid."), { status: 400 });
      out[key] = sanitizeValue(child, depth + 1);
    }
    return out;
  }
  throw Object.assign(new Error("Fields must contain simple text, numbers, booleans or arrays."), { status: 400 });
}

function parseDate(value, label) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw Object.assign(new Error(`${label} is not a valid date.`), { status: 400 });
  return parsed;
}

const SERVER_MANAGED_FIELDS = new Set(["assignmentTitle", "opportunityTitle", "internshipTitle", "programmeTitle"]);
const STUDENT_SUBMISSION_FIELDS = new Set(["assignmentId", "submissionUrl", "submissionNotes"]);
const FACULTY_GRADING_FIELDS = new Set(["marksAwarded", "feedback"]);

function validateModuleFields(module, input, role, { partial = false, grading = false, existing = {} } = {}) {
  const definition = MODULES[module];
  if (!definition) throw Object.assign(new Error("Module configuration is missing."), { status: 500 });
  const raw = sanitizeValue(input ?? {});
  const fieldDefinitions = definition.fields || [];
  const allowedDefinitions = grading
    ? fieldDefinitions.filter((field) => FACULTY_GRADING_FIELDS.has(field.key))
    : role === "student" && module === "assignment-submissions"
      ? fieldDefinitions.filter((field) => STUDENT_SUBMISSION_FIELDS.has(field.key))
      : fieldDefinitions;
  const allowedKeys = new Set(allowedDefinitions.map((field) => field.key));
  const unexpected = Object.keys(raw).filter((key) => !allowedKeys.has(key) && !SERVER_MANAGED_FIELDS.has(key));
  if (unexpected.length) throw Object.assign(new Error(`Unsupported field(s) for this module: ${unexpected.join(", ")}.`), { status: 400 });

  const output = {};
  for (const field of allowedDefinitions) {
    if (!Object.hasOwn(raw, field.key)) {
      if (field.required && !partial) throw Object.assign(new Error(`${field.label} is required.`), { status: 400 });
      continue;
    }
    const rawValue = raw[field.key];
    const blank = rawValue === null || rawValue === undefined || rawValue === "";
    if (blank) {
      if (field.required) throw Object.assign(new Error(`${field.label} is required.`), { status: 400 });
      output[field.key] = "";
      continue;
    }

    if (field.type === "number") {
      const value = Number(rawValue);
      if (!Number.isFinite(value) || value < 0) throw Object.assign(new Error(`${field.label} must be a non-negative number.`), { status: 400 });
      if (["totalCopies", "availableCopies", "seats"].includes(field.key) && !Number.isInteger(value)) throw Object.assign(new Error(`${field.label} must be a whole number.`), { status: 400 });
      if (field.key === "weightage" && value > 100) throw Object.assign(new Error("Weightage cannot exceed 100%."), { status: 400 });
      output[field.key] = value;
      continue;
    }

    if (field.type === "select") {
      const value = String(rawValue).trim();
      if (field.dynamic) {
        if (!isObjectId(value)) throw Object.assign(new Error(`Select a valid ${field.label.toLowerCase()}.`), { status: 400 });
      } else if (!(field.options || []).includes(value)) {
        throw Object.assign(new Error(`Select a valid option for ${field.label.toLowerCase()}.`), { status: 400 });
      }
      output[field.key] = value;
      continue;
    }

    if (field.type === "date") {
      const value = String(rawValue).trim();
      const parsed = new Date(value);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime())) throw Object.assign(new Error(`${field.label} must be a valid date.`), { status: 400 });
      output[field.key] = value;
      continue;
    }

    if (field.type === "time") {
      const value = String(rawValue).trim();
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw Object.assign(new Error(`${field.label} must use 24-hour HH:MM format.`), { status: 400 });
      output[field.key] = value;
      continue;
    }

    if (field.type === "url") {
      const value = cleanText(String(rawValue), 2048);
      try {
        const parsed = new URL(value);
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Unsupported protocol");
      } catch {
        throw Object.assign(new Error(`${field.label} must be a valid http or https URL.`), { status: 400 });
      }
      output[field.key] = value;
      continue;
    }

    output[field.key] = cleanText(String(rawValue), field.type === "textarea" ? 3000 : 500);
  }

  for (const key of SERVER_MANAGED_FIELDS) {
    if (Object.hasOwn(existing || {}, key)) output[key] = existing[key];
  }
  if (module === "fees") {
    const amount = output.amount ?? existing?.amount;
    const paidAmount = output.paidAmount ?? existing?.paidAmount;
    if (amount !== undefined && paidAmount !== undefined && paidAmount !== "" && Number(paidAmount) > Number(amount)) {
      throw Object.assign(new Error("Paid amount cannot exceed the fee amount."), { status: 400 });
    }
  }
  if (module === "library-books") {
    const total = output.totalCopies ?? existing?.totalCopies;
    const available = output.availableCopies ?? existing?.availableCopies;
    if (total !== undefined && available !== undefined && Number(available) > Number(total)) {
      throw Object.assign(new Error("Available copies cannot exceed total copies."), { status: 400 });
    }
  }
  return output;
}

function moduleFromRequest(req) {
  const key = String(req.params.module || "").toLowerCase();
  return MODULE_RECORD_KEYS.includes(key) ? key : null;
}

async function checkClassScope(user, classId, mode = "read", subjectCode = "") {
  if (!classId || user.role === "admin") return true;
  if (!isObjectId(classId)) return false;
  if (user.role === "faculty") {
    if (!subjectCode) return Boolean(await FacultyAssignment.exists({ facultyId: user.id, classId }));
    const assignment = await FacultyAssignment.findOne({ facultyId: user.id, classId }).populate("subjectId", "code").lean();
    return Boolean(assignment && String(assignment.subjectId?.code || "").toUpperCase() === String(subjectCode).toUpperCase());
  }
  if (user.role === "student") {
    // An academic profile match is not an enrolment. Student access must be
    // backed by an explicit administrator-created Enrollment record.
    return Boolean(await Enrollment.exists({ studentId: user.id, classId }));
  }
  return false;
}

async function buildReadFilter(req, module) {
  const user = req.user;
  const filter = { module };
  if (user.role === "admin") return filter;
  if (user.role === "faculty") {
    const allocations = await FacultyAssignment.find({ facultyId: user.id }).select("classId").lean();
    const classIds = allocations.map((row) => row.classId);
    const studentIds = classIds.length ? await Enrollment.find({ classId: { $in: classIds } }).distinct("studentId") : [];
    filter.$or = [
      { ownerId: user.id }, { createdBy: user.id },
      { visibility: "university", status: { $in: ["Published", "Approved", "Open", "Active"] } },
      ...(user.department ? [{ department: user.department, visibility: "department", status: { $in: ["Published", "Approved", "Open", "Active"] } }] : []),
      ...(classIds.length ? [{ classId: { $in: classIds }, visibility: "class", status: { $in: ["Published", "Approved", "Open", "Active"] } }] : []),
      ...(module === "assignment-submissions" && classIds.length ? [{ classId: { $in: classIds }, status: { $in: ["Submitted", "Pending", "Approved", "Rejected", "Completed"] } }] : []),
      ...(module === "mentoring-requests" && studentIds.length ? [{ targetUserId: { $in: studentIds }, status: { $in: ["Submitted", "Pending", "Approved", "Rejected"] } }] : []),
    ];
  } else {
    // Class-visible records are available only through explicit enrolments.
    const classIds = await Enrollment.find({ studentId: user.id }).distinct("classId");
    filter.$or = [
      { ownerId: user.id }, { targetUserId: user.id },
      { visibility: "university", status: { $in: [...STUDENT_VISIBLE] } },
      ...(user.department ? [{ department: user.department, visibility: "department", status: { $in: [...STUDENT_VISIBLE] } }] : []),
      ...(classIds.length ? [{ classId: { $in: classIds }, visibility: "class", status: { $in: [...STUDENT_VISIBLE] } }] : []),
    ];
  }
  return filter;
}

function folderSegments(record) {
  const year = record.academicYear || (record.startsAt ? String(new Date(record.startsAt).getFullYear()) : String(new Date().getFullYear()));
  return [year, record.department || "University", record.program || "General Program", record.semester ? `Semester ${record.semester}` : "All Semesters", record.section ? `Section ${record.section}` : "All Sections", record.status || "Unclassified"];
}

function normalizeRecord(body, user, module, existing = {}) {
  const title = cleanText(body.title ?? existing.title, 180);
  if (!title) throw Object.assign(new Error("A title is required."), { status: 400 });
  const fields = body.fields === undefined
    ? (existing.fields || {})
    : validateModuleFields(module, body.fields, user.role, { partial: Boolean(existing?._id), existing: existing.fields || {} });
  if (Buffer.byteLength(JSON.stringify(fields), "utf8") > MAX_FIELDS_BYTES) throw Object.assign(new Error("Module details are too large. Reduce the form data and try again."), { status: 400 });

  const out = {
    module,
    title,
    description: body.description === undefined ? (existing.description || "") : cleanText(body.description, 6000),
    status: body.status === undefined ? (existing.status || (user.role === "student" ? "Submitted" : "Draft")) : cleanText(body.status, 20),
    visibility: body.visibility === undefined ? (existing.visibility || "private") : cleanText(body.visibility, 20),
    department: body.department === undefined ? (existing.department || user.department || "") : cleanText(body.department, 120),
    program: body.program === undefined ? (existing.program || user.program || "") : cleanText(body.program, 120),
    semester: body.semester === undefined ? (existing.semester ?? user.semester ?? null) : (body.semester === "" || body.semester === null ? null : Number(body.semester)),
    section: body.section === undefined ? (existing.section || user.section || "") : cleanText(body.section, 20),
    academicYear: body.academicYear === undefined ? (existing.academicYear || "") : cleanText(body.academicYear, 20),
    classId: body.classId === undefined ? (existing.classId || null) : (body.classId || null),
    subjectCode: body.subjectCode === undefined ? (existing.subjectCode || "") : cleanText(body.subjectCode, 40).toUpperCase(),
    startsAt: body.startsAt === undefined ? (existing.startsAt || null) : parseDate(body.startsAt, "Start date"),
    endsAt: body.endsAt === undefined ? (existing.endsAt || null) : parseDate(body.endsAt, "End date"),
    dueAt: body.dueAt === undefined ? (existing.dueAt || null) : parseDate(body.dueAt, "Due date"),
    fields,
  };

  if (!Number.isInteger(out.semester) && out.semester !== null) throw Object.assign(new Error("Semester must be a whole number."), { status: 400 });
  if (out.semester !== null && (out.semester < 1 || out.semester > 12)) throw Object.assign(new Error("Semester must be between 1 and 12."), { status: 400 });
  if (out.endsAt && out.startsAt && out.endsAt < out.startsAt) throw Object.assign(new Error("End date cannot be before start date."), { status: 400 });
  if (!["Draft", "Submitted", "Pending", "Published", "Approved", "Rejected", "Open", "Active", "Completed", "Closed", "Paid", "Overdue", "Reviewed"].includes(out.status)) throw Object.assign(new Error("Status is invalid."), { status: 400 });
  if (!["private", "department", "class", "university"].includes(out.visibility)) throw Object.assign(new Error("Visibility is invalid."), { status: 400 });

  if (user.role === "student") {
    out.status = "Submitted";
    out.visibility = "private";
    out.department = user.department || out.department;
    out.program = user.program || out.program;
    out.semester = user.semester ?? out.semester;
    out.section = user.section || out.section;
  }

  return out;
}

workspaceRouter.get("/workspace/:module", authenticate, async (req, res) => {
  const module = moduleFromRequest(req);
  if (!module) return res.status(404).json({ error: "Unknown ERP module." });
  if (!RULES[module].read.includes(req.user.role)) return res.status(403).json({ error: "This module is not available to your role." });

  const filter = await buildReadFilter(req, module);
  const rows = await ModuleRecord.find(filter).sort({ createdAt: -1 }).limit(500).populate("targetUserId", "name code role").populate("classId", "name department semester section academicYear").lean();
  const visible = [];
  for (const row of rows) {
    if (row.classId && !(await checkClassScope(req.user, row.classId._id || row.classId, "read", row.subjectCode))) continue;
    if (req.user.role === "student") {
      const own = String(row.ownerId) === req.user.id || String(row.targetUserId?._id || row.targetUserId || "") === req.user.id;
      const published = STUDENT_VISIBLE.has(row.status) && row.visibility !== "private";
      if (!own && !published) continue;
    }
    if (req.user.role === "faculty" && row.classId && !(await FacultyAssignment.exists({ facultyId: req.user.id, classId: row.classId._id || row.classId }))) {
      if (String(row.ownerId) !== req.user.id && String(row.createdBy) !== req.user.id) continue;
    }
    visible.push(row);
  }
  return res.json({ success: true, module, label: LABELS[module], records: visible });
});

workspaceRouter.post("/workspace/:module", authenticate, async (req, res) => {
  const module = moduleFromRequest(req);
  if (!module) return res.status(404).json({ error: "Unknown ERP module." });
  if (!RULES[module].write.includes(req.user.role)) return res.status(403).json({ error: "You cannot create entries in this module." });
  if (req.user.role === "student" && !STUDENT_SUBMISSIONS.has(module)) return res.status(403).json({ error: "Students can submit requests or applications only in this module." });
  if (req.user.role === "faculty" && module === "assignment-submissions") return res.status(403).json({ error: "Faculty review submissions; only students may submit them." });

  const data = normalizeRecord(req.body || {}, req.user, module);
  if (data.classId && !isObjectId(data.classId)) return sendValidationError(res, "Class selection is invalid.");
  if (req.user.role === "faculty" && FACULTY_CLASS_MODULES.has(module) && (!data.classId || !data.subjectCode)) {
    return sendValidationError(res, "Select one of your assigned class and subject combinations before creating this academic record.");
  }
  if (data.classId) {
    const selectedClass = await ClassSection.findById(data.classId).lean();
    if (!selectedClass) return sendValidationError(res, "The selected class does not exist.");
    if (!(await checkClassScope(req.user, data.classId, "write", data.subjectCode))) return res.status(403).json({ error: "You are not assigned or enrolled in this class." });
    data.department = selectedClass.department || data.department;
    data.semester = selectedClass.semester ?? data.semester;
    data.section = selectedClass.section || data.section;
    data.academicYear = selectedClass.academicYear || data.academicYear;
  }
  if (req.user.role === "faculty" && FACULTY_CLASS_MODULES.has(module)) data.visibility = "class";
  if (req.user.role === "faculty" && FACULTY_DEPARTMENT_MODULES.has(module)) {
    if (!req.user.department) return sendValidationError(res, "Your faculty profile must have a department before you can publish department records.");
    data.department = req.user.department;
    data.visibility = "department";
  }

  let targetUserId = null;
  if (req.user.role === "student") targetUserId = req.user.id;
  else if (req.user.role === "faculty" && module === "mentoring") {
    const studentCode = cleanText(data.fields.studentCode, 64).toUpperCase();
    if (!data.classId) return sendValidationError(res, "Select one of your assigned classes for this mentoring record.");
    if (!studentCode) return sendValidationError(res, "Enter the student ID or USN for the mentoring record.");
    const student = await User.findOne({ role: "student", isActive: true, $or: [{ code: studentCode }, { usn: studentCode }, { student_id: studentCode }] }).lean();
    if (!student) return sendValidationError(res, "The student account was not found.");
    if (!(await Enrollment.exists({ studentId: student._id, classId: data.classId }))) {
      return res.status(403).json({ error: "You can record mentoring only for students enrolled in your selected class." });
    }
    targetUserId = student._id;
    data.fields.studentCode = student.usn || student.student_id || student.code;
  } else if (req.body?.targetUserId) {
    if (req.user.role !== "admin" || !isObjectId(req.body.targetUserId)) return sendValidationError(res, "Target student is invalid.");
    const target = await User.findOne({ _id: req.body.targetUserId, role: "student", isActive: true }).lean();
    if (!target) return sendValidationError(res, "Target student account was not found.");
    targetUserId = target._id;
  }
  if (module === "fees" && req.user.role === "admin" && !targetUserId) {
    return sendValidationError(res, "Choose the student who owns this fee record.");
  }

  if (module === "assignment-submissions" && req.user.role === "student") {
    const assignmentId = data.fields.assignmentId;
    if (!isObjectId(assignmentId)) return sendValidationError(res, "Choose a published assignment before submitting your work.");
    const assignment = await ModuleRecord.findOne({ _id: assignmentId, module: "assignments", status: { $in: ["Published", "Approved"] } }).lean();
    if (!assignment) return sendValidationError(res, "The selected assignment is not available.");
    if (assignment.classId && !(await checkClassScope(req.user, assignment.classId, "read"))) return res.status(403).json({ error: "You are not enrolled in the class for this assignment." });
    const existingSubmission = await ModuleRecord.findOne({ module: "assignment-submissions", ownerId: req.user.id, "fields.assignmentId": String(assignment._id), status: { $in: ["Submitted", "Pending", "Approved"] } }).lean();
    if (existingSubmission) return res.status(409).json({ error: "You have already submitted this assignment. Contact your faculty if you need to replace it." });
    data.classId = assignment.classId || null;
    data.department = assignment.department || req.user.department || "";
    data.program = assignment.program || req.user.program || "";
    data.semester = assignment.semester ?? req.user.semester ?? null;
    data.section = assignment.section || req.user.section || "";
    data.subjectCode = assignment.subjectCode || "";
    data.fields.assignmentTitle = assignment.title;
  }

  if (req.user.role === "student" && ["placement-applications", "internship-applications", "soft-skill-enrollments"].includes(module)) {
    const referenceConfig = {
      "placement-applications": { field: "opportunity", relatedModule: "placements", titleField: "opportunityTitle" },
      "internship-applications": { field: "internship", relatedModule: "internships", titleField: "internshipTitle" },
      "soft-skill-enrollments": { field: "programName", relatedModule: "soft-skills", titleField: "programmeTitle" },
    }[module];
    const referenceId = data.fields[referenceConfig.field];
    if (!isObjectId(referenceId)) return sendValidationError(res, "Choose an available opportunity or programme from the list.");
    const related = await ModuleRecord.findOne({ _id: referenceId, module: referenceConfig.relatedModule, status: { $in: ["Published", "Approved", "Open", "Active"] } }).lean();
    if (!related) return sendValidationError(res, "The selected opportunity or programme is no longer available.");
    if (related.dueAt && new Date(related.dueAt) < new Date()) return res.status(409).json({ error: "The application deadline has passed." });
    const duplicate = await ModuleRecord.findOne({ module, ownerId: req.user.id, [`fields.${referenceConfig.field}`]: String(related._id), status: { $in: ["Submitted", "Pending", "Approved", "Reviewed"] } }).lean();
    if (duplicate) return res.status(409).json({ error: "You have already submitted a response for this opportunity or programme." });
    if (module === "soft-skill-enrollments") {
      const seatValue = related.fields?.seats;
      if (seatValue !== undefined && seatValue !== null && seatValue !== "") {
        const seats = Number(seatValue);
        const enrolled = await ModuleRecord.countDocuments({ module, "fields.programName": String(related._id), status: { $in: ["Submitted", "Pending", "Approved", "Reviewed"] } });
        if (!Number.isInteger(seats) || seats < 0 || enrolled >= seats) return res.status(409).json({ error: "This programme has reached its available seat limit." });
      }
    }
    data.fields[referenceConfig.titleField] = related.title;
    data.department = related.department || req.user.department || "";
    data.program = related.program || req.user.program || "";
    data.semester = related.semester ?? req.user.semester ?? null;
    data.section = related.section || req.user.section || "";
  }

  if (["assignment-submissions", "placement-applications", "internship-applications", "library-requests", "hostel-requests", "fee-queries", "mentoring-requests", "soft-skill-enrollments"].includes(module) && req.user.role === "student") {
    data.status = "Submitted";
  }
  const ownerId = req.user.role === "admin" && targetUserId ? targetUserId : req.user.id;
  const folderId = await ensureDataFolder(LABELS[module], folderSegments(data).concat(targetUserId ? [String(targetUserId)] : []));
  const record = await ModuleRecord.create({ ...data, folderId, ownerId, createdBy: req.user.id, targetUserId });
  return res.status(201).json({ success: true, record });
});

workspaceRouter.put("/workspace/:module/:id", authenticate, async (req, res) => {
  const module = moduleFromRequest(req);
  if (!module) return res.status(404).json({ error: "Unknown ERP module." });
  if (!RULES[module].write.includes(req.user.role)) return res.status(403).json({ error: "You cannot edit entries in this module." });
  if (!isObjectId(req.params.id)) return sendValidationError(res, "Record ID is invalid.");
  const record = await ModuleRecord.findOne({ _id: req.params.id, module });
  if (!record) return res.status(404).json({ error: "Record not found." });
  const owns = String(record.ownerId) === req.user.id || String(record.createdBy) === req.user.id;
  const facultyCanGradeSubmission = req.user.role === "faculty" && module === "assignment-submissions" && record.classId && await checkClassScope(req.user, record.classId, "write", record.subjectCode);
  if (req.user.role !== "admin" && !owns && !facultyCanGradeSubmission) {
    return res.status(403).json({ error: "You can edit only records you own or academic submissions assigned to your classes." });
  }
  if (req.user.role === "student" && record.status !== "Submitted") return res.status(403).json({ error: "Submitted records can no longer be edited. Contact the administrator." });
  if (facultyCanGradeSubmission) {
    const submittedFields = validateModuleFields(module, req.body?.fields || {}, "faculty", { partial: true, grading: true });
    const assignmentId = record.fields?.assignmentId;
    const assignment = assignmentId ? await ModuleRecord.findOne({ _id: assignmentId, module: "assignments" }).lean() : null;
    const maximum = Number(assignment?.fields?.maxMarks ?? 100);
    const rawScore = submittedFields.marksAwarded;
    if (rawScore !== undefined && rawScore !== "" && (!Number.isFinite(Number(rawScore)) || Number(rawScore) < 0 || Number(rawScore) > maximum)) {
      return sendValidationError(res, `Marks must be between 0 and ${maximum}.`);
    }
    record.fields = {
      ...(record.fields || {}),
      ...(rawScore !== undefined ? { marksAwarded: rawScore === "" ? null : Number(rawScore) } : {}),
      ...(submittedFields.feedback !== undefined ? { feedback: cleanText(submittedFields.feedback, 3000) } : {}),
    };
    record.reviewedBy = req.user.id;
    record.reviewedAt = new Date();
    await record.save();
    return res.json({ success: true, record });
  }
  const current = record.toObject();
  const data = normalizeRecord(req.body || {}, req.user, module, current);
  if (req.user.role === "student" && module === "assignment-submissions" && String(data.fields.assignmentId || "") !== String(current.fields?.assignmentId || "")) {
    return res.status(403).json({ error: "You cannot change the assignment linked to an existing submission." });
  }
  if (data.classId && !isObjectId(data.classId)) return sendValidationError(res, "Class selection is invalid.");
  if (data.classId && !(await checkClassScope(req.user, data.classId, "write", data.subjectCode))) return res.status(403).json({ error: "You are not assigned or enrolled in this class." });
  Object.assign(record, data);
  if (req.user.role === "admin" && Object.hasOwn(req.body || {}, "targetUserId")) {
    if (req.body.targetUserId && !isObjectId(req.body.targetUserId)) return sendValidationError(res, "Target user ID is invalid.");
    record.targetUserId = req.body.targetUserId || null;
    record.ownerId = req.body.targetUserId || req.user.id;
  }
  record.folderId = await ensureDataFolder(LABELS[module], folderSegments(record.toObject()).concat(record.targetUserId ? [String(record.targetUserId)] : []));
  await record.save();
  return res.json({ success: true, record });
});

workspaceRouter.patch("/workspace/:module/:id/status", authenticate, async (req, res) => {
  const module = moduleFromRequest(req);
  if (!module) return res.status(404).json({ error: "Unknown ERP module." });
  if (!isObjectId(req.params.id)) return sendValidationError(res, "Record ID is invalid.");
  const record = await ModuleRecord.findOne({ _id: req.params.id, module });
  if (!record) return res.status(404).json({ error: "Record not found." });
  const status = cleanText(req.body?.status, 20);
  const allowedStatuses = ["Draft", "Submitted", "Pending", "Published", "Approved", "Rejected", "Open", "Active", "Completed", "Closed", "Paid", "Overdue", "Reviewed"];
  if (!allowedStatuses.includes(status)) return sendValidationError(res, "Status is invalid.");
  if (req.user.role === "admin") {
    record.status = status;
    record.reviewedBy = req.user.id;
    record.reviewedAt = new Date();
  } else if (req.user.role === "faculty" && ["assignment-submissions", "mentoring", "mentoring-requests"].includes(module)) {
    const owns = String(record.ownerId) === req.user.id || String(record.createdBy) === req.user.id;
    const assigned = record.classId && await checkClassScope(req.user, record.classId, "write", record.subjectCode);
    let permittedMentoringRequest = false;
    if (module === "mentoring-requests" && record.targetUserId) {
      const assignedClasses = await FacultyAssignment.find({ facultyId: req.user.id }).distinct("classId");
      permittedMentoringRequest = Boolean(assignedClasses.length && await Enrollment.exists({ studentId: record.targetUserId, classId: { $in: assignedClasses } }));
    }
    if (!owns && !assigned && !permittedMentoringRequest) return res.status(403).json({ error: "You cannot review this record." });
    record.status = status;
    record.reviewedBy = req.user.id;
    record.reviewedAt = new Date();
  } else {
    return res.status(403).json({ error: "Only administrators or authorised faculty can change this status." });
  }
  record.folderId = await ensureDataFolder(LABELS[module], folderSegments(record.toObject()).concat(record.targetUserId ? [String(record.targetUserId)] : []));
  await record.save();
  return res.json({ success: true, record });
});

workspaceRouter.delete("/workspace/:module/:id", authenticate, async (req, res) => {
  const module = moduleFromRequest(req);
  if (!module) return res.status(404).json({ error: "Unknown ERP module." });
  if (!isObjectId(req.params.id)) return sendValidationError(res, "Record ID is invalid.");
  const record = await ModuleRecord.findOne({ _id: req.params.id, module });
  if (!record) return res.status(404).json({ error: "Record not found." });
  const owns = String(record.ownerId) === req.user.id || String(record.createdBy) === req.user.id;
  if (req.user.role !== "admin" && (!owns || !["Draft", "Submitted", "Pending"].includes(record.status))) {
    return res.status(403).json({ error: "You can delete only your own draft or pending records." });
  }
  await record.deleteOne();
  return res.json({ success: true });
});

export { LABELS as WORKSPACE_LABELS };
