import { Router } from "express";
import { authenticate, isObjectId, requireRole, sendValidationError } from "../middleware/auth.js";
import { Attendance } from "../models/Attendance.js";
import { AttendanceDocument } from "../models/AttendanceDocument.js";
import { Marks } from "../models/Marks.js";
import { Enrollment } from "../models/Enrollment.js";
import { ClassSection } from "../models/ClassSection.js";
import { Subject } from "../models/Subject.js";
import { FacultyAssignment } from "../models/FacultyAssignment.js";
import { calculateAssessmentSummary } from "../utils/assessment.js";

export const reportsRouter = Router();

function isoDate(value) {
  const text = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === text;
}

async function assertReportScope(req, res, classId, subjectId) {
  if (req.user.role === "admin") return true;
  if (req.user.role !== "faculty") {
    res.status(403).json({ error: "Only administrators and faculty can download class reports." });
    return false;
  }
  const assigned = await FacultyAssignment.exists({ facultyId: req.user.id, classId, subjectId });
  if (!assigned) {
    res.status(403).json({ error: "You can download reports only for your assigned class and subject." });
    return false;
  }
  return true;
}

reportsRouter.get("/reports/attendance", authenticate, requireRole("admin", "faculty"), async (req, res) => {
  const { classId, subjectId, from, to } = req.query;
  if (!isObjectId(classId) || !isObjectId(subjectId)) return sendValidationError(res, "Select a valid class and subject.");
  if (from && !isoDate(from)) return sendValidationError(res, "from must use YYYY-MM-DD.");
  if (to && !isoDate(to)) return sendValidationError(res, "to must use YYYY-MM-DD.");
  if (from && to && from > to) return sendValidationError(res, "The start date must not be after the end date.");
  if (!(await assertReportScope(req, res, classId, subjectId))) return;
  const filter = { classId, subjectId };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  const records = await Attendance.find(filter)
    .populate("studentId", "name code usn")
    .populate("facultyId", "name code")
    .populate("classId", "name department semester section academicYear")
    .populate("subjectId", "name code")
    .sort({ date: 1, studentId: 1 }).limit(20000).lean();
  const docRows = records.length ? await AttendanceDocument.find({ attendanceId: { $in: records.map((row) => row._id) } })
    .select("attendanceId documentType originalName reviewStatus reviewRemarks reviewedByRole createdAt").lean() : [];
  const docsByAttendance = new Map();
  for (const document of docRows) {
    const key = String(document.attendanceId);
    const values = docsByAttendance.get(key) || [];
    values.push(`${document.documentType}: ${document.originalName} (${document.reviewStatus}${document.reviewedByRole ? ` by ${document.reviewedByRole}` : ""})`);
    docsByAttendance.set(key, values);
  }
  return res.json({ count: records.length, records: records.map((row) => ({
    date: row.date,
    studentId: row.studentId?.usn || row.studentId?.code || "",
    studentName: row.studentId?.name || "",
    className: row.classId?.name || "",
    department: row.classId?.department || "",
    semester: row.classId?.semester ?? "",
    section: row.classId?.section || "",
    academicYear: row.classId?.academicYear || "",
    subjectCode: row.subjectId?.code || "",
    subjectName: row.subjectId?.name || "",
    status: row.status,
    remarks: row.remarks || "",
    supportingDocuments: docsByAttendance.get(String(row._id))?.join(" | ") || "",
    markedBy: row.facultyId?.name || "",
  })) });
});

reportsRouter.get("/reports/marks", authenticate, requireRole("admin", "faculty"), async (req, res) => {
  const { classId, subjectId } = req.query;
  if (!isObjectId(classId) || !isObjectId(subjectId)) return sendValidationError(res, "Select a valid class and subject.");
  if (!(await assertReportScope(req, res, classId, subjectId))) return;
  const [classRecord, subject, enrollments] = await Promise.all([
    ClassSection.findById(classId).lean(),
    Subject.findById(subjectId).lean(),
    Enrollment.find({ classId }).populate("studentId", "name code usn role department program semester section").lean(),
  ]);
  if (!classRecord || !subject) return res.status(404).json({ error: "Class or subject not found." });
  const students = enrollments.map((row) => row.studentId).filter((student) => student?.role === "student");
  const keys = [...new Set(students.flatMap((student) => [student.code, student.student_id, student.usn].filter(Boolean).map((v) => String(v).toUpperCase())))];
  const markRows = keys.length ? await Marks.find({ subject_code: subject.code.toUpperCase(), student_id: { $in: keys } }).lean() : [];
  const marksMap = new Map(markRows.map((row) => [String(row.student_id).toUpperCase(), row]));
  return res.json({ count: students.length, records: students.map((student) => {
    const ids = [student.usn, student.student_id, student.code].filter(Boolean).map((v) => String(v).toUpperCase());
    const marks = ids.map((id) => marksMap.get(id)).find(Boolean) || {};
    const summary = calculateAssessmentSummary(marks);
    return {
      studentId: student.usn || student.student_id || student.code,
      studentName: student.name,
      department: classRecord.department,
      academicYear: classRecord.academicYear,
      semester: classRecord.semester,
      section: classRecord.section,
      className: classRecord.name,
      subjectCode: subject.code,
      subjectName: subject.name,
      cia1: marks.cia1 ?? "",
      cia2: marks.cia2 ?? "",
      cia3: marks.cia3 ?? "",
      ciaAverage: summary.ciaAverage ?? "",
      internal1: marks.internal1 ?? "",
      internal2: marks.internal2 ?? "",
      internalAverage: summary.internalAverage ?? "",
      ciaCompleted: summary.ciaCount,
      internalCompleted: summary.internalCount,
    };
  }) });
});
