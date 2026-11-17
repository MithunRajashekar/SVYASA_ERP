import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [mentorRoute, studentRoute, attendanceRoute, adminRoute, userModel, sessionModel, certificateModel, facultyUi, studentUi, adminUi, nav, portal] = await Promise.all([
  read("../server/routes/mentor.js"),
  read("../server/routes/student.js"),
  read("../server/routes/attendance.js"),
  read("../server/routes/admin.js"),
  read("../server/models/User.js"),
  read("../server/models/MentorSession.js"),
  read("../server/models/StudentCertificate.js"),
  read("../src/shared/MentorWorkspace.jsx"),
  read("../student-app/src/shared/StudentNocWorkspace.jsx"),
  read("../admin-app/src/shared/AdminMentorWorkspace.jsx"),
  read("../src/shared/modules.js"),
  read("../src/shared/PortalApp.jsx"),
]);

test("Mentor dossier is restricted to an active assigned mentee and returns personal, financial and academic records", () => {
  assert.match(mentorRoute, /\/mentor\/mentees\/:studentId\/profile/);
  assert.match(mentorRoute, /activeMenteeAssignment\(req\.user\.id, req\.params\.studentId\)/);
  assert.match(mentorRoute, /personalDetails: student\.personalDetails \|\| \{\}/);
  assert.match(mentorRoute, /fees: \{ \.\.\.feeTotals/);
  assert.match(mentorRoute, /totals\.remaining \+= Math\.max\(0, amount - paid\)/);
  assert.match(mentorRoute, /attendance: \{/);
  assert.match(mentorRoute, /marks,/);
  assert.match(mentorRoute, /serviceRecords:/);
  assert.match(userModel, /personalDetails: \{ type: studentPersonalDetailsSchema/);
  assert.match(facultyUi, /Full student record/);
  assert.match(facultyUi, /Total fees/);
  assert.match(facultyUi, /Remaining balance/);
});

test("Mentors can schedule sessions with an agenda and preserve session outcomes, action items and follow-up", () => {
  assert.match(mentorRoute, /\/mentor\/mentees\/:studentId\/sessions/);
  assert.match(mentorRoute, /You can schedule mentoring only for students actively assigned to you/);
  assert.match(mentorRoute, /agenda, sessionAt, durationMinutes, mode/);
  assert.match(mentorRoute, /session\.mentorNotes/);
  assert.match(mentorRoute, /session\.actionItems = req\.body\.actionItems\.map/);
  assert.match(sessionModel, /mentorNotes:/);
  assert.match(sessionModel, /studentSummary:/);
  assert.match(sessionModel, /actionItems:/);
  assert.match(facultyUi, /Call \/ schedule a mentoring session/);
  assert.match(facultyUi, /Mentoring session records/);
});

test("Students can upload certificates and mentors can add certificates to individual mentee records", () => {
  assert.match(studentRoute, /studentRouter\.post\("\/certificates"/);
  assert.match(studentRoute, /You need an active Mentor assignment before submitting a certificate/);
  assert.match(mentorRoute, /mentorRouter\.post\("\/mentor\/mentees\/:studentId\/certificates"/);
  assert.match(mentorRoute, /reviewStatus: "approved"/);
  assert.match(studentUi, /Add a certificate to my student record/);
  assert.match(facultyUi, /Add to student record/);
  assert.match(certificateModel, /content: \{ type: Buffer, required: true, select: false \}/);
});

test("Mentor has a current-mentee pending-certificate inbox and reassignment reroutes pending certificates", () => {
  assert.match(mentorRoute, /\/mentor\/pending-certificates/);
  assert.match(mentorRoute, /studentId: \{ \$in: assignments\.map\(\(row\) => row\.studentId\) \}/);
  assert.match(adminRoute, /StudentCertificate\.updateMany\(/);
  assert.match(adminRoute, /mentorAssignmentId: assignment\._id/);
  assert.match(mentorRoute, /You can review student-submitted certificates only for students currently assigned to you/);
  assert.match(mentorRoute, /StudentNoc\.findOne\(\{ _id: req\.params\.id, mentorId: req\.user\.id, status: "pending" \}\)/);
  assert.match(facultyUi, /Pending student certificates/);
});

test("Mentor downloads and reviews remain limited to current assigned mentees, including their historical student records", () => {
  assert.match(mentorRoute, /const assignment = await activeMenteeAssignment\(req\.user\.id, record\.studentId\)/);
  assert.match(attendanceRoute, /studentId: attendance\.studentId,\s*status: "active"/);
  assert.doesNotMatch(attendanceRoute, /academicYear: classRecord\?\.academicYear/);
});

test("Mentoring is the only navigation item for mentoring and NOC in all three portals", () => {
  assert.match(nav, /id: "mentor-admin", label: "Mentoring"/);
  assert.match(nav, /id: "mentor", label: "Mentoring"/);
  assert.match(nav, /id: "student-noc", label: "Mentoring"/);
  assert.doesNotMatch(nav, /label: "Mentoring & NOC Reviews"/);
  assert.doesNotMatch(nav, /label: "NOC Requests"/);
  assert.match(portal, /activePage === "mentor-admin" \? "Mentoring"/);
  assert.match(portal, /activePage === "student-noc" \? "Mentoring"/);
  assert.match(adminUi, /<h1>Mentoring<\/h1>/);
});

test("Student Mentoring shows meeting agenda, student summary and action items without exposing private mentor notes", () => {
  assert.match(studentRoute, /actionItems followUpDate completedAt createdAt/);
  assert.doesNotMatch(studentRoute, /mentorNotes/);
  assert.match(studentUi, /row\.agenda/);
  assert.match(studentUi, /row\.studentSummary/);
  assert.match(studentUi, /row\.actionItems/);
  assert.doesNotMatch(studentUi, /mentorNotes/);
});
