import { Router } from "express";
import { rateLimit } from "../middleware/rateLimit.js";
import { User } from "../models/User.js";
import { Subject } from "../models/Subject.js";
import { Enrollment } from "../models/Enrollment.js";
import { Attendance } from "../models/Attendance.js";
import { Marks } from "../models/Marks.js";
import { AttendanceDocument } from "../models/AttendanceDocument.js";
import { MentorAssignment } from "../models/MentorAssignment.js";
import { StudentNoc } from "../models/StudentNoc.js";
import { MentorSession } from "../models/MentorSession.js";
import { StudentCertificate } from "../models/StudentCertificate.js";
import { ensureDataFolder } from "../utils/autoFolders.js";
import { calculateAssessmentSummary } from "../utils/assessment.js";
import { authenticate, requireRole, safeUser, setSessionCookie, signSession } from "../middleware/auth.js";
import { authenticateCredentials } from "./auth.js";

export const studentRouter = Router();
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
  if (!encoded || encoded.length > Math.ceil(MAX_CERTIFICATE_BYTES * 4 / 3) + 8 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw Object.assign(new Error("Certificate file content is missing or invalid."), { status: 400 });
  const content = Buffer.from(encoded, "base64");
  if (!content.length || content.length > MAX_CERTIFICATE_BYTES) throw Object.assign(new Error("Each certificate must be 5 MB or smaller."), { status: 400 });
  const signatureMatches = mimeType === "application/pdf" ? content.subarray(0, 5).toString("ascii") === "%PDF-"
    : mimeType === "image/png" ? content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff;
  if (!signatureMatches) throw Object.assign(new Error("The file contents do not match the selected PDF/JPG/PNG type."), { status: 400 });
  return { originalName, mimeType, content, size: content.length };
}

function certificateMetadata(row) {
  return { id: String(row._id), title: row.title, category: row.category, issuer: row.issuer || "", issueDate: row.issueDate || null, description: row.description || "", originalName: row.originalName, mimeType: row.mimeType, size: row.size, reviewStatus: row.reviewStatus, reviewRemarks: row.reviewRemarks || "", reviewedByRole: row.reviewedByRole || null, reviewedAt: row.reviewedAt || null, uploadedByRole: row.uploadedByRole, createdAt: row.createdAt };
}
const studentLoginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, message: "Too many sign-in attempts. Try again in 15 minutes." });

function assertSelf(req, res) {
  const id = String(req.params.student_id || req.params.studentId || "").trim().toUpperCase();
  const allowed = [req.user.code, req.user.student_id, req.user.usn].filter(Boolean).map((value) => String(value).toUpperCase());
  if (!allowed.includes(id)) {
    res.status(403).json({ success: false, error: "Students can access only their own records." });
    return false;
  }
  return true;
}

studentRouter.post("/login", studentLoginLimiter, async (req, res, next) => {
  try {
    const user = await authenticateCredentials(req.body?.student_id || req.body?.identifier, req.body?.password, "student");
    setSessionCookie(res, signSession(user), "student");
    return res.json({ success: true, message: "Login successful.", student: safeUser(user) });
  } catch (error) { next(error); }
});

studentRouter.get("/profile/:student_id", authenticate, requireRole("student"), async (req, res) => {
  if (!assertSelf(req, res)) return;
  const user = await User.findById(req.user.id).lean();
  return res.json({ success: true, student: safeUser(user) });
});

studentRouter.get("/subjects/:student_id", authenticate, requireRole("student"), async (req, res) => {
  if (!assertSelf(req, res)) return;
  const enrollments = await Enrollment.find({ studentId: req.user.id }).populate("classId", "department semester section").lean();
  const classes = enrollments.map((row) => row.classId).filter(Boolean);
  if (!classes.length) return res.json({ success: true, count: 0, subjects: [] });
  const filter = { $or: classes.map((classRecord) => ({
    $and: [
      { $or: [{ department: classRecord.department }, { department: "" }, { department: null }] },
      { $or: [{ semester: classRecord.semester }, { semester: null }] },
      { $or: [{ section: classRecord.section }, { section: "" }, { section: null }] },
    ],
  })) };
  const subjects = await Subject.find(filter).sort({ code: 1 }).lean();
  return res.json({
    success: true,
    count: subjects.length,
    subjects: subjects.map((subject) => ({
      _id: String(subject._id),
      subject_code: subject.code,
      subject_name: subject.name,
      semester: subject.semester,
      section: subject.section,
      department: subject.department,
    })),
  });
});

