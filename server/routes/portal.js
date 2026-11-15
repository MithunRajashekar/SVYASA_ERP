import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { ClassSection } from "../models/ClassSection.js";
import { Subject } from "../models/Subject.js";
import { FacultyAssignment } from "../models/FacultyAssignment.js";
import { Attendance } from "../models/Attendance.js";
import { Marks } from "../models/Marks.js";
import { ModuleRecord } from "../models/ModuleRecord.js";
import { Event } from "../models/Event.js";
import { Enrollment } from "../models/Enrollment.js";

export const portalRouter = Router();

portalRouter.get("/portal/summary", authenticate, async (req, res) => {
  const user = req.user;
  if (user.role === "admin") {
    const [students, faculty, admins, classes, subjects, attendance, marks, eventsPending, approvalsPending, folders] = await Promise.all([
      User.countDocuments({ role: "student", isActive: true }), User.countDocuments({ role: "faculty", isActive: true }),
      User.countDocuments({ role: "admin", isActive: true }), ClassSection.countDocuments({}), Subject.countDocuments({}),
      Attendance.countDocuments({}), Marks.countDocuments({}), Event.countDocuments({ permissionStatus: "Pending" }),
      ModuleRecord.countDocuments({ status: { $in: ["Submitted", "Pending"] } }),
      (await import("../models/DataFolder.js")).DataFolder.countDocuments({}),
    ]);
    return res.json({ success: true, role: user.role, stats: { students, faculty, admins, classes, subjects, attendance, marks, eventsPending, approvalsPending, folders } });
  }

  if (user.role === "faculty") {
    const allocations = await FacultyAssignment.find({ facultyId: user.id }).select("classId subjectId").lean();
    const assignedPairs = allocations.map((row) => ({ classId: row.classId, subjectId: row.subjectId }));
    const submissionScope = assignedPairs.length ? { $or: assignedPairs } : { _id: null };
    const [classes, lessonPlans, assessments, pendingSubmissions, attendance, events] = await Promise.all([
      allocations.length,
      ModuleRecord.countDocuments({ module: "lesson-plans", createdBy: user.id }),
      ModuleRecord.countDocuments({ module: "assessment", createdBy: user.id }),
      ModuleRecord.countDocuments({ module: "assignment-submissions", status: "Submitted", ...submissionScope }),
      Attendance.countDocuments({ facultyId: user.id }),
      Event.countDocuments({ createdBy: user.id }),
    ]);
    return res.json({ success: true, role: user.role, stats: { classes, lessonPlans, assessments, pendingSubmissions, attendance, events } });
  }

  const enrolledClassIds = await Enrollment.find({ studentId: user.id }).distinct("classId");
  const academicVisibility = [
    { visibility: "university" },
    ...(user.department ? [{ visibility: "department", department: user.department }] : []),
    ...(enrolledClassIds.length ? [{ visibility: "class", classId: { $in: enrolledClassIds } }] : []),
  ];
  const [attendance, marks, upcomingAssignments, notices, placements] = await Promise.all([
    Attendance.countDocuments({ studentId: user.id }),
    Marks.countDocuments({ student_id: { $in: [user.code, user.student_id, user.usn].filter(Boolean).map((v) => String(v).toUpperCase()) } }),
    ModuleRecord.countDocuments({ module: "assignments", status: { $in: ["Published", "Approved", "Open"] }, $or: academicVisibility }),
    ModuleRecord.countDocuments({ module: "notices", status: { $in: ["Published", "Approved"] }, $or: academicVisibility }),
    ModuleRecord.countDocuments({ module: "placements", status: { $in: ["Published", "Approved", "Open", "Active"] }, $or: academicVisibility }),
  ]);
  return res.json({ success: true, role: user.role, stats: { attendanceEntries: attendance, markSheets: marks, assignments: upcomingAssignments, notices, placements } });
});
