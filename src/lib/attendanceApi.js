const AUTH_STORAGE_KEY = "svyasa.sessionUser.v1";

export function uiStatusToApi(status) {
  if (status === "P") return "present";
  if (status === "A") return "absent";
  if (status === "L") return "late";
  return "present";
}

export function apiStatusToUi(status) {
  if (status === "present") return "P";
  if (status === "absent") return "A";
  if (status === "late") return "L";
  return "P";
}

// This stores display identity only. The actual session is an HttpOnly cookie.
export function getSessionUser() {
  if (typeof window === "undefined") return null;
  try {
    const user = JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) || "null");
    if (!user) return null;
    return { userId: user.id || user.userId, role: user.role, name: user.name, email: user.email || "", phone: user.phone || "", department: user.department || "" };
  } catch {
    return null;
  }
}

export function setSessionUser(user) {
  if (!user) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

async function parseJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.details = payload.details;
    throw error;
  }
  return payload;
}

export async function apiFetch(path, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(path, { ...options, headers, credentials: "include" });
  return parseJson(response);
}

export async function fetchFacultyData() {
  return apiFetch("/api/faculty-data");
}

export async function fetchFacultyClasses(facultyId) {
  if (!facultyId) return { classes: [] };
  return apiFetch(`/api/faculty/${encodeURIComponent(facultyId)}/classes`);
}

export function fetchClassStudents(classId) {
  return apiFetch(`/api/classes/${encodeURIComponent(classId)}/students`);
}

export function fetchAttendance({ facultyId, classId, subjectId, date }) {
  const params = new URLSearchParams();
  if (facultyId) params.set("facultyId", facultyId);
  if (classId) params.set("classId", classId);
  if (subjectId) params.set("subjectId", subjectId);
  if (date) params.set("date", date);
  return apiFetch(`/api/attendance?${params.toString()}`);
}

export function saveAttendance(payload) {
  return apiFetch("/api/attendance", { method: "POST", body: JSON.stringify(payload) });
}

export function groupRecordsForUi(apiRecords = []) {
  const groups = new Map();
  apiRecords.forEach((row) => {
    const key = [row.facultyId, row.classId, row.subjectId, row.date].join("|");
    if (!groups.has(key)) {
      groups.set(key, {
        recordId: key,
        submittedAt: row.updatedAt || row.createdAt,
        editedByAdmin: false,
        context: { department: row.department, semester: row.semester, subject: row.subjectName, section: row.section, faculty: row.facultyName, date: row.date, slot: "" },
        attendance: [],
      });
    }
    groups.get(key).attendance.push({ id: row.studentId, usn: row.studentUsn, name: row.studentName, status: apiStatusToUi(row.status), comment: row.remarks || "" });
  });
  return [...groups.values()];
}
