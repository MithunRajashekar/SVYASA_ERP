import { Router } from "express";
import crypto from "node:crypto";
import { Attendance } from "../models/Attendance.js";
import { AttendanceDocument } from "../models/AttendanceDocument.js";
import { MentorAssignment } from "../models/MentorAssignment.js";
import { StudentNoc } from "../models/StudentNoc.js";
import { ClassSection } from "../models/ClassSection.js";
import { User } from "../models/User.js";
import { Enrollment } from "../models/Enrollment.js";
import { Marks } from "../models/Marks.js";
import { Subject } from "../models/Subject.js";
import { ModuleRecord } from "../models/ModuleRecord.js";
import { HostelAllotment } from "../models/HostelAllotment.js";
import { MentorSession } from "../models/MentorSession.js";
import { StudentCertificate } from "../models/StudentCertificate.js";
import { calculateAssessmentSummary } from "../utils/assessment.js";
import { ensureDataFolder } from "../utils/autoFolders.js";
import { authenticate, isObjectId, requireRole, sendValidationError } from "../middleware/auth.js";

export const mentorRouter = Router();


const CERTIFICATE_CATEGORIES = new Set(["academic", "achievement", "workshop", "internship", "participation", "sports", "cultural", "other"]);
const CERTIFICATE_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAX_CERTIFICATE_BYTES = 5 * 1024 * 1024;

function decodeCertificateFile(body = {}) {
  const mimeType = String(body.mimeType || "").trim().toLowerCase();
  if (!CERTIFICATE_MIME.has(mimeType)) throw Object.assign(new Error("Only PDF, JPG/JPEG and PNG certificates are accepted."), { status: 400 });
  const originalName = String(body.fileName || "").replace(/[\\/]/g, "_").trim().slice(0, 180);
  if (!originalName) throw Object.assign(new Error("Certificate file name is required."), { status: 400 });
  let encoded = String(body.contentBase64 || "").trim();
  if (encoded.startsWith("data:")) encoded = encoded.slice(encoded.indexOf(",") + 1);
  if (!encoded || encoded.length > Math.ceil(MAX_CERTIFICATE_BYTES * 4 / 3) + 8 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    throw Object.assign(new Error("Certificate file content is missing or invalid."), { status: 400 });
  }
  const content = Buffer.from(encoded, "base64");
  if (!content.length || content.length > MAX_CERTIFICATE_BYTES) throw Object.assign(new Error("Each certificate must be 5 MB or smaller."), { status: 400 });
  const signatureMatches = mimeType === "application/pdf"
    ? content.subarray(0, 5).toString("ascii") === "%PDF-"
    : mimeType === "image/png"
      ? content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff;
  if (!signatureMatches) throw Object.assign(new Error("The file contents do not match the selected PDF/JPG/PNG type."), { status: 400 });
  return { originalName, mimeType, content, size: content.length };
}

function certificateMetadata(row) {
  return {
    id: String(row._id), studentId: String(row.studentId), title: row.title, category: row.category,
    issuer: row.issuer || "", issueDate: row.issueDate || null, description: row.description || "",
    originalName: row.originalName, mimeType: row.mimeType, size: row.size,
    uploadedByRole: row.uploadedByRole, reviewStatus: row.reviewStatus,
    reviewedByRole: row.reviewedByRole || null, reviewedAt: row.reviewedAt || null,
    reviewRemarks: row.reviewRemarks || "", createdAt: row.createdAt,
  };
}

async function activeMenteeAssignment(mentorId, studentId) {
  return MentorAssignment.findOne({ mentorId, studentId, status: "active" }).sort({ updatedAt: -1 }).lean();
}

