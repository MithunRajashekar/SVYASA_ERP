import { Router } from "express";
import { Attendance, ATTENDANCE_STATUSES } from "../models/Attendance.js";
import { AttendanceDocument } from "../models/AttendanceDocument.js";
import { Enrollment } from "../models/Enrollment.js";
import { ClassSection } from "../models/ClassSection.js";
import { Subject } from "../models/Subject.js";
import { ensureDataFolder, teachingFolderSegments } from "../utils/autoFolders.js";
import { FacultyAssignment } from "../models/FacultyAssignment.js";
import { MentorAssignment } from "../models/MentorAssignment.js";
import { assertFacultyCanAccessClassSubject, studentEnrolledInClass } from "../access.js";
import { isObjectId, requireRole, sendValidationError } from "../middleware/auth.js";

export const attendanceRouter = Router();

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

const DOCUMENT_TYPES = new Set(["sick-certificate", "od-letter"]);
const ALLOWED_DOCUMENT_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

function documentMetadata(document) {
  return {
    id: String(document._id),
    documentType: document.documentType,
    originalName: document.originalName,
    mimeType: document.mimeType,
    size: document.size,
    note: document.note || "",
    reviewStatus: document.reviewStatus,
    reviewRemarks: document.reviewRemarks || "",
    uploadedByRole: document.uploadedByRole,
    createdAt: document.createdAt,
    reviewedAt: document.reviewedAt || null,
    reviewedByRole: document.reviewedByRole || null,
  };
}

async function documentsByAttendance(rows) {
  const ids = rows.map((row) => String(row._id)).filter(Boolean);
  if (!ids.length) return new Map();
  const documents = await AttendanceDocument.find({ attendanceId: { $in: ids } })
    .select("attendanceId documentType originalName mimeType size note reviewStatus reviewRemarks uploadedByRole createdAt reviewedAt reviewedByRole")
    .sort({ createdAt: 1 }).lean();
  const byAttendance = new Map();
  for (const document of documents) {
    const key = String(document.attendanceId);
    if (!byAttendance.has(key)) byAttendance.set(key, []);
    byAttendance.get(key).push(documentMetadata(document));
  }
  return byAttendance;
}