studentRouter.get("/attendance/:student_id", authenticate, requireRole("student"), async (req, res) => {
  if (!assertSelf(req, res)) return;
  const records = await Attendance.find({ studentId: req.user.id }).populate("subjectId", "name code").sort({ date: 1 }).lean();
  const recordIds = records.map((record) => record._id);
  const documents = recordIds.length ? await AttendanceDocument.find({ attendanceId: { $in: recordIds } })
    .select("attendanceId documentType originalName mimeType size note reviewStatus reviewRemarks uploadedByRole createdAt reviewedAt reviewedByRole")
    .sort({ createdAt: 1 }).lean() : [];
  const documentsByAttendance = new Map();
  for (const document of documents) {
    const key = String(document.attendanceId);
    if (!documentsByAttendance.has(key)) documentsByAttendance.set(key, []);
    documentsByAttendance.get(key).push({
      id: String(document._id), documentType: document.documentType,
      originalName: document.originalName, mimeType: document.mimeType,
      size: document.size, note: document.note || "", reviewStatus: document.reviewStatus,
      reviewRemarks: document.reviewRemarks || "", createdAt: document.createdAt,
      reviewedAt: document.reviewedAt || null, reviewedByRole: document.reviewedByRole || null,
    });
  }
  const bySubject = new Map();
  for (const record of records) {
    const subject = record.subjectId;
    if (!subject) continue;
    const key = String(subject.code).toUpperCase();
    if (!bySubject.has(key)) bySubject.set(key, {
      subject_code: subject.code,
      subject_name: subject.name,
      classes_present: 0,
      total_classes: 0,
      percentage: 0,
      history: [],
    });
    const item = bySubject.get(key);
    item.total_classes += 1;
    if (record.status === "present" || record.status === "late") item.classes_present += 1;
    item.history.push({
      id: String(record._id), date: record.date,
      status: record.status[0].toUpperCase() + record.status.slice(1),
      remarks: record.remarks || "",
      documents: documentsByAttendance.get(String(record._id)) || [],
    });
  }
  const attendance = [...bySubject.values()].map((item) => ({
    ...item,
    percentage: item.total_classes ? Number((item.classes_present / item.total_classes * 100).toFixed(2)) : 0,
  }));
  return res.json({ success: true, attendance });
});

studentRouter.get("/marks/:student_id", authenticate, requireRole("student"), async (req, res) => {
  if (!assertSelf(req, res)) return;
  const user = await User.findById(req.user.id).lean();
  const identifiers = [...new Set([user.student_id, user.code, user.usn].filter(Boolean).map((v) => String(v).toUpperCase()))];
  const records = await Marks.find({ student_id: { $in: identifiers } }).lean();
  const subjects = await Subject.find({ code: { $in: records.map((record) => record.subject_code) } }).lean();
  const subjectMap = new Map(subjects.map((subject) => [subject.code, subject]));
  const marksByCode = new Map(records.map((record) => [record.subject_code, record]));
  const marks = records.map((record) => {
    const subject = subjectMap.get(record.subject_code);
    return {
      subject_code: record.subject_code,
      subject_name: subject?.name || record.subject_code,
      type: record.subject_code.endsWith("L") ? "Lab" : "Theory",
      cia1: record.cia1, cia2: record.cia2, cia3: record.cia3,
      internal1: record.internal1, internal2: record.internal2,
      ...calculateAssessmentSummary(record),
    };
  });
  return res.json({ success: true, marks });
});


// Student NOC workflow: students can request an NOC only when an active mentor has been assigned.
studentRouter.get("/noc-requests", authenticate, requireRole("student"), async (req, res) => {
  const [assignment, requests, sessions, certificates] = await Promise.all([
    MentorAssignment.findOne({ studentId: req.user.id, status: "active" }).populate("mentorId", "name code email department").sort({ updatedAt: -1 }).lean(),
    StudentNoc.find({ studentId: req.user.id }).populate("mentorId", "name code").sort({ createdAt: -1 }).limit(100).lean(),
    MentorSession.find({ studentId: req.user.id, status: { $in: ["scheduled", "completed"] } })
      .populate("mentorId", "name code").select("studentId mentorId academicYear agenda sessionAt durationMinutes mode locationOrLink status studentSummary actionItems followUpDate completedAt createdAt")
      .sort({ sessionAt: -1 }).limit(300).lean(),
    StudentCertificate.find({ studentId: req.user.id }).select("-content").sort({ issueDate: -1, createdAt: -1 }).limit(500).lean(),
  ]);
  return res.json({
    mentor: assignment ? { id: String(assignment.mentorId?._id || assignment.mentorId), name: assignment.mentorId?.name || "", code: assignment.mentorId?.code || "", email: assignment.mentorId?.email || "", academicYear: assignment.academicYear } : null,
    requests: requests.map((row) => ({ ...row, id: String(row._id), mentor: row.mentorId })),
    sessions: sessions.map((row) => ({ ...row, id: String(row._id), mentor: row.mentorId })),
    certificates: certificates.map(certificateMetadata),
  });
});