// Complete, assignment-scoped student dossier. Every collection lookup is restricted
// to the student for whom this faculty member has an active mentor assignment.
mentorRouter.get("/mentor/mentees/:studentId/profile", authenticate, requireRole("faculty"), async (req, res) => {
  if (!isObjectId(req.params.studentId)) return sendValidationError(res, "Student ID is invalid.");
  const assignment = await activeMenteeAssignment(req.user.id, req.params.studentId);
  if (!assignment) return res.status(403).json({ error: "You can view full records only for students actively assigned to you as mentees." });
  const student = await User.findOne({ _id: req.params.studentId, role: "student" }).select("-passwordHash").lean();
  if (!student) return res.status(404).json({ error: "Student account not found." });

  const [enrollments, attendanceRows, certificates, sessions, nocRequests, hostelAllotments, serviceRecords] = await Promise.all([
    Enrollment.find({ studentId: student._id }).populate("classId", "name department semester section academicYear").sort({ createdAt: -1 }).lean(),
    Attendance.find({ studentId: student._id }).populate("classId", "name department semester section academicYear").populate("subjectId", "name code").sort({ date: -1 }).limit(3000).lean(),
    StudentCertificate.find({ studentId: student._id }).select("-content").populate("reviewedBy", "name code role").sort({ issueDate: -1, createdAt: -1 }).limit(500).lean(),
    MentorSession.find({ studentId: student._id }).populate("mentorId", "name code").sort({ sessionAt: -1 }).limit(500).lean(),
    StudentNoc.find({ studentId: student._id }).populate("mentorId", "name code").populate("reviewedBy", "name code role").sort({ requestedAt: -1 }).limit(200).lean(),
    HostelAllotment.find({ studentId: student._id }).populate("roomId").sort({ allocatedAt: -1 }).lean(),
    ModuleRecord.find({ $or: [{ ownerId: student._id }, { targetUserId: student._id }] }).sort({ createdAt: -1 }).limit(2000).lean(),
  ]);

  const attendanceIds = attendanceRows.map((row) => row._id);
  const attendanceDocuments = attendanceIds.length ? await AttendanceDocument.find({ attendanceId: { $in: attendanceIds } })
    .select("attendanceId documentType originalName mimeType size note reviewStatus reviewRemarks reviewedByRole reviewedAt createdAt")
    .sort({ createdAt: -1 }).lean() : [];
  const docsByAttendance = new Map();
  for (const row of attendanceDocuments) {
    const key = String(row.attendanceId);
    if (!docsByAttendance.has(key)) docsByAttendance.set(key, []);
    docsByAttendance.get(key).push({
      id: String(row._id), documentType: row.documentType, originalName: row.originalName,
      mimeType: row.mimeType, size: row.size, note: row.note || "", reviewStatus: row.reviewStatus,
      reviewRemarks: row.reviewRemarks || "", reviewedByRole: row.reviewedByRole || null,
      reviewedAt: row.reviewedAt || null, createdAt: row.createdAt,
    });
  }
  const identifiers = [...new Set([student.code, student.student_id, student.usn].filter(Boolean).map((value) => String(value).toUpperCase()))];
  const markRows = identifiers.length ? await Marks.find({ student_id: { $in: identifiers } }).lean() : [];
  const subjects = markRows.length ? await Subject.find({ code: { $in: markRows.map((row) => row.subject_code) } }).select("code name department semester").lean() : [];
  const subjectMap = new Map(subjects.map((row) => [String(row.code).toUpperCase(), row]));
  const marks = markRows.map((row) => ({ ...row, subject: subjectMap.get(String(row.subject_code).toUpperCase()) || null, ...calculateAssessmentSummary(row) }));

  const feeRecords = serviceRecords.filter((row) => row.module === "fees");
  const feeTotals = feeRecords.reduce((totals, row) => {
    const amount = Math.max(0, Number(row.fields?.amount) || 0);
    const paid = Math.max(0, Number(row.fields?.paidAmount) || 0);
    totals.amount += amount;
    totals.paid += paid;
    totals.remaining += Math.max(0, amount - paid);
    return totals;
  }, { amount: 0, paid: 0, remaining: 0 });
  const attended = attendanceRows.filter((row) => ["present", "late"].includes(row.status)).length;

  return res.json({
    assignment: { id: String(assignment._id), academicYear: assignment.academicYear, assignedAt: assignment.createdAt, notes: assignment.notes || "" },
    student: {
      id: String(student._id), code: student.code, student_id: student.student_id || student.code, usn: student.usn || "",
      name: student.name, email: student.email || "", phone: student.phone || "", department: student.department || "",
      program: student.program || "", semester: student.semester ?? null, section: student.section || "",
      isActive: student.isActive !== false, createdAt: student.createdAt || null, personalDetails: student.personalDetails || {},
    },
    enrollments: enrollments.map((row) => ({ id: String(row._id), class: row.classId, createdAt: row.createdAt })),
    attendance: {
      total: attendanceRows.length, attended, absent: attendanceRows.filter((row) => row.status === "absent").length,
      percentage: attendanceRows.length ? Number((attended / attendanceRows.length * 100).toFixed(2)) : 0,
      records: attendanceRows.map((row) => ({ id: String(row._id), date: row.date, status: row.status, remarks: row.remarks || "", class: row.classId, subject: row.subjectId, documents: docsByAttendance.get(String(row._id)) || [] })),
    },
    marks,
    fees: { ...feeTotals, records: feeRecords.map((row) => ({ id: String(row._id), title: row.title, status: row.status, amount: Number(row.fields?.amount) || 0, paidAmount: Number(row.fields?.paidAmount) || 0, remaining: Math.max(0, (Number(row.fields?.amount) || 0) - (Number(row.fields?.paidAmount) || 0)), feeType: row.fields?.feeType || "Other", dueDate: row.fields?.dueDate || row.dueAt || null, receiptReference: row.fields?.receiptReference || "", createdAt: row.createdAt })) },
    certificates: certificates.map(certificateMetadata),
    sessions: sessions.map((row) => ({
      id: String(row._id), agenda: row.agenda, sessionAt: row.sessionAt, durationMinutes: row.durationMinutes,
      mode: row.mode, locationOrLink: row.locationOrLink || "", status: row.status,
      mentor: row.mentorId ? { id: String(row.mentorId._id), name: row.mentorId.name, code: row.mentorId.code } : null,
      mentorNotes: String(row.mentorId?._id || row.mentorId) === String(req.user.id) ? row.mentorNotes || "" : "",
      studentSummary: row.studentSummary || "", actionItems: row.actionItems || [], followUpDate: row.followUpDate || null,
      completedAt: row.completedAt || null, createdAt: row.createdAt,
    })),
    nocRequests: nocRequests.map((row) => ({ ...row, id: String(row._id) })),
    hostelAllotments,
    serviceRecords: serviceRecords.filter((row) => row.module !== "fees").map((row) => ({ ...row, id: String(row._id) })),
  });
});

