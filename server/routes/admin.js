import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { ModuleRecord } from "../models/ModuleRecord.js";
import { Event } from "../models/Event.js";
import { ClassSection } from "../models/ClassSection.js";
import { Subject } from "../models/Subject.js";
import { Enrollment } from "../models/Enrollment.js";
import { FacultyAssignment } from "../models/FacultyAssignment.js";
import { User } from "../models/User.js";
import { Attendance } from "../models/Attendance.js";
import { Marks } from "../models/Marks.js";
import { DataFolder } from "../models/DataFolder.js";
import { authenticate, requireRole, isObjectId, sendValidationError, safeUser } from "../middleware/auth.js";
import { ensureDataFolder, classFolderSegments, teachingFolderSegments, userFolderId } from "../utils/autoFolders.js";

export const adminRouter = Router();
adminRouter.use("/admin", authenticate, requireRole("admin"));

adminRouter.get("/admin/users", async (_req, res) => {
  const users = await User.find({}).sort({ role: 1, name: 1 }).lean();
  res.json({ users: users.map(safeUser) });
});


adminRouter.get("/admin/overview", async (_req, res) => {
  const [users, students, faculty, classes, subjects, pendingEvents, pendingModuleRecords, attendance, marks] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: "student", isActive: true }),
    User.countDocuments({ role: "faculty", isActive: true }),
    ClassSection.countDocuments({}),
    Subject.countDocuments({}),
    Event.countDocuments({ permissionStatus: "Pending" }),
    ModuleRecord.countDocuments({ status: { $in: ["Submitted", "Pending"] } }),
    Attendance.countDocuments({}),
    Marks.countDocuments({}),
  ]);
  return res.json({ success: true, stats: { users, students, faculty, classes, subjects, pendingEvents, pendingModuleRecords, attendance, marks } });
});

adminRouter.put("/admin/users/:id", async (req, res) => {
  if (!isObjectId(req.params.id)) return sendValidationError(res, "User ID is invalid.");
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  const allowed = ["name", "email", "phone", "department", "semester", "section", "program", "usn", "isActive"];
  const changes = {};
  if (String(req.params.id) === req.user.id && req.body?.isActive === false) {
    return res.status(400).json({ error: "You cannot deactivate your own administrator account." });
  }
  for (const key of allowed) {
    if (!Object.hasOwn(req.body || {}, key)) continue;
    const value = req.body[key];
    if (key === "isActive") changes[key] = Boolean(value);
    else if (key === "semester") changes[key] = value === "" || value === null ? null : Number(value);
    else changes[key] = String(value ?? "").trim().slice(0, key === "email" ? 254 : key === "phone" ? 30 : 120);
  }
  if (changes.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(changes.email)) return sendValidationError(res, "Email address is invalid.");
  if (changes.email && await User.exists({ _id: { $ne: user._id }, email: changes.email.toLowerCase() })) return res.status(409).json({ error: "That email address is already assigned to another account." });
  if (changes.usn) {
    changes.usn = changes.usn.toUpperCase();
    if (await User.exists({ _id: { $ne: user._id }, usn: changes.usn })) return res.status(409).json({ error: "That USN is already assigned to another account." });
  }
  if (changes.email) changes.email = changes.email.toLowerCase();
  if (changes.semester !== undefined && changes.semester !== null && (!Number.isInteger(changes.semester) || changes.semester < 1 || changes.semester > 12)) return sendValidationError(res, "Semester must be a whole number from 1 to 12.");
  if (user.role === "admin" && changes.isActive === false) {
    const activeAdmins = await User.countDocuments({ role: "admin", isActive: true });
    if (activeAdmins <= 1) return res.status(409).json({ error: "The last active administrator cannot be deactivated. Create another administrator first." });
  }
  Object.assign(user, changes);
  user.folderId = await userFolderId(user.toObject());
  await user.save();
  return res.json({ success: true, user: safeUser(user.toObject()) });
});

adminRouter.post("/admin/users/:id/reset-password", async (req, res) => {
  if (!isObjectId(req.params.id)) return sendValidationError(res, "User ID is invalid.");
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  const temporaryPassword = crypto.randomBytes(18).toString("base64url");
  user.passwordHash = await bcrypt.hash(temporaryPassword, 12);
  await user.save();
  return res.json({ success: true, userId: user.code, temporaryPassword, message: "Password reset. Share this temporary password privately and ask the user to change it." });
});

adminRouter.get("/admin/assignments", async (_req, res) => {
  const assignments = await FacultyAssignment.find({}).populate("facultyId", "name code").populate("classId").populate("subjectId").sort({ createdAt: -1 }).lean();
  return res.json({ assignments });
});

adminRouter.get("/admin/enrollments", async (_req, res) => {
  const enrollments = await Enrollment.find({}).populate("studentId", "name code usn").populate("classId").sort({ createdAt: -1 }).lean();
  return res.json({ enrollments });
});

