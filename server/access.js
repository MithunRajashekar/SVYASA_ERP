import { FacultyAssignment } from "./models/FacultyAssignment.js";
import { Enrollment } from "./models/Enrollment.js";

export async function getFacultyAssignment(facultyId, classId, subjectId) {
  return FacultyAssignment.findOne({ facultyId, classId, subjectId }).lean();
}

export async function facultyAssignedToClass(facultyId, classId) {
  return Boolean(await FacultyAssignment.findOne({ facultyId, classId }).lean());
}

export async function assertFacultyCanAccessClassSubject(req, res, facultyId, classId, subjectId) {
  if (req.user.role === "admin") return true;
  if (req.user.role !== "faculty" || req.user.id !== String(facultyId)) {
    res.status(403).json({ error: "Faculty can only access their own assigned classes." });
    return false;
  }
  const assignment = await getFacultyAssignment(facultyId, classId, subjectId);
  if (!assignment) {
    res.status(403).json({ error: "This class and subject are not assigned to your account." });
    return false;
  }
  return true;
}

export async function assertFacultyCanAccessClass(req, res, classId) {
  if (req.user.role === "admin") return true;
  if (req.user.role !== "faculty") {
    res.status(403).json({ error: "Only assigned faculty or administrators can access class rosters." });
    return false;
  }
  if (!(await facultyAssignedToClass(req.user.id, classId))) {
    res.status(403).json({ error: "This class is not assigned to your account." });
    return false;
  }
  return true;
}

export async function studentEnrolledInClass(studentId, classId) {
  return Boolean(await Enrollment.findOne({ studentId, classId }).lean());
}