mentorRouter.get("/mentor/sessions", authenticate, requireRole("faculty"), async (req, res) => {
  const assignments = await MentorAssignment.find({ mentorId: req.user.id, status: "active" }).select("_id studentId").lean();
  if (!assignments.length) return res.json({ sessions: [] });
  const rows = await MentorSession.find({ mentorId: req.user.id, mentorAssignmentId: { $in: assignments.map((row) => row._id) } })
    .populate("studentId", "name code usn department program semester section")
    .sort({ sessionAt: -1 }).limit(1000).lean();
  return res.json({ sessions: rows.map((row) => ({ ...row, id: String(row._id), student: row.studentId })) });
});

mentorRouter.post("/mentor/mentees/:studentId/sessions", authenticate, requireRole("faculty"), async (req, res) => {
  if (!isObjectId(req.params.studentId)) return sendValidationError(res, "Student ID is invalid.");
  const assignment = await activeMenteeAssignment(req.user.id, req.params.studentId);
  if (!assignment) return res.status(403).json({ error: "You can schedule mentoring only for students actively assigned to you." });
  const agenda = String(req.body?.agenda || "").trim().slice(0, 1500);
  const sessionAt = new Date(req.body?.sessionAt || "");
  if (!agenda) return sendValidationError(res, "Enter an agenda for the mentoring session.");
  if (Number.isNaN(sessionAt.getTime())) return sendValidationError(res, "Choose a valid session date and time.");
  const mode = String(req.body?.mode || "in-person").toLowerCase();
  if (!["in-person", "online", "phone"].includes(mode)) return sendValidationError(res, "Choose a valid mentoring mode.");
  const durationMinutes = Number(req.body?.durationMinutes || 30);
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) return sendValidationError(res, "Session duration must be between 5 and 480 minutes.");
  const folderId = await ensureDataFolder("Mentoring", [assignment.academicYear, req.user.code, String(req.params.studentId), "Sessions"]);
  const session = await MentorSession.create({
    folderId, mentorId: req.user.id, studentId: req.params.studentId, mentorAssignmentId: assignment._id,
    academicYear: assignment.academicYear, agenda, sessionAt, durationMinutes, mode,
    locationOrLink: String(req.body?.locationOrLink || "").trim().slice(0, 500),
    studentSummary: String(req.body?.studentSummary || "").trim().slice(0, 2000),
    status: "scheduled", createdBy: req.user.id,
  });
  return res.status(201).json({ success: true, session: { id: String(session._id), agenda: session.agenda, sessionAt: session.sessionAt, status: session.status } });
});