studentRouter.post("/certificates", authenticate, requireRole("student"), async (req, res) => {
  const title = String(req.body?.title || "").trim().slice(0, 180);
  const category = String(req.body?.category || "other").toLowerCase();
  if (!title) return sendValidationError(res, "Certificate title is required.");
  if (!CERTIFICATE_CATEGORIES.has(category)) return sendValidationError(res, "Choose a valid certificate category.");
  const file = decodeCertificateFile(req.body || {});
  const issueDate = req.body?.issueDate ? new Date(req.body.issueDate) : null;
  if (issueDate && Number.isNaN(issueDate.getTime())) return sendValidationError(res, "Certificate issue date is invalid.");
  const assignment = await MentorAssignment.findOne({ studentId: req.user.id, status: "active" }).sort({ updatedAt: -1 }).lean();
  if (!assignment) return res.status(409).json({ error: "You need an active Mentor assignment before submitting a certificate. Please contact the Administrator." });
  const academicYear = assignment.academicYear || "";
  const folderId = await ensureDataFolder("Student Records", [academicYear || "Unassigned Academic Year", "Certificates", req.user.code]);
  const certificate = await StudentCertificate.create({
    folderId, studentId: req.user.id, mentorId: assignment?.mentorId || null,
    mentorAssignmentId: assignment?._id || null, academicYear, title, category,
    issuer: String(req.body?.issuer || "").trim().slice(0, 180), issueDate,
    description: String(req.body?.description || "").trim().slice(0, 2000), ...file,
    uploadedBy: req.user.id, uploadedByRole: "student", reviewStatus: "pending",
  });
  return res.status(201).json({ success: true, message: "Certificate submitted for mentor review.", certificate: certificateMetadata(certificate) });
});

studentRouter.get("/certificates/:id/download", authenticate, requireRole("student"), async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(String(req.params.id || ""))) return sendValidationError(res, "Certificate ID is invalid.");
  const certificate = await StudentCertificate.findOne({ _id: req.params.id, studentId: req.user.id }).select("+content");
  if (!certificate) return res.status(404).json({ error: "Certificate not found." });
  const safeName = certificate.originalName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\\r\n]/g, "_");
  const encodedName = encodeURIComponent(certificate.originalName).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  res.set({ "Content-Type": certificate.mimeType, "Content-Length": String(certificate.size), "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" });
  return res.send(certificate.content);
});

studentRouter.post("/noc-requests", authenticate, requireRole("student"), async (req, res) => {
  const purpose = String(req.body?.purpose || "").trim().slice(0, 180);
  const details = String(req.body?.details || "").trim().slice(0, 3000);
  if (!purpose) return res.status(400).json({ error: "Enter the purpose for the NOC." });
  const assignment = await MentorAssignment.findOne({ studentId: req.user.id, status: "active" }).sort({ updatedAt: -1 }).lean();
  if (!assignment) return res.status(409).json({ error: "No active mentor is assigned to your account. Contact the administrator." });
  const existing = await StudentNoc.findOne({ studentId: req.user.id, status: "pending" }).lean();
  if (existing) return res.status(409).json({ error: "You already have an NOC request pending with your mentor." });
  const folderId = await ensureDataFolder("Student Services", ["NOC Requests", assignment.academicYear, req.user.code]);
  const record = await StudentNoc.create({
    folderId, studentId: req.user.id, mentorId: assignment.mentorId, mentorAssignmentId: assignment._id,
    academicYear: assignment.academicYear, purpose, details, status: "pending", requestedAt: new Date(),
  });
  return res.status(201).json({ success: true, message: "NOC request sent to your assigned mentor.", request: { id: String(record._id), status: record.status, purpose: record.purpose, academicYear: record.academicYear } });
});