function serializeAttendance(row, documentMap = new Map()) {
  const student = row.studentId && row.studentId._id ? row.studentId : null;
  const faculty = row.facultyId && row.facultyId._id ? row.facultyId : null;
  const subject = row.subjectId && row.subjectId._id ? row.subjectId : null;
  const classSection = row.classId && row.classId._id ? row.classId : null;

  return {
    id: String(row._id),
    facultyId: String(faculty?._id || row.facultyId),
    studentId: String(student?._id || row.studentId),
    subjectId: String(subject?._id || row.subjectId),
    classId: String(classSection?._id || row.classId),
    date: row.date,
    status: row.status,
    remarks: row.remarks || "",
    documents: documentMap.get(String(row._id)) || [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    studentName: student?.name,
    studentUsn: student?.usn || student?.code,
    facultyName: faculty?.name,
    subjectName: subject?.name,
    subjectCode: subject?.code,
    department: classSection?.department,
    semester: classSection?.semester,
    section: classSection?.section,
  };
}

const populateFields = [
  { path: "studentId", select: "name usn code role" },
  { path: "facultyId", select: "name code role" },
  { path: "subjectId", select: "name code" },
  { path: "classId", select: "department semester section name" },
];

attendanceRouter.get("/attendance", requireRole("faculty", "admin"), async (req, res) => {
  const { facultyId, classId, subjectId, date, from, to } = req.query;
  const filter = {};

  if (req.user.role === "faculty") {
    filter.facultyId = req.user.id;
    if (facultyId && facultyId !== req.user.id) {
      return res.status(403).json({ error: "Faculty can only query their own attendance records." });
    }
  } else if (facultyId) {
    if (!isObjectId(facultyId)) return sendValidationError(res, "facultyId must be a valid id.");
    filter.facultyId = facultyId;
  }

  if (classId) {
    if (!isObjectId(classId)) return sendValidationError(res, "classId must be a valid id.");
    filter.classId = classId;
  }
  if (subjectId) {
    if (!isObjectId(subjectId)) return sendValidationError(res, "subjectId must be a valid id.");
    filter.subjectId = subjectId;
  }
  if (date) {
    if (!isIsoDate(date)) return sendValidationError(res, "date must be YYYY-MM-DD.");
    filter.date = date;
  } else if (from || to) {
    filter.date = {};
    if (from) {
      if (!isIsoDate(from)) return sendValidationError(res, "from must be YYYY-MM-DD.");
      filter.date.$gte = from;
    }
    if (to) {
      if (!isIsoDate(to)) return sendValidationError(res, "to must be YYYY-MM-DD.");
      filter.date.$lte = to;
    }
  }

  if (req.user.role === "faculty") {
    const assignmentFilter = { facultyId: req.user.id };
    if (classId) assignmentFilter.classId = classId;
    if (subjectId) assignmentFilter.subjectId = subjectId;
    const assignments = await FacultyAssignment.find(assignmentFilter).select("classId subjectId").lean();
    if (!assignments.length) {
      return res.status(403).json({ error: "No matching class and subject allocation exists for your account." });
    }
    filter.$or = assignments.map((row) => ({ classId: row.classId, subjectId: row.subjectId }));
  }

  const rows = await Attendance.find(filter).populate(populateFields).sort({ date: 1 }).lean();
  const documentMap = await documentsByAttendance(rows);
  res.json({ records: rows.map((row) => serializeAttendance(row, documentMap)) });
});

attendanceRouter.post("/attendance", requireRole("faculty", "admin"), async (req, res) => {
  const body = req.body || {};
  const facultyId = body.facultyId;
  const classId = body.classId;
  const subjectId = body.subjectId;
  const date = body.date;
  const records = Array.isArray(body.records) ? body.records : null;

  if (!facultyId || !classId || !subjectId || !date) {
    return sendValidationError(res, "facultyId, classId, subjectId, and date are required.");
  }
  if (![facultyId, classId, subjectId].every(isObjectId)) {
    return sendValidationError(res, "facultyId, classId, and subjectId must be valid ids.");
  }
  if (!isIsoDate(date)) {
    return sendValidationError(res, "date must be YYYY-MM-DD.");
  }
  if (!records || records.length === 0) {
    return sendValidationError(res, "records must be a non-empty array of { studentId, status, remarks }.");
  }

  if (req.user.role === "faculty" && req.user.id !== String(facultyId)) {
    return res.status(403).json({ error: "Faculty can only save attendance for their own identity." });
  }

  const allowed = await assertFacultyCanAccessClassSubject(req, res, facultyId, classId, subjectId);
  if (!allowed) return;

  const [classRecord, subject] = await Promise.all([
    ClassSection.findById(classId).lean(),
    Subject.findById(subjectId).lean(),
  ]);
  if (!classRecord || !subject) return res.status(404).json({ error: "Class or subject was not found." });
  const folderId = await ensureDataFolder("Academic Records", teachingFolderSegments("Attendance", classRecord, subject.code));

  const errors = [];
  const saved = [];

  for (const [index, record] of records.entries()) {
    const studentId = record.studentId;
    const status = String(record.status || "").toLowerCase();
    const remarks = String(record.remarks || "").trim();

    if (!isObjectId(studentId)) {
      errors.push({ index, error: "studentId must be a valid id." });
      continue;
    }
    if (!ATTENDANCE_STATUSES.includes(status)) {
      errors.push({ index, error: "status must be present, absent, or late." });
      continue;
    }

    const enrolled = await studentEnrolledInClass(studentId, classId);
    if (!enrolled) {
      errors.push({ index, error: "Student is not enrolled in this class." });
      continue;
    }

    try {
      const doc = await Attendance.findOneAndUpdate(
        { studentId, subjectId, classId, date },
        { facultyId, studentId, subjectId, classId, date, status, remarks, folderId },
        { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );
      saved.push(doc);
    } catch (error) {
      if (error?.code === 11000) {
        errors.push({ index, error: "Duplicate attendance already exists for this student, class/subject, and date." });
      } else {
        errors.push({ index, error: error.message || "Could not save attendance." });
      }
    }
  }

  if (errors.length > 0 && saved.length === 0) {
    return res.status(400).json({ error: "No attendance records were saved.", details: errors });
  }

  const populated = await Attendance.find({
    _id: { $in: saved.map((row) => row._id) },
  })
    .populate(populateFields)
    .lean();
  const documentMap = await documentsByAttendance(populated);

  res.status(saved.length === records.length ? 200 : 207).json({
    message: errors.length ? "Attendance saved with some row errors." : "Attendance saved.",
    records: populated.map((row) => serializeAttendance(row, documentMap)),
    details: errors.length ? errors : undefined,
  });
});

attendanceRouter.put("/attendance/:id", requireRole("faculty", "admin"), async (req, res) => {
  const { id } = req.params;
  if (!isObjectId(id)) {
    return sendValidationError(res, "Attendance id must be valid.");
  }

  const existing = await Attendance.findById(id);
  if (!existing) {
    return res.status(404).json({ error: "Attendance record not found." });
  }

  const allowed = await assertFacultyCanAccessClassSubject(
    req,
    res,
    String(existing.facultyId),
    String(existing.classId),
    String(existing.subjectId)
  );
  if (!allowed) return;

  const status = req.body?.status !== undefined ? String(req.body.status).toLowerCase() : existing.status;
  const remarks = req.body?.remarks !== undefined ? String(req.body.remarks).trim() : existing.remarks;

  if (!ATTENDANCE_STATUSES.includes(status)) {
    return sendValidationError(res, "status must be present, absent, or late.");
  }

  existing.status = status;
  existing.remarks = remarks;
  await existing.save();

  const populated = await Attendance.findById(id).populate(populateFields).lean();
  const documentMap = await documentsByAttendance([populated]);
  res.json({ record: serializeAttendance(populated, documentMap) });
});

attendanceRouter.get("/student/:studentId/attendance", requireRole("student", "admin", "faculty"), async (req, res) => {
  const { studentId } = req.params;
  if (!isObjectId(studentId)) {
    return sendValidationError(res, "studentId must be a valid id.");
  }

  if (req.user.role === "student" && req.user.id !== studentId) {
    return res.status(403).json({ error: "Students can only view their own attendance." });
  }

  const { classId, subjectId, from, to } = req.query;
  if (classId && !isObjectId(classId)) return sendValidationError(res, "classId must be a valid id.");
  if (subjectId && !isObjectId(subjectId)) return sendValidationError(res, "subjectId must be a valid id.");

  const filter = { studentId };
  if (req.user.role === "faculty") {
    const assignmentFilter = { facultyId: req.user.id };
    if (classId) assignmentFilter.classId = classId;
    if (subjectId) assignmentFilter.subjectId = subjectId;
    const assignments = await FacultyAssignment.find(assignmentFilter).select("classId subjectId").lean();
    if (assignments.length === 0) {
      return res.status(403).json({ error: "Faculty can only view attendance for assigned class and subject combinations." });
    }
    const classIds = [...new Set(assignments.map((row) => String(row.classId)))];
    const enrolled = await Enrollment.exists({ studentId, classId: { $in: classIds } });
    if (!enrolled) {
      return res.status(403).json({ error: "Faculty can only view attendance for students enrolled in their assigned classes." });
    }
    filter.$or = assignments.map((row) => ({ classId: row.classId, subjectId: row.subjectId }));
  } else if (classId) {
    filter.classId = classId;
  }
  if (subjectId) filter.subjectId = subjectId;
  if (from || to) {
    filter.date = {};
    if (from) {
      if (!isIsoDate(from)) return sendValidationError(res, "from must be YYYY-MM-DD.");
      filter.date.$gte = from;
    }
    if (to) {
      if (!isIsoDate(to)) return sendValidationError(res, "to must be YYYY-MM-DD.");
      filter.date.$lte = to;
    }
  }

  const rows = await Attendance.find(filter).populate(populateFields).sort({ date: 1 }).lean();
  const documentMap = await documentsByAttendance(rows);
  const total = rows.length;
  const attended = rows.filter((row) => row.status === "present" || row.status === "late").length;
  const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

  res.json({
    studentId,
    total,
    attended,
    percentage,
    records: rows.map((row) => serializeAttendance(row, documentMap)),
  });
});



async function authorizeAttendanceDocumentAccess(req, res, attendance) {
  if (req.user.role === "admin") return true;
  if (req.user.role === "student") {
    if (String(attendance.studentId) !== req.user.id) {
      res.status(403).json({ error: "Students can only access documents for their own attendance." });
      return false;
    }
    return true;
  }
  if (req.user.role === "faculty") {
    // Teaching faculty may review documents for their assigned class + subject.
    const teachingAssignment = await FacultyAssignment.findOne({
      facultyId: req.user.id,
      classId: attendance.classId,
      subjectId: attendance.subjectId,
    }).lean();
    if (teachingAssignment) return true;

    // The student's currently assigned mentor may access the complete attendance
    // document history for that mentee (including earlier academic years), even when
    // the mentor does not teach the linked subject. The active student assignment is
    // the authorization boundary; a former mentor loses access after reassignment.
    const mentorAssignment = await MentorAssignment.findOne({
      mentorId: req.user.id,
      studentId: attendance.studentId,
      status: "active",
    }).lean();
    if (mentorAssignment) return true;
    res.status(403).json({ error: "Only faculty assigned to this class/subject or the student's active mentor can access this document." });
    return false;
  }
  res.status(403).json({ error: "You do not have permission to access attendance documents." });
  return false;
}

function decodeDocumentPayload(body = {}) {
  const documentType = String(body.documentType || "").trim().toLowerCase();
  if (!DOCUMENT_TYPES.has(documentType)) throw Object.assign(new Error("Document type must be Sick Certificate or OD Letter."), { status: 400 });
  const mimeType = String(body.mimeType || "").trim().toLowerCase();
  if (!ALLOWED_DOCUMENT_MIME.has(mimeType)) throw Object.assign(new Error("Only PDF, JPG/JPEG and PNG files are accepted."), { status: 400 });
  const originalName = String(body.fileName || "").replace(/[\\/]/g, "_").trim().slice(0, 180);
  if (!originalName) throw Object.assign(new Error("A file name is required."), { status: 400 });
  let encoded = String(body.contentBase64 || "").trim();
  if (encoded.startsWith("data:")) encoded = encoded.slice(encoded.indexOf(",") + 1);
  if (!encoded || encoded.length > Math.ceil(MAX_DOCUMENT_BYTES * 4 / 3) + 8 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw Object.assign(new Error("File content is missing or invalid."), { status: 400 });
  }
  const content = Buffer.from(encoded, "base64");
  if (!content.length || content.length > MAX_DOCUMENT_BYTES) throw Object.assign(new Error("Each document must be smaller than or equal to 5 MB."), { status: 400 });
  const signatureMatches = mimeType === "application/pdf"
    ? content.subarray(0, 5).toString("ascii") === "%PDF-"
    : mimeType === "image/png"
      ? content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff;
  if (!signatureMatches) throw Object.assign(new Error("The file contents do not match the selected PDF/JPG/PNG type."), { status: 400 });
  return { documentType, mimeType, originalName, content, size: content.length, note: String(body.note || "").trim().slice(0, 500) };
}

attendanceRouter.post("/attendance/:id/documents", requireRole("student", "faculty", "admin"), async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return sendValidationError(res, "Attendance record ID is invalid.");
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ error: "Attendance record not found." });
    if (!(await authorizeAttendanceDocumentAccess(req, res, attendance))) return;
    const file = decodeDocumentPayload(req.body || {});
    const [classRecord, subject] = await Promise.all([
      ClassSection.findById(attendance.classId).lean(),
      Subject.findById(attendance.subjectId).lean(),
    ]);
    const folderId = await ensureDataFolder("Academic Records", teachingFolderSegments("Attendance Documents", classRecord, subject?.code || ""));
    const reviewStatus = req.user.role === "student" ? "pending" : "approved";
    const document = await AttendanceDocument.create({
      folderId, attendanceId: attendance._id, studentId: attendance.studentId,
      classId: attendance.classId, subjectId: attendance.subjectId,
      uploadedBy: req.user.id, uploadedByRole: req.user.role,
      documentType: file.documentType, originalName: file.originalName,
      mimeType: file.mimeType, size: file.size, content: file.content,
      note: file.note, reviewStatus,
      reviewedBy: reviewStatus === "approved" ? req.user.id : null,
      reviewedByRole: reviewStatus === "approved" ? req.user.role : null,
      reviewedAt: reviewStatus === "approved" ? new Date() : null,
    });
    return res.status(201).json({
      message: reviewStatus === "pending" ? "Document uploaded and sent for faculty review." : "Attendance document attached.",
      document: documentMetadata(document),
    });
  } catch (error) { return next(error); }
});

