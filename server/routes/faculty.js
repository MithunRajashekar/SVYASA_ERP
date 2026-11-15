import { Router } from "express";
import { FacultyAssignment } from "../models/FacultyAssignment.js";
import { isObjectId, requireRole, sendValidationError } from "../middleware/auth.js";

export const facultyRouter = Router();

facultyRouter.get("/faculty/:facultyId/classes", requireRole("faculty", "admin"), async (req, res) => {
  const { facultyId } = req.params;
  if (!isObjectId(facultyId)) {
    return sendValidationError(res, "facultyId must be a valid id.");
  }

  if (req.user.role === "faculty" && req.user.id !== facultyId) {
    return res.status(403).json({ error: "Faculty can only list their own assigned classes." });
  }

  const assignments = await FacultyAssignment.find({ facultyId })
    .populate("classId")
    .populate("subjectId")
    .populate("facultyId", "name code role")
    .lean();

  res.json({
    facultyId,
    classes: assignments
      .filter((row) => row.classId && row.subjectId)
      .map((row) => ({
        assignmentId: String(row._id),
        facultyId: String(row.facultyId._id || row.facultyId),
        facultyName: row.facultyId.name,
        classId: String(row.classId._id),
        subjectId: String(row.subjectId._id),
        department: row.classId.department,
        semester: row.classId.semester,
        academicYear: row.classId.academicYear,
        section: row.classId.section,
        className: row.classId.name,
        subject: row.subjectId.name,
        subjectCode: row.subjectId.code,
        slot: row.slot || "",
      })),
  });
});
