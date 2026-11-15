import { Router } from "express";
import { Enrollment } from "../models/Enrollment.js";
import { assertFacultyCanAccessClass } from "../access.js";
import { isObjectId, requireRole, sendValidationError } from "../middleware/auth.js";

export const classesRouter = Router();

classesRouter.get("/classes/:classId/students", requireRole("faculty", "admin"), async (req, res) => {
  const { classId } = req.params;
  if (!isObjectId(classId)) {
    return sendValidationError(res, "classId must be a valid id.");
  }

  const allowed = await assertFacultyCanAccessClass(req, res, classId);
  if (!allowed) return;

  const enrollments = await Enrollment.find({ classId }).populate("studentId", "name usn code role").lean();

  res.json({
    classId,
    students: enrollments
      .filter((row) => row.studentId)
      .map((row) => ({
        id: String(row.studentId._id),
        name: row.studentId.name,
        usn: row.studentId.usn || row.studentId.code,
        code: row.studentId.code,
      })),
  });
});