attendanceRouter.patch("/attendance-documents/:documentId/review", requireRole("faculty", "admin"), async (req, res, next) => {
  try {
    if (!isObjectId(req.params.documentId)) return sendValidationError(res, "Document ID is invalid.");
    const document = await AttendanceDocument.findById(req.params.documentId);
    if (!document) return res.status(404).json({ error: "Attendance document not found." });
    const attendance = await Attendance.findById(document.attendanceId);
    if (!attendance) return res.status(404).json({ error: "Linked attendance record was not found." });
    if (!(await authorizeAttendanceDocumentAccess(req, res, attendance))) return;
    const reviewStatus = String(req.body?.reviewStatus || "").toLowerCase();
    if (!["approved", "rejected"].includes(reviewStatus)) return sendValidationError(res, "reviewStatus must be approved or rejected.");
    document.reviewStatus = reviewStatus;
    // Student-submitted sick certificates and OD letters may be reviewed by an
    // assigned Faculty member or an Administrator. Faculty scope is enforced
    // by authorizeAttendanceDocumentAccess() for the exact class + subject.
    document.reviewedBy = req.user.id;
    document.reviewedByRole = req.user.role;
    document.reviewedAt = new Date();
    document.reviewRemarks = String(req.body?.reviewRemarks || "").trim().slice(0, 500);
    await document.save();
    return res.json({ message: `Document ${reviewStatus}.`, document: documentMetadata(document) });
  } catch (error) { return next(error); }
});