adminRouter.get("/admin/approvals", async (_req, res) => {
  const [events, records] = await Promise.all([
    Event.find({ permissionStatus: "Pending" }).populate("createdBy", "name code").sort({ createdAt: -1 }).limit(100).lean(),
    ModuleRecord.find({ status: { $in: ["Submitted", "Pending"] } }).populate("createdBy", "name code role").populate("targetUserId", "name code").sort({ createdAt: -1 }).limit(200).lean(),
  ]);
  return res.json({ success: true, events, records });
});

// Folder administration is intentionally read-only. The API creates and reuses
// folders automatically when records are entered; users cannot manually file them.
adminRouter.get("/admin/data-folders", async (_req, res) => {
  const folders = await DataFolder.find({}).sort({ path: 1 }).lean();
  res.json({ count: folders.length, folders });
});

adminRouter.get("/admin/classes", async (_req, res) => res.json({ classes: await ClassSection.find({}).sort({ department: 1, semester: 1, section: 1 }).lean() }));
adminRouter.post("/admin/classes", async (req, res) => {
  const body = req.body || {};
  if (!body.department || !body.semester || !body.academicYear || !body.section || !body.name) return sendValidationError(res, "department, semester, academicYear, section and name are required.");
  const classData = { department: String(body.department).trim(), semester: Number(body.semester), academicYear: String(body.academicYear).trim(), section: String(body.section).trim(), name: String(body.name).trim() };
  classData.folderId = await ensureDataFolder("Academic Records", classFolderSegments(classData));
  const record = await ClassSection.create(classData);
  res.status(201).json({ class: record });
});
adminRouter.put("/admin/classes/:id", async (req, res) => {
  if (!isObjectId(req.params.id)) return sendValidationError(res, "Class ID is invalid.");
  const allowed = ["department", "semester", "academicYear", "section", "name"];
  const changes = Object.fromEntries(allowed.filter((key) => Object.hasOwn(req.body || {}, key)).map((key) => [key, key === "semester" ? Number(req.body[key]) : String(req.body[key]).trim()]));
  const current = await ClassSection.findById(req.params.id);
  if (!current) return res.status(404).json({ error: "Class not found." });
  const currentData = typeof current.toObject === "function" ? current.toObject() : current;
  const nextData = { ...currentData, ...changes };
  changes.folderId = await ensureDataFolder("Academic Records", classFolderSegments(nextData));
  const record = await ClassSection.findByIdAndUpdate(req.params.id, changes, { returnDocument: "after", runValidators: true });
  res.json({ class: record });
});
adminRouter.delete("/admin/classes/:id", async (req, res) => {
  if (!isObjectId(req.params.id)) return sendValidationError(res, "Class ID is invalid.");
  if (await Enrollment.exists({ classId: req.params.id }) || await FacultyAssignment.exists({ classId: req.params.id }) || await Attendance.exists({ classId: req.params.id })) {
    return res.status(409).json({ error: "Remove dependent enrollments, assignments and attendance records before deleting this class." });
  }
  const record = await ClassSection.findByIdAndDelete(req.params.id);
  if (!record) return res.status(404).json({ error: "Class not found." });
  res.json({ success: true });
});

