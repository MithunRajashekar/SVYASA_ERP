import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [mentorRoute, adminRoute, reportsRoute, mentorModel, hostelRoomModel, allotmentModel, nocModel, portal, nav, studentNocUi, mentorUi, hostelUi, reportsUi] = await Promise.all([
  read("../server/routes/mentor.js"), read("../server/routes/admin.js"), read("../server/routes/reports.js"),
  read("../server/models/MentorAssignment.js"), read("../server/models/HostelRoom.js"), read("../server/models/HostelAllotment.js"), read("../server/models/StudentNoc.js"),
  read("../src/shared/PortalApp.jsx"), read("../src/shared/modules.js"), read("../src/shared/StudentNocWorkspace.jsx"), read("../src/shared/MentorWorkspace.jsx"), read("../src/shared/HostelAdminWorkspace.jsx"), read("../src/shared/ReportsWorkspace.jsx"),
]);

test("Admin manages mentor-to-mentee assignments using existing Faculty and Student accounts", () => {
  assert.match(adminRoute, /\/admin\/mentor-assignments/);
  assert.match(adminRoute, /role: "faculty"/);
  assert.match(adminRoute, /role: "student"/);
  assert.match(adminRoute, /StudentNoc\.updateMany\([\s\S]*mentorId, mentorAssignmentId: assignment\._id/);
  assert.match(mentorModel, /mentorAssignmentSchema\.index\(\{ studentId: 1, academicYear: 1 \}, \{ unique: true \}\)/);
});

test("Mentors can list only their mentees and review documents for those mentees", () => {
  assert.match(mentorRoute, /requireRole\("faculty"\)/);
  assert.match(mentorRoute, /MentorAssignment\.find\(\{ mentorId: req\.user\.id, status: "active" \}\)/);
  assert.match(mentorRoute, /studentId: document\.studentId, status: "active"/);
  assert.match(mentorRoute, /assignmentByStudent\.get\(String\(doc\.studentId\)\)/);
  assert.match(mentorUi, /Approve/);
  assert.match(mentorUi, /Reject/);
});

test("Student NOC requests are routed to an assigned mentor and mentor decisions create an issued NOC", () => {
  assert.match(mentorRoute, /\/mentor\/noc-requests/);
  assert.match(mentorRoute, /status = decision === "issue" \? "issued" : "rejected"/);
  assert.match(nocModel, /nocNumber/);
  assert.match(mentorRoute, /StudentNoc\.findOne\(\{ _id: req\.params\.id, mentorId: req\.user\.id, status: "pending" \}\)/);
  assert.match(mentorRoute, /activeAssignment.*MentorAssignment\.exists/s);
  assert.match(mentorRoute, /_id: record\.mentorAssignmentId, mentorId: req\.user\.id, studentId: record\.studentId,[\s\S]*status: "active"/);
  assert.match(mentorRoute, /mentorAssignmentId: \{ \$in: assignmentIds \}/);
  assert.match(studentNocUi, /Submit an NOC request/);
  assert.match(studentNocUi, /Download NOC PDF/);
});

test("Admin owns hostel inventory and bed allotment, with active bed and student uniqueness", () => {
  assert.match(adminRoute, /\/admin\/hostel\/rooms/);
  assert.match(adminRoute, /\/admin\/hostel\/allotments/);
  assert.match(hostelRoomModel, /capacity:/);
  assert.match(allotmentModel, /partialFilterExpression: \{ status: "active" \}/);
  assert.match(hostelUi, /Allocate a bed to a student/);
});

test("Attendance and marks downloads are scoped to administrator or faculty report access", () => {
  assert.match(reportsRoute, /\/reports\/attendance/);
  assert.match(reportsRoute, /\/reports\/marks/);
  assert.match(reportsRoute, /You can download reports only for your assigned class and subject/);
  assert.match(reportsUi, /Download Attendance Excel/);
  assert.match(reportsUi, /Download Marks Excel/);
});

test("All three portals expose only their intended new workflows", () => {
  assert.match(portal, /activePage === "mentor-admin" && role === "admin"/);
  assert.match(portal, /activePage === "hostel-admin" && role === "admin"/);
  assert.match(portal, /activePage === "mentor" && role === "faculty"/);
  assert.match(portal, /activePage === "student-noc" && role === "student"/);
  assert.match(nav, /id: "mentor-admin", label: "Mentoring"/);
  assert.match(nav, /Hostel Room Allotment/);
  assert.match(nav, /id: "mentor", label: "Mentoring"/);
  assert.match(nav, /id: "student-noc", label: "Mentoring"/);
});
