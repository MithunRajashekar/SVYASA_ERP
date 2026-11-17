import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [route, model, facultyUi, studentUi] = await Promise.all([
  readFile(new URL("../server/routes/attendance.js", import.meta.url), "utf8"),
  readFile(new URL("../server/models/AttendanceDocument.js", import.meta.url), "utf8"),
  readFile(new URL("../src/shared/AcademicRecords.jsx", import.meta.url), "utf8"),
  readFile(new URL("../student-app/src/shared/AcademicRecords.jsx", import.meta.url), "utf8"),
]);

test("student document review endpoint is available to Faculty and Admin only", () => {
  assert.match(route, /attendanceRouter\.patch\("\/attendance-documents\/:documentId\/review",\s*requireRole\("faculty",\s*"admin"\)/);
});

test("Faculty review is scoped to teaching allocations or the currently assigned mentor for the student", () => {
  assert.match(route, /FacultyAssignment\.findOne\(\{\s*facultyId: req\.user\.id,\s*classId: attendance\.classId,\s*subjectId: attendance\.subjectId/s);
  assert.match(route, /MentorAssignment\.findOne\(\{\s*mentorId: req\.user\.id,\s*studentId: attendance\.studentId,\s*status: "active"/s);
  assert.match(route, /authorizeAttendanceDocumentAccess\(req, res, attendance\)/);
});

test("review decisions retain reviewer role for the student-facing audit trail", () => {
  assert.match(model, /reviewedByRole:\s*\{\s*type:\s*String,\s*enum:\s*\["faculty",\s*"admin"\]/);
  assert.match(route, /document\.reviewedByRole = req\.user\.role/);
});

test("Faculty attendance page renders inline Approve and Reject controls", () => {
  assert.match(facultyUi, /DocumentList documents=\{row\.documents \|\| \[\]\} onDownload=\{downloadDocument\} onReview=\{reviewDocument\} showReview\/>/);
  assert.match(facultyUi, /Approve/);
  assert.match(facultyUi, /Reject/);
});

test("Student portal shows document status but does not render review actions", () => {
  assert.match(studentUi, /<DocumentList documents=\{entry\.documents \|\| \[\]\} onDownload=\{downloadDocument\}\/>/);
  assert.match(studentUi, /<DocumentList documents=\{entry\.documents \|\| \[\]\} onDownload=\{downloadDocument\}\/>/);
});
