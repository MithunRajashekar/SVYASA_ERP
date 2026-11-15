
import { Router } from "express";
import { Marks } from "../models/Marks.js";
import { ASSESSMENT_FIELDS, calculateAssessmentSummary, mergeAssessmentValues, normalizeAssessmentScore } from "../utils/assessment.js";
import { User } from "../models/User.js";
import { Subject } from "../models/Subject.js";
import { ClassSection } from "../models/ClassSection.js";
import { ensureDataFolder, teachingFolderSegments } from "../utils/autoFolders.js";
import { Enrollment } from "../models/Enrollment.js";
import {
  assertFacultyCanAccessClassSubject,
  studentEnrolledInClass,
} from "../access.js";
import {
  isObjectId,
  requireRole,
  sendValidationError,
} from "../middleware/auth.js";

export const marksRouter = Router();


// Administrator-only institution-wide marks register. Faculty continue to use
// the class-scoped /marks endpoint below; students use their own /student route.
marksRouter.get("/hr/marks", requireRole("admin"), async (req, res, next) => {
  try {
    const filter = {};
    const subjectCode = String(req.query.subjectCode || "").trim().toUpperCase();
    const studentId = String(req.query.studentId || "").trim().toUpperCase();
    if (subjectCode) filter.subject_code = subjectCode;
    if (studentId) filter.student_id = studentId;
    const rows = await Marks.find(filter).sort({ subject_code: 1, student_id: 1 }).limit(2000).lean();
    const studentKeys = [...new Set(rows.map((row) => row.student_id).filter(Boolean))];
    const subjectCodes = [...new Set(rows.map((row) => row.subject_code).filter(Boolean))];
    const [students, subjects] = await Promise.all([
      User.find({ role: "student", $or: [{ code: { $in: studentKeys } }, { usn: { $in: studentKeys } }] }).select("name code usn department program semester section").lean(),
      Subject.find({ code: { $in: subjectCodes } }).select("code name department semester").lean(),
    ]);
    const studentMap = new Map(students.flatMap((student) => [[String(student.code).toUpperCase(), student], [String(student.usn || "").toUpperCase(), student]]));
    const subjectMap = new Map(subjects.map((subject) => [String(subject.code).toUpperCase(), subject]));
    return res.json({ count: rows.length, records: rows.map((row) => {
      const student = studentMap.get(String(row.student_id).toUpperCase());
      const subject = subjectMap.get(String(row.subject_code).toUpperCase());
      return {
        ...row,
        ...calculateAssessmentSummary(row),
        studentName: student?.name || "Unmatched student",
        studentCode: student?.usn || student?.code || row.student_id,
        department: student?.department || subject?.department || "",
        subjectName: subject?.name || row.subject_code,
      };
    }) });
  } catch (error) { next(error); }
});

marksRouter.put("/hr/marks/:id", requireRole("admin"), async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return sendValidationError(res, "Marks record ID is invalid.");
    const record = await Marks.findById(req.params.id);
    if (!record) return res.status(404).json({ error: "Marks record not found." });
    let values;
    try {
      values = mergeAssessmentValues(record, req.body || {});
    } catch (error) {
      return sendValidationError(res, error.message);
    }
    record.set(values);
    await record.save();
    return res.json({ success: true, record: record.toObject() });
  } catch (error) { next(error); }
});

