import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { User } from "./models/User.js";
import { DataFolder } from "./models/DataFolder.js";
import { userFolderId } from "./utils/autoFolders.js";

/** Create the first administrator once, without a separate seed command. */
export async function bootstrapFirstAdministrator() {
  await DataFolder.createIndexes();
  const existing = await User.findOne({ role: "admin" }).lean();
  if (existing) return null;

  const temporaryPassword = crypto.randomBytes(24).toString("base64url");
  const userData = {
    code: "ERP-ADMIN",
    student_id: "",
    name: "ERP Administrator",
    role: "admin",
    email: "admin@local.invalid",
    department: "Administration",
    semester: null,
    section: "",
    program: "",
    passwordHash: await bcrypt.hash(temporaryPassword, 12),
    isActive: true,
  };
  userData.folderId = await userFolderId(userData);

  try {
    await User.create(userData);
  } catch (error) {
    // Another API process may have completed the first-run bootstrap first.
    if (error?.code === 11000 && await User.exists({ role: "admin" })) return null;
    throw error;
  }

  return { userId: userData.code, temporaryPassword };
}