mentorRouter.patch("/mentor/sessions/:id", authenticate, requireRole("faculty"), async (req, res) => {
  if (!isObjectId(req.params.id)) return sendValidationError(res, "Mentoring session ID is invalid.");
  const session = await MentorSession.findOne({ _id: req.params.id, mentorId: req.user.id });
  if (!session) return res.status(404).json({ error: "Mentoring session not found." });
  const assignment = await MentorAssignment.findOne({ _id: session.mentorAssignmentId, mentorId: req.user.id, studentId: session.studentId, academicYear: session.academicYear, status: "active" }).lean();
  if (!assignment) return res.status(403).json({ error: "You no longer have an active assignment for this mentee." });
  if (req.body?.agenda !== undefined) session.agenda = String(req.body.agenda || "").trim().slice(0, 1500);
  if (req.body?.sessionAt !== undefined) {
    const date = new Date(req.body.sessionAt);
    if (Number.isNaN(date.getTime())) return sendValidationError(res, "Choose a valid session date and time.");
    session.sessionAt = date;
  }
  if (req.body?.mode !== undefined) {
    const mode = String(req.body.mode).toLowerCase();
    if (!["in-person", "online", "phone"].includes(mode)) return sendValidationError(res, "Choose a valid mentoring mode.");
    session.mode = mode;
  }
  if (req.body?.locationOrLink !== undefined) session.locationOrLink = String(req.body.locationOrLink || "").trim().slice(0, 500);
  if (req.body?.mentorNotes !== undefined) session.mentorNotes = String(req.body.mentorNotes || "").trim().slice(0, 5000);
  if (req.body?.studentSummary !== undefined) session.studentSummary = String(req.body.studentSummary || "").trim().slice(0, 2000);
  if (req.body?.followUpDate !== undefined) {
    const followUp = req.body.followUpDate ? new Date(req.body.followUpDate) : null;
    if (followUp && Number.isNaN(followUp.getTime())) return sendValidationError(res, "Follow-up date is invalid.");
    session.followUpDate = followUp;
  }
  if (req.body?.actionItems !== undefined) {
    if (!Array.isArray(req.body.actionItems) || req.body.actionItems.length > 20) return sendValidationError(res, "Provide up to 20 mentoring action items.");
    session.actionItems = req.body.actionItems.map((item) => ({
      task: String(item?.task || "").trim().slice(0, 500),
      dueDate: item?.dueDate ? new Date(item.dueDate) : null,
      status: ["open", "in-progress", "completed", "cancelled"].includes(item?.status) ? item.status : "open",
      completedAt: item?.status === "completed" ? new Date() : null,
    })).filter((item) => item.task);
  }
  if (req.body?.status !== undefined) {
    const status = String(req.body.status).toLowerCase();
    if (!["scheduled", "completed", "cancelled"].includes(status)) return sendValidationError(res, "Session status must be scheduled, completed or cancelled.");
    session.status = status;
    session.completedAt = status === "completed" ? new Date() : null;
  }
  await session.save();
  return res.json({ success: true, session: { id: String(session._id), status: session.status, sessionAt: session.sessionAt, followUpDate: session.followUpDate } });
});

