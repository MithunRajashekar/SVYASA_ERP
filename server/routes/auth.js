import { Router } from "express";
import bcrypt from "bcryptjs";
import { rateLimit } from "../middleware/rateLimit.js";
import { User } from "../models/User.js";
import { userFolderId } from "../utils/autoFolders.js";
import { authenticate, clearSessionCookie, requireRole, safeUser, setSessionCookie, signSession } from "../middleware/auth.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: "Too many sign-in attempts. Try again in 15 minutes.",
});
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: "Too many registration attempts. Try again later.",
});

function cleanString(value, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validEmail(value) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function createUser({ code, name, role, password, usn = "", email = "", phone = "", department = "", semester = null, section = "", program = "", personalDetails = {} }) {
  const normalizedCode = cleanString(code, 64).toUpperCase();
  const normalizedName = cleanString(name, 120);
  const normalizedEmail = cleanString(email, 254).toLowerCase();
  const normalizedUsn = cleanString(usn, 64).toUpperCase();
  if (!normalizedCode || !normalizedName) throw Object.assign(new Error("Name and user ID are required."), { status: 400 });
  if (!/^[A-Z0-9._-]+$/.test(normalizedCode)) throw Object.assign(new Error("User ID contains unsupported characters."), { status: 400 });
  if (!validEmail(normalizedEmail)) throw Object.assign(new Error("Email address is invalid."), { status: 400 });
  if (typeof password !== "string" || password.length < 10 || Buffer.byteLength(password, "utf8") > 72) throw Object.assign(new Error("Password must be at least 10 characters and no more than 72 UTF-8 bytes."), { status: 400 });
  if (!["admin", "faculty", "student"].includes(role)) throw Object.assign(new Error("Role is invalid."), { status: 400 });
  if (role === "student" && semester !== null && semester !== undefined && (!Number.isInteger(Number(semester)) || Number(semester) < 1 || Number(semester) > 12)) {
    throw Object.assign(new Error("Semester must be a number from 1 to 12."), { status: 400 });
  }

  const existing = await User.findOne({ $or: [{ code: normalizedCode }, ...(normalizedUsn ? [{ usn: normalizedUsn }] : []), ...(normalizedEmail ? [{ email: normalizedEmail }] : [])] });
  if (existing) throw Object.assign(new Error("A user with that ID, USN, or email already exists."), { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  const accountData = {
    code: normalizedCode,
    student_id: role === "student" ? normalizedCode : "",
    name: normalizedName,
    role,
    usn: normalizedUsn,
    email: normalizedEmail,
    phone: cleanString(phone, 30),
    department: cleanString(department, 120),
    semester: semester === "" || semester === undefined || semester === null ? null : Number(semester),
    section: cleanString(section, 20),
    program: cleanString(program, 120),
    personalDetails: role === "student" && personalDetails && typeof personalDetails === "object" && !Array.isArray(personalDetails)
      ? Object.fromEntries(Object.entries(personalDetails).filter(([key]) => ["dateOfBirth", "gender", "bloodGroup", "nationality", "addressLine1", "addressLine2", "city", "state", "postalCode", "guardianName", "guardianRelation", "guardianEmail", "guardianPhone", "emergencyContactName", "emergencyContactPhone", "admissionNumber"].includes(key)).map(([key, value]) => [key, cleanString(String(value ?? ""), key.toLowerCase().includes("email") ? 254 : 180)]))
      : {},
    passwordHash,
  };
  accountData.folderId = await userFolderId(accountData);
  const user = await User.create(accountData);
  return user;
}

async function authenticateCredentials(identifier, password, role) {
  const key = cleanString(identifier, 254).toUpperCase();
  const query = { $or: [{ code: key }, { usn: key }, { email: cleanString(identifier, 254).toLowerCase() }] };
  if (role) query.role = role;
  const user = await User.findOne(query).select("+passwordHash");
  const usable = Boolean(user && user.isActive);
  const passwordOk = usable
    ? await bcrypt.compare(password, user.passwordHash)
    : await bcrypt.compare(password, "$2a$12$C6UzMDM.H6dfI/f/IKcEe.1F1Jj9K8dO5u8fZcC5q7f3f1YzqY6uK");
  if (!usable || !passwordOk) throw Object.assign(new Error("Invalid user ID or password."), { status: 401 });
  return user;
}

async function handleLogin(req, res) {
  const identifier = req.body?.identifier ?? req.body?.code ?? req.body?.student_id;
  const password = req.body?.password;
  const role = req.body?.role;
  if (typeof identifier !== "string" || typeof password !== "string" || Buffer.byteLength(password, "utf8") > 72 || !["admin", "faculty", "student"].includes(role)) {
    return res.status(400).json({ error: "Enter a valid user ID, password and portal role." });
  }
  const user = await authenticateCredentials(identifier, password, role);
  const token = signSession(user);
  setSessionCookie(res, token, user.role);
  return res.json({ success: true, user: safeUser(user) });
}

authRouter.post("/login", loginLimiter, async (req, res, next) => {
  try { return await handleLogin(req, res); } catch (error) { return next(error); }
});

authRouter.post("/logout", (req, res) => {
  clearSessionCookie(res, req.get("x-erp-portal-role") || "");
  res.json({ success: true });
});

authRouter.get("/me", authenticate, (req, res) => res.json({ success: true, user: req.user }));

authRouter.post("/change-password", authenticate, async (req, res, next) => {
  try {
    const currentPassword = req.body?.currentPassword;
    const newPassword = req.body?.newPassword;
    if (typeof currentPassword !== "string" || typeof newPassword !== "string" || newPassword.length < 10 || Buffer.byteLength(newPassword, "utf8") > 72) {
      return res.status(400).json({ error: "Enter your current password and a new password of 10 to 72 UTF-8 bytes." });
    }
    const user = await User.findById(req.user.id).select("+passwordHash");
    if (!user || !user.isActive || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    return res.json({ success: true, message: "Password changed successfully. Sign in again on your other devices." });
  } catch (error) { return next(error); }
});

// Student accounts are provisioned by an administrator. Open signup would let
// an unauthenticated caller claim another student's university ID.
authRouter.post("/register", authenticate, requireRole("admin"), registrationLimiter, async (req, res, next) => {
  try {
    const user = await createUser({ ...req.body, code: req.body?.code || req.body?.student_id, role: "student" });
    return res.status(201).json({ success: true, user: safeUser(user) });
  } catch (error) { return next(error); }
});

// Privileged account provisioning is restricted to an already authenticated administrator.
authRouter.post("/users", authenticate, requireRole("admin"), async (req, res, next) => {
  try {
    const user = await createUser(req.body || {});
    return res.status(201).json({ success: true, user: safeUser(user) });
  } catch (error) { return next(error); }
});

export { createUser, authenticateCredentials };
