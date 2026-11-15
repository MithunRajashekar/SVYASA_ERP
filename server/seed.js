import "./config/env.js";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { connectDb, disconnectDb } from "./db.js";
import { User } from "./models/User.js";
import { ClassSection } from "./models/ClassSection.js";
import { Subject } from "./models/Subject.js";
import { FacultyAssignment } from "./models/FacultyAssignment.js";
import { Enrollment } from "./models/Enrollment.js";
import { ensureDataFolder, userFolderId, classFolderSegments, teachingFolderSegments } from "./utils/autoFolders.js";

function passwordFromEnv(name) {
  const fromEnv = process.env[name];
  if (fromEnv) {
    if (fromEnv.length < 10 || Buffer.byteLength(fromEnv, "utf8") > 72) {
      throw new Error(`${name} must be at least 10 characters and no more than 72 UTF-8 bytes.`);
    }
    return { password: fromEnv, generated: false };
  }
  return { password: crypto.randomBytes(18).toString("base64url"), generated: true };
}

async function upsertAccount({ code, name, role, email, password, usn = "", department = "", semester = null, section = "" }) {
  const existing = await User.findOne({ code });
  const passwordHash = await bcrypt.hash(password, 12);
  const accountData = { code, name, role, email, usn, student_id: role === "student" ? code : "", department, semester, section, passwordHash };
  accountData.folderId = await userFolderId(accountData);
  if (existing) {
    existing.name = name;
    existing.role = role;
    existing.email = email;
    existing.usn = usn;
    existing.student_id = role === "student" ? code : "";
    existing.department = department;
    existing.semester = semester;
    existing.section = section;
    existing.passwordHash = passwordHash;
    existing.folderId = accountData.folderId;
    existing.isActive = true;
    return existing.save();
  }
  return User.create(accountData);
}

async function seed() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters.");
  await connectDb();
  const accounts = [
    { code: "ERP-ADMIN", name: "ERP Administrator", role: "admin", email: "admin@local.invalid", secret: passwordFromEnv("SEED_ADMIN_PASSWORD") },
    { code: "FACULTY-001", name: "Sample Faculty", role: "faculty", email: "faculty@local.invalid", secret: passwordFromEnv("SEED_FACULTY_PASSWORD") },
    { code: "STUDENT-001", name: "Sample Student", role: "student", email: "student@local.invalid", usn: "STUDENT-001", department: "Computer Science", semester: 1, section: "A", secret: passwordFromEnv("SEED_STUDENT_PASSWORD") },
  ];
  const users = {};
  const credentials = [];
  for (const account of accounts) {
    const { secret, ...data } = account;
    users[data.role] = await upsertAccount({ ...data, password: secret.password });
    credentials.push({ role: data.role, userId: data.code, password: secret.password, generated: secret.generated });
  }

  const classData = { department: "Computer Science", semester: 1, section: "A", academicYear: "2026-2027", name: "Computer Science - Semester 1 - Section A" };
  classData.folderId = await ensureDataFolder("Academic Records", classFolderSegments(classData));
  const classSection = await ClassSection.findOneAndUpdate(
    { department: "Computer Science", semester: 1, section: "A" },
    classData,
    { returnDocument: "after", upsert: true, runValidators: true }
  );
  const subjectData = { code: "CS101", name: "Foundations of Computing", department: "Computer Science", semester: 1, section: "A", facultyId: users.faculty._id };
  subjectData.folderId = await ensureDataFolder("Academic Records", ["Subjects", "Computer Science", "Semester 1", "CS101"]);
  const subject = await Subject.findOneAndUpdate(
    { code: "CS101" },
    subjectData,
    { returnDocument: "after", upsert: true, runValidators: true }
  );
  await FacultyAssignment.findOneAndUpdate(
    { facultyId: users.faculty._id, classId: classSection._id, subjectId: subject._id },
    { facultyId: users.faculty._id, classId: classSection._id, subjectId: subject._id, slot: "A1", folderId: await ensureDataFolder("Academic Records", teachingFolderSegments("Faculty Assignments", classData, subject.code)) },
    { returnDocument: "after", upsert: true }
  );
  await Enrollment.findOneAndUpdate(
    { studentId: users.student._id, classId: classSection._id },
    { studentId: users.student._id, classId: classSection._id, folderId: await ensureDataFolder("Academic Records", teachingFolderSegments("Enrollments", classData)) },
    { returnDocument: "after", upsert: true }
  );

  console.log("Seed complete. Save the generated credentials now; they are printed only during this run.");
  for (const item of credentials) console.log(`${item.role.toUpperCase()} ${item.userId}: ${item.password}${item.generated ? " (generated)" : " (from environment)"}`);
  await disconnectDb();
}

seed().catch(async (error) => {
  console.error(`Seed failed: ${error.message}`);
  await disconnectDb().catch(() => {});
  process.exit(1);
});