mentorRouter.post("/mentor/mentees/:studentId/certificates", authenticate, requireRole("faculty"), async (req, res) => {
  if (!isObjectId(req.params.studentId)) return sendValidationError(res, "Student ID is invalid.");
  const assignment = await activeMenteeAssignment(req.user.id, req.params.studentId);
  if (!assignment) return res.status(403).json({ error: "You can add certificates only to students actively assigned to you." });
  const title = String(req.body?.title || "").trim().slice(0, 180);
  const category = String(req.body?.category || "other").toLowerCase();
  if (!title) return sendValidationError(res, "Certificate title is required.");
  if (!CERTIFICATE_CATEGORIES.has(category)) return sendValidationError(res, "Choose a valid certificate category.");
  const file = decodeCertificateFile(req.body || {});
  const issueDate = req.body?.issueDate ? new Date(req.body.issueDate) : null;
  if (issueDate && Number.isNaN(issueDate.getTime())) return sendValidationError(res, "Certificate issue date is invalid.");
  const folderId = await ensureDataFolder("Student Records", [assignment.academicYear, "Certificates", String(req.params.studentId)]);
  const record = await StudentCertificate.create({
    folderId, studentId: req.params.studentId, mentorId: req.user.id, mentorAssignmentId: assignment._id,
    academicYear: assignment.academicYear, title, category, issuer: String(req.body?.issuer || "").trim().slice(0, 180),
    issueDate, description: String(req.body?.description || "").trim().slice(0, 2000), ...file,
    uploadedBy: req.user.id, uploadedByRole: "faculty", reviewStatus: "approved",
    reviewedBy: req.user.id, reviewedByRole: "faculty", reviewedAt: new Date(),
    reviewRemarks: "Added to the student's record by the assigned mentor.",
  });
  return res.status(201).json({ success: true, certificate: certificateMetadata(record) });
});

mentorRouter.patch("/mentor/certificates/:id/review", authenticate, requireRole("faculty"), async (req, res) => {
  if (!isObjectId(req.params.id)) return sendValidationError(res, "Certificate ID is invalid.");
  const record = await StudentCertificate.findById(req.params.id);
  if (!record) return res.status(404).json({ error: "Certificate record not found." });
  const assignment = await activeMenteeAssignment(req.user.id, record.studentId);
  if (!assignment || record.uploadedByRole !== "student") {
    return res.status(403).json({ error: "You can review student-submitted certificates only for students currently assigned to you as mentees." });
  }
  const decision = String(req.body?.decision || "").toLowerCase();
  if (!["approved", "rejected"].includes(decision)) return sendValidationError(res, "Decision must be approved or rejected.");
  record.reviewStatus = decision;
  record.reviewedBy = req.user.id;
  record.reviewedByRole = "faculty";
  record.reviewedAt = new Date();
  record.reviewRemarks = String(req.body?.reviewRemarks || "").trim().slice(0, 1000);
  await record.save();
  return res.json({ success: true, certificate: certificateMetadata(record) });
});

mentorRouter.get("/mentor/certificates/:id/download", authenticate, requireRole("faculty"), async (req, res) => {
  if (!isObjectId(req.params.id)) return sendValidationError(res, "Certificate ID is invalid.");
  const record = await StudentCertificate.findById(req.params.id).select("+content");
  if (!record) return res.status(404).json({ error: "Certificate not found." });
  const assignment = await activeMenteeAssignment(req.user.id, record.studentId);
  if (!assignment) return res.status(403).json({ error: "You can access certificates only for students currently assigned to you as mentees." });
  const safeName = record.originalName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\\r\n]/g, "_");
  const encodedName = encodeURIComponent(record.originalName).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  res.set({ "Content-Type": record.mimeType, "Content-Length": String(record.size), "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" });
  return res.send(record.content);
});