adminRouter.get("/admin/subjects", async (_req, res) => res.json({ subjects: await Subject.find({}).sort({ code: 1 }).lean() }));
adminRouter.post("/admin/subjects", async (req, res) => {
  const body = req.body || {};
  if (!body.code || !body.name) return sendValidationError(res, "Subject code and name are required.");
  const subjectData = { code: String(body.code).trim().toUpperCase(), name: String(body.name).trim(), department: String(body.department || "").trim(), semester: body.semester ? Number(body.semester) : null, section: String(body.section || "").trim(), facultyId: body.facultyId || null };
  subjectData.folderId = await ensureDataFolder("Academic Records", ["Subjects", subjectData.department || "General Department", subjectData.semester ? `Semester ${subjectData.semester}` : "Unassigned Semester", subjectData.code]);
  const subject = await Subject.create(subjectData);
  res.status(201).json({ subject });
});
adminRouter.put("/admin/subjects/:id", async (req, res) => {
  if (!isObjectId(req.params.id)) return sendValidationError(res, "Subject ID is invalid.");
  const allowed = ["code", "name", "department", "semester", "section", "facultyId"];
  const changes = Object.fromEntries(allowed.filter((key) => Object.hasOwn(req.body || {}, key)).map((key) => [key, key === "semester" ? Number(req.body[key]) : req.body[key]]));
  const current = await Subject.findById(req.params.id);
  if (!current) return res.status(404).json({ error: "Subject not found." });
  if (changes.code && String(changes.code).trim().toUpperCase() !== current.code && await Marks.exists({ subject_code: current.code })) {
    return res.status(409).json({ error: "Subject code cannot change after marks have been recorded." });
  }
  const currentData = typeof current.toObject === "function" ? current.toObject() : current;
  const nextData = { ...currentData, ...changes };
  const code = String(nextData.code || "").trim().toUpperCase();
  changes.folderId = await ensureDataFolder("Academic Records", ["Subjects", nextData.department || "General Department", nextData.semester ? `Semester ${nextData.semester}` : "Unassigned Semester", code]);
  const subject = await Subject.findByIdAndUpdate(req.params.id, changes, { returnDocument: "after", runValidators: true });
  if (!subject) return res.status(404).json({ error: "Subject not found." });
  res.json({ subject });
});
adminRouter.delete("/admin/subjects/:id", async (req, res) => {
  if (!isObjectId(req.params.id)) return sendValidationError(res, "Subject ID is invalid.");
  const subject = await Subject.findById(req.params.id);
  if (!subject) return res.status(404).json({ error: "Subject not found." });
  if (await Attendance.exists({ subjectId: subject._id }) || await Marks.exists({ subject_code: subject.code })) {
    return res.status(409).json({ error: "Subject cannot be deleted while attendance or marks records depend on it." });
  }
  await Subject.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

adminRouter.post("/admin/assignments", async (req, res) => {
  const { facultyId, classId, subjectId, slot = "" } = req.body || {};
  if (![facultyId, classId, subjectId].every(isObjectId)) return sendValidationError(res, "Valid facultyId, classId and subjectId are required.");
  const [faculty, classRecord, subject] = await Promise.all([
    User.findOne({ _id: facultyId, role: "faculty", isActive: true }),
    ClassSection.findById(classId).lean(),
    Subject.findById(subjectId).lean(),
  ]);
  if (!faculty || !classRecord || !subject) return sendValidationError(res, "Faculty, class or subject was not found.");
  const normalize = (value) => String(value || "").trim().toLowerCase();
  if (faculty.department && normalize(faculty.department) !== normalize(classRecord.department)) return sendValidationError(res, "Faculty department must match the selected class department.");
  if (subject.department && normalize(subject.department) !== normalize(classRecord.department)) return sendValidationError(res, "Subject department must match the selected class department.");
  if (subject.semester !== null && subject.semester !== undefined && Number(subject.semester) !== Number(classRecord.semester)) return sendValidationError(res, "Subject semester must match the selected class semester.");
  if (subject.section && normalize(subject.section) !== normalize(classRecord.section)) return sendValidationError(res, "Subject section must match the selected class section.");
  const folderId = await ensureDataFolder("Academic Records", teachingFolderSegments("Faculty Assignments", classRecord, subject.code));
  const assignment = await FacultyAssignment.findOneAndUpdate({ facultyId, classId, subjectId }, { facultyId, classId, subjectId, slot: String(slot).slice(0, 40), folderId }, { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true });
  res.status(201).json({ assignment });
});

adminRouter.post("/admin/enrollments", async (req, res) => {
  const { studentId, classId } = req.body || {};
  if (![studentId, classId].every(isObjectId)) return sendValidationError(res, "Valid studentId and classId are required.");
  const [student, classRecord] = await Promise.all([
    User.findOne({ _id: studentId, role: "student", isActive: true }),
    ClassSection.findById(classId).lean(),
  ]);
  if (!student || !classRecord) return sendValidationError(res, "Student or class was not found.");
  const normalize = (value) => String(value || "").trim().toLowerCase();
  if (student.department && normalize(student.department) !== normalize(classRecord.department)) return sendValidationError(res, "Student department does not match the selected class.");
  if (student.semester !== null && student.semester !== undefined && Number(student.semester) !== Number(classRecord.semester)) return sendValidationError(res, "Student semester does not match the selected class.");
  if (student.section && normalize(student.section) !== normalize(classRecord.section)) return sendValidationError(res, "Student section does not match the selected class.");
  const folderId = await ensureDataFolder("Academic Records", teachingFolderSegments("Enrollments", classRecord));
  const enrollment = await Enrollment.findOneAndUpdate({ studentId, classId }, { studentId, classId, folderId }, { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true });
  res.status(201).json({ enrollment });
});


adminRouter.delete("/admin/assignments/:id", async (req, res) => {
  if (!isObjectId(req.params.id)) return sendValidationError(res, "Assignment ID is invalid.");
  const assignment = await FacultyAssignment.findById(req.params.id).populate("subjectId", "code");
  if (!assignment) return res.status(404).json({ error: "Faculty assignment not found." });
  if (await Attendance.exists({ facultyId: assignment.facultyId, classId: assignment.classId, subjectId: assignment.subjectId?._id || assignment.subjectId })) {
    return res.status(409).json({ error: "This allocation has attendance history. Keep it for audit continuity." });
  }
  if (assignment.subjectId?.code && await Marks.exists({ subject_code: assignment.subjectId.code })) {
    return res.status(409).json({ error: "This subject has assessment marks on record. Keep the allocation for audit continuity." });
  }
  await FacultyAssignment.findByIdAndDelete(req.params.id);
  return res.json({ success: true });
});

adminRouter.delete("/admin/enrollments/:id", async (req, res) => {
  if (!isObjectId(req.params.id)) return sendValidationError(res, "Enrollment ID is invalid.");
  const enrollment = await Enrollment.findById(req.params.id);
  if (!enrollment) return res.status(404).json({ error: "Enrollment not found." });
  if (await Attendance.exists({ studentId: enrollment.studentId, classId: enrollment.classId })) {
    return res.status(409).json({ error: "This enrollment has attendance history. Keep it for audit continuity." });
  }
  await Enrollment.findByIdAndDelete(req.params.id);
  return res.json({ success: true });
});