// GET marks for the students enrolled in the selected class.
marksRouter.get(
  "/marks",
  requireRole("faculty", "admin"),
  async (req, res, next) => {
    try {
      const { classId, subjectId } = req.query;

      if (!isObjectId(classId) || !isObjectId(subjectId)) {
        return sendValidationError(
          res,
          "Valid classId and subjectId are required."
        );
      }

      const allowed = await assertFacultyCanAccessClassSubject(
        req, res, req.user.id, classId, subjectId
      );
      if (!allowed) return;

      const subject = await Subject.findById(subjectId).lean();

      if (!subject) {
        return res.status(404).json({ error: "Subject not found." });
      }

      const enrollments = await Enrollment.find({ classId })
        .populate("studentId", "name usn code role")
        .lean();

      const students = enrollments
        .filter((item) => item.studentId?.role === "student")
        .map((item) => {
          const user = item.studentId;
          return {
            id: String(user._id),
            name: user.name,
            usn: user.usn || user.code || "",
            code: user.code || "",
          };
        });

      const keys = [
        ...new Set(students.flatMap((student) =>
          [student.usn, student.code].filter(Boolean)
        )),
      ];

      const rows = await Marks.find({
        subject_code: subject.code,
        student_id: { $in: keys },
      }).lean();

      const marksMap = new Map(
        rows.map((row) => [row.student_id, row])
      );

      return res.json({
        subject: {
          id: String(subject._id),
          code: subject.code,
          name: subject.name,
        },
        students: students.map((student) => ({
          ...student,
          marks: (() => {
            const existing = marksMap.get(student.usn) || marksMap.get(student.code) || null;
            return existing ? { ...existing, ...calculateAssessmentSummary(existing) } : {};
          })(),
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST new marks or update existing marks.
marksRouter.post(
  "/marks",
  requireRole("faculty", "admin"),
  async (req, res, next) => {
    try {
      const { classId, subjectId, records } = req.body || {};

      if (!isObjectId(classId) || !isObjectId(subjectId)) {
        return sendValidationError(
          res,
          "Valid classId and subjectId are required."
        );
      }

      if (!Array.isArray(records) || records.length === 0) {
        return sendValidationError(
          res,
          "records must be a non-empty array."
        );
      }

      const allowed = await assertFacultyCanAccessClassSubject(
        req, res, req.user.id, classId, subjectId
      );
      if (!allowed) return;

      const [subject, classRecord] = await Promise.all([
        Subject.findById(subjectId).lean(),
        ClassSection.findById(classId).lean(),
      ]);

      if (!subject || !classRecord) {
        return res.status(404).json({ error: "Class or subject not found." });
      }
      const folderId = await ensureDataFolder("Academic Records", teachingFolderSegments("Marks", classRecord, subject.code));

      const saved = [];
      const errors = [];

      for (const [index, record] of records.entries()) {
        try {
          if (!isObjectId(record.studentId)) {
            throw new Error("Invalid studentId.");
          }

          if (!(await studentEnrolledInClass(record.studentId, classId))) {
            throw new Error("Student is not enrolled in this class.");
          }

          const user = await User.findById(record.studentId)
            .select("code usn role")
            .lean();

          if (!user || user.role !== "student") {
            throw new Error("Student account not found.");
          }

          const studentKey = String(user.usn || user.code || "").trim();

          if (!studentKey) {
            throw new Error("Student USN/code is missing.");
          }

          const existing = await Marks.findOne({ student_id: studentKey, subject_code: subject.code }).lean();
          const incoming = {};
          for (const field of ASSESSMENT_FIELDS) {
            if (Object.hasOwn(record, field)) incoming[field] = normalizeAssessmentScore(record[field], field);
          }
          const values = mergeAssessmentValues(existing || {}, incoming);

          const doc = await Marks.findOneAndUpdate(
            {
              student_id: studentKey,
              subject_code: subject.code,
            },
            {
              $set: {
                ...values,
                student_id: studentKey,
                subject_code: subject.code,
                folderId,
              },
            },
            {
              returnDocument: "after",
              upsert: true,
              runValidators: true,
              setDefaultsOnInsert: true,
            }
          ).lean();

          saved.push({
            studentId: String(user._id),
            student_id: studentKey,
            subject_code: subject.code,
            ...Object.fromEntries(ASSESSMENT_FIELDS.map((field) => [field, doc[field]])),
            ...calculateAssessmentSummary(doc),
          });
        } catch (error) {
          errors.push({
            index,
            studentId: record.studentId,
            error: error.message || "Could not save marks.",
          });
        }
      }

      if (saved.length === 0) {
        return res.status(400).json({
          error: "No marks were saved.",
          details: errors,
        });
      }

      return res.status(errors.length ? 207 : 200).json({
        message: errors.length
          ? "Marks saved with some row errors."
          : "Marks saved successfully.",
        records: saved,
        details: errors.length ? errors : undefined,
      });
    } catch (error) {
      next(error);
    }
  }
);
