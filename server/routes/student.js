import { Router } from "express";
import { rateLimit } from "../middleware/rateLimit.js";
import { User } from "../models/User.js";
import { Subject } from "../models/Subject.js";
import { Enrollment } from "../models/Enrollment.js";
import { Attendance } from "../models/Attendance.js";
import { Marks } from "../models/Marks.js";
import { AttendanceDocument } from "../models/AttendanceDocument.js";
import { calculateAssessmentSummary } from "../utils/assessment.js";
import { authenticate, requireRole, safeUser, setSessionCookie, signSession } from "../middleware/auth.js";
import { authenticateCredentials } from "./auth.js";

export const studentRouter = Router();
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