attendanceRouter.get("/attendance-documents/:documentId/download", requireRole("student", "faculty", "admin"), async (req, res, next) => {
  try {
    if (!isObjectId(req.params.documentId)) return sendValidationError(res, "Document ID is invalid.");
    const document = await AttendanceDocument.findById(req.params.documentId).select("+content");
    if (!document) return res.status(404).json({ error: "Attendance document not found." });
    const attendance = await Attendance.findById(document.attendanceId);
    if (!attendance) return res.status(404).json({ error: "Linked attendance record was not found." });
    if (!(await authorizeAttendanceDocumentAccess(req, res, attendance))) return;
    const safeName = document.originalName.replace(/[^\x20-\x7E]/g, "_").replace(/[\"\\\r\n]/g, "_");
    const encodedName = encodeURIComponent(document.originalName).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    res.set({
      "Content-Type": document.mimeType,
      "Content-Length": String(document.size),
      "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    });
    return res.send(document.content);
  } catch (error) { return next(error); }
});

attendanceRouter.get("/hr/attendance", requireRole("admin"), async (req, res) => {
  const { facultyId, classId, subjectId, studentId, date, from, to } = req.query;
  const filter = {};

  for (const [key, value] of [
    ["facultyId", facultyId],
    ["classId", classId],
    ["subjectId", subjectId],
    ["studentId", studentId],
  ]) {
    if (!value) continue;
    if (!isObjectId(value)) {
      return sendValidationError(res, `${key} must be a valid id.`);
    }
    filter[key] = value;
  }

  if (date) {
    if (!isIsoDate(date)) return sendValidationError(res, "date must be YYYY-MM-DD.");
    filter.date = date;
  } else if (from || to) {
    filter.date = {};
    if (from) {
      if (!isIsoDate(from)) return sendValidationError(res, "from must be YYYY-MM-DD.");
      filter.date.$gte = from;
    }
    if (to) {
      if (!isIsoDate(to)) return sendValidationError(res, "to must be YYYY-MM-DD.");
      filter.date.$lte = to;
    }
  }

  const rows = await Attendance.find(filter).populate(populateFields).sort({ date: -1, studentId: 1 }).lean();
  const documentMap = await documentsByAttendance(rows);
  res.json({
    count: rows.length,
    records: rows.map((row) => serializeAttendance(row, documentMap)),
  });
});