mentorRouter.get("/mentor/mentees", authenticate, requireRole("faculty"), async (req, res) => {
  const assignments = await MentorAssignment.find({ mentorId: req.user.id, status: "active" })
    .populate("studentId", "name code usn email phone department program semester section isActive")
    .sort({ academicYear: -1, createdAt: -1 }).lean();
  return res.json({ assignments: assignments.filter((row) => row.studentId).map((row) => ({
    id: String(row._id), student: row.studentId, academicYear: row.academicYear, notes: row.notes,
  })) });
});

mentorRouter.get("/mentor/pending-documents", authenticate, requireRole("faculty"), async (req, res) => {
  // An active mentor can review all pending attendance documents for current mentees,
  // including historic records. Reassignment changes the student-level authorization
  // boundary, so the previous mentor loses access immediately.
  const assignments = await MentorAssignment.find({ mentorId: req.user.id, status: "active" })
    .select("studentId academicYear").lean();
  if (!assignments.length) return res.json({ documents: [] });
  const assignmentByStudent = new Map(assignments.map((row) => [String(row.studentId), row]));
  const studentIds = assignments.map((row) => row.studentId);
  const docs = await AttendanceDocument.find({ studentId: { $in: studentIds }, reviewStatus: "pending" })
    .sort({ createdAt: 1 }).limit(500).lean();
  if (!docs.length) return res.json({ documents: [] });
  const attendanceIds = docs.map((doc) => doc.attendanceId);
  const attendanceRows = await Attendance.find({ _id: { $in: attendanceIds } })
    .populate("studentId", "name code usn")
    .populate("classId", "name department semester section academicYear")
    .populate("subjectId", "name code").lean();
  const attendanceMap = new Map(attendanceRows.map((row) => [String(row._id), row]));
  const documents = docs.map((doc) => {
    const attendance = attendanceMap.get(String(doc.attendanceId));
    const assignment = assignmentByStudent.get(String(doc.studentId));
    if (!assignment || !attendance?.studentId || !attendance?.classId) return null;
    return {
      id: String(doc._id), documentType: doc.documentType, originalName: doc.originalName,
      mimeType: doc.mimeType, size: doc.size, note: doc.note || "", reviewStatus: doc.reviewStatus,
      createdAt: doc.createdAt, attendanceId: String(doc.attendanceId),
      student: { id: String(attendance.studentId._id), name: attendance.studentId.name, code: attendance.studentId.usn || attendance.studentId.code },
      attendance: { date: attendance.date, status: attendance.status, remarks: attendance.remarks || "" },
      class: attendance.classId, subject: attendance.subjectId || null,
    };
  }).filter(Boolean);
  return res.json({ documents });
});

mentorRouter.get("/mentor/pending-certificates", authenticate, requireRole("faculty"), async (req, res) => {
  const assignments = await MentorAssignment.find({ mentorId: req.user.id, status: "active" }).select("_id studentId academicYear").lean();
  if (!assignments.length) return res.json({ certificates: [] });
  const assignmentByStudent = new Map(assignments.map((row) => [String(row.studentId), row]));
  const records = await StudentCertificate.find({
    studentId: { $in: assignments.map((row) => row.studentId) },
    reviewStatus: "pending",
    uploadedByRole: "student",
  }).populate("studentId", "name code usn department program semester section").sort({ createdAt: 1 }).limit(500).lean();
  const certificates = records.filter((row) => row.studentId && assignmentByStudent.has(String(row.studentId._id))).map((row) => ({
    ...certificateMetadata(row),
    student: { id: String(row.studentId._id), name: row.studentId.name, code: row.studentId.usn || row.studentId.code,
      department: row.studentId.department || "", program: row.studentId.program || "", semester: row.studentId.semester ?? null, section: row.studentId.section || "" },
  }));
  return res.json({ certificates });
});

