import { DataFolder } from "../models/DataFolder.js";

function cleanSegment(value, fallback = "General") {
  const text = String(value ?? "").normalize("NFKC").trim();
  if (!text) return fallback;
  return text.replace(/[\\/]+/g, "-").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").slice(0, 120);
}

function keySegment(value) {
  return cleanSegment(value).toLocaleLowerCase("en-US").replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "general";
}

/**
 * Creates a folder hierarchy on demand and returns the leaf folder ID.
 * No UI or user action is involved. Repeated entries reuse the same folder.
 */
export async function ensureDataFolder(moduleName, segments = []) {
  const module = cleanSegment(moduleName, "General");
  const names = [module, ...segments.map((segment) => cleanSegment(segment))];
  let parentFolderId = null;
  let path = "";
  let key = keySegment(module);
  let folder = null;

  for (let index = 0; index < names.length; index += 1) {
    const name = names[index];
    if (index > 0) key += `/${keySegment(name)}`;
    path = path ? `${path}/${name}` : name;
    try {
      folder = await DataFolder.findOneAndUpdate(
        { key },
        { $setOnInsert: { key, module, name, path, parentFolderId } },
        { returnDocument: "after", upsert: true, setDefaultsOnInsert: true, runValidators: true },
      );
    } catch (error) {
      // A concurrent request may win the unique-key upsert. Reuse its folder.
      if (error?.code !== 11000) throw error;
      folder = await DataFolder.findOne({ key });
      if (!folder) throw error;
    }
    parentFolderId = folder._id;
  }

  return folder._id;
}

export async function userFolderId(user) {
  const segments = [
    user.role === "admin" ? "Administrators" : user.role === "faculty" ? "Faculty" : "Students",
    user.department || "Unassigned Department",
  ];
  if (user.role === "student") {
    segments.push(
      user.program || "General Program",
      user.semester ? `Semester ${user.semester}` : "Unassigned Semester",
      user.section ? `Section ${user.section}` : "Unassigned Section",
    );
  }
  return ensureDataFolder("Users", segments);
}

export function classFolderSegments(classRecord) {
  return [
    "Classes",
    classRecord.academicYear || "Unassigned Academic Year",
    classRecord.department || "General Department",
    `Semester ${classRecord.semester || "Unassigned"}`,
    `Section ${classRecord.section || "Unassigned"}`,
  ];
}

export function teachingFolderSegments(kind, classRecord, subjectCode = "") {
  return [
    kind,
    classRecord.academicYear || "Unassigned Academic Year",
    classRecord.department || "General Department",
    `Semester ${classRecord.semester || "Unassigned"}`,
    `Section ${classRecord.section || "Unassigned"}`,
    ...(subjectCode ? [subjectCode] : []),
  ];
}