mentorRouter.patch("/mentor/documents/:documentId/review", authenticate, requireRole("faculty"), async (req, res) => {
  if (!isObjectId(req.params.documentId)) return sendValidationError(res, "Document ID is invalid.");
  const document = await AttendanceDocument.findById(req.params.documentId);
  if (!document) return res.status(404).json({ error: "Document not found." });
  const assignment = await MentorAssignment.findOne({ mentorId: req.user.id, studentId: document.studentId, status: "active" }).lean();
  if (!assignment) return res.status(403).json({ error: "You can review documents only for students assigned to you as mentees." });
  const attendance = await Attendance.findById(document.attendanceId).lean();
  if (!attendance || String(attendance.studentId) !== String(document.studentId)) return res.status(409).json({ error: "The linked attendance record is invalid." });
  const decision = String(req.body?.decision || "").toLowerCase();
  if (!(["approved", "rejected"].includes(decision))) return sendValidationError(res, "Decision must be approved or rejected.");
  document.reviewStatus = decision;
  document.reviewedBy = req.user.id;
  document.reviewedByRole = "faculty";
  document.reviewedAt = new Date();
  document.reviewRemarks = String(req.body?.reviewRemarks || "").trim().slice(0, 500);
  await document.save();
  return res.json({ success: true, document: {
    id: String(document._id), reviewStatus: document.reviewStatus, reviewRemarks: document.reviewRemarks,
    reviewedByRole: document.reviewedByRole, reviewedAt: document.reviewedAt,
  } });
});

mentorRouter.get("/mentor/noc-requests", authenticate, requireRole("faculty"), async (req, res) => {
  const activeAssignments = await MentorAssignment.find({ mentorId: req.user.id, status: "active" }).select("_id").lean();
  const assignmentIds = activeAssignments.map((row) => row._id);
  if (!assignmentIds.length) return res.json({ requests: [] });
  const records = await StudentNoc.find({ mentorId: req.user.id, mentorAssignmentId: { $in: assignmentIds }, status: "pending" })
    .populate("studentId", "name code usn department program semester section")
    .sort({ requestedAt: 1 }).limit(300).lean();
  return res.json({ requests: records.map((row) => ({ ...row, id: String(row._id), student: row.studentId })) });
});

mentorRouter.get("/mentor/nocs", authenticate, requireRole("faculty"), async (req, res) => {
  const records = await StudentNoc.find({ mentorId: req.user.id, status: "issued" })
    .populate("studentId", "name code usn department program semester section")
    .sort({ issuedAt: -1 }).limit(300).lean();
  return res.json({ nocs: records.map((row) => ({ ...row, id: String(row._id), student: row.studentId })) });
});

mentorRouter.patch("/mentor/noc-requests/:id", authenticate, requireRole("faculty"), async (req, res) => {
  if (!isObjectId(req.params.id)) return sendValidationError(res, "NOC request ID is invalid.");
  const record = await StudentNoc.findOne({ _id: req.params.id, mentorId: req.user.id, status: "pending" });
  if (!record) return res.status(404).json({ error: "Pending NOC request was not found for your mentees." });
  const activeAssignment = await MentorAssignment.exists({
    _id: record.mentorAssignmentId, mentorId: req.user.id, studentId: record.studentId,
    status: "active",
  });
  if (!activeAssignment) return res.status(403).json({ error: "This student is no longer assigned to you as a mentor. Contact the Administrator." });
  const decision = String(req.body?.decision || "").toLowerCase();
  if (!(["issue", "reject"].includes(decision))) return sendValidationError(res, "Decision must be issue or reject.");
  record.status = decision === "issue" ? "issued" : "rejected";
  record.reviewedBy = req.user.id;
  record.reviewedByRole = "faculty";
  record.reviewedAt = new Date();
  record.reviewRemarks = String(req.body?.reviewRemarks || "").trim().slice(0, 1000);
  if (decision === "issue") {
    record.issuedAt = new Date();
    record.nocNumber = `SVYASA-NOC-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  }
  await record.save();
  return res.json({ success: true, record: { id: String(record._id), status: record.status, nocNumber: record.nocNumber, issuedAt: record.issuedAt, reviewRemarks: record.reviewRemarks } });
});
