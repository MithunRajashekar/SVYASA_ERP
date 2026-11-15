import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

process.env.DATABASE_URL = "mongodb://127.0.0.1:27017/svyasa_erp_test";
process.env.JWT_SECRET = "test-only-secret-with-at-least-thirty-two-characters";
process.env.JWT_EXPIRES_IN = "1h";
process.env.NODE_ENV = "test";

const [{ createApp }, { User }, { Event }, { Subject }, { ClassSection }, { Attendance }, { AttendanceDocument }, { Marks }, { FacultyAssignment }, { Enrollment }, { DataFolder }, { ModuleRecord }] = await Promise.all([
  import("../server/index.js"),
  import("../server/models/User.js"),
  import("../server/models/Event.js"),
  import("../server/models/Subject.js"),
  import("../server/models/ClassSection.js"),
  import("../server/models/Attendance.js"),
  import("../server/models/AttendanceDocument.js"),
  import("../server/models/Marks.js"),
  import("../server/models/FacultyAssignment.js"),
  import("../server/models/Enrollment.js"),
  import("../server/models/DataFolder.js"),
  import("../server/models/ModuleRecord.js"),
]);

const stores = {
  users: [], events: [], subjects: [], classes: [], attendance: [], attendanceDocuments: [], marks: [], assignments: [], enrollments: [], folders: [], moduleRecords: [],
};
let nextId = 1;
const id = () => String(nextId++).padStart(24, "0");
const asString = (value) => value && typeof value === "object" && value._id ? String(value._id) : String(value ?? "");

function matches(document, filter = {}) {
  if (!document) return false;
  return Object.entries(filter).every(([key, expected]) => {
    if (key === "$or") return expected.some((candidate) => matches(document, candidate));
    if (key === "$and") return expected.every((candidate) => matches(document, candidate));
    const actual = key.split(".").reduce((value, part) => value?.[part], document);
    if (expected && typeof expected === "object" && !Array.isArray(expected)) {
      if ("$in" in expected) return expected.$in.some((value) => asString(value) === asString(actual));
      if ("$gte" in expected && actual < expected.$gte) return false;
      if ("$lte" in expected && actual > expected.$lte) return false;
      if ("$gte" in expected || "$lte" in expected) return true;
    }
    return asString(actual).toLowerCase() === asString(expected).toLowerCase();
  });
}

function attachDocumentMethods(collection, document) {
  document.save = async function save() { return this; };
  document.toObject = function toObject() { return Object.fromEntries(Object.entries(this).filter(([, value]) => typeof value !== "function")); };
  document.deleteOne = async function deleteOne() {
    const index = collection.findIndex((item) => asString(item._id) === asString(this._id));
    if (index >= 0) collection.splice(index, 1);
    return { deletedCount: index >= 0 ? 1 : 0 };
  };
  return document;
}

function populateDocument(document, paths) {
  if (!document) return document;
  const result = { ...document };
  for (const item of paths) {
    const path = typeof item === "string" ? item : item.path;
    const collection = ({
      studentId: stores.users,
      facultyId: stores.users,
      createdBy: stores.users,
      ownerId: stores.users,
      targetUserId: stores.users,
      subjectId: stores.subjects,
      classId: stores.classes,
    })[path];
    if (!collection) continue;
    const related = collection.find((entry) => asString(entry._id) === asString(result[path]));
    result[path] = related ? { ...related } : null;
  }
  return result;
}

class MemoryQuery {
  constructor(resolver) { this.resolver = resolver; this.populators = []; this.sortSpec = null; this.limitCount = null; this.distinctPath = null; }
  select() { return this; }
  populate(paths) { this.populators.push(...(Array.isArray(paths) ? paths : [paths])); return this; }
  sort(spec) { this.sortSpec = spec; return this; }
  limit(count) { this.limitCount = count; return this; }
  distinct(path) { this.distinctPath = path; return this; }
  lean() { return this; }
  then(resolve, reject) {
    return Promise.resolve().then(this.resolver).then((value) => {
      if (this.distinctPath) {
        const values = (Array.isArray(value) ? value : []).map((row) => this.distinctPath.split(".").reduce((item, part) => item?.[part], row));
        return [...new Map(values.filter((item) => item !== undefined && item !== null).map((item) => [asString(item), item])).values()];
      }
      const transform = (item) => this.populators.length ? populateDocument(item, this.populators) : item;
      if (Array.isArray(value)) {
        let result = value.map(transform);
        if (this.sortSpec) {
          const [key, direction] = Object.entries(this.sortSpec)[0] || [];
          if (key) result = result.sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * direction);
        }
        if (Number.isInteger(this.limitCount)) result = result.slice(0, this.limitCount);
        return result;
      }
      return transform(value);
    }).then(resolve, reject);
  }
}
const query = (resolver) => new MemoryQuery(resolver);
const add = (collection, data) => attachDocumentMethods(collection, { _id: id(), isActive: true, ...data });

// Small in-memory model adapter: this tests the real Express route and middleware stack
// without connecting to or contacting any MongoDB instance.
User.findOne = (filter) => query(() => stores.users.find((row) => matches(row, filter)) || null);
User.findById = (value) => query(() => stores.users.find((row) => asString(row._id) === asString(value)) || null);
User.find = (filter) => query(() => stores.users.filter((row) => matches(row, filter)));
User.create = async (data) => { const row = add(stores.users, data); stores.users.push(row); return row; };
User.countDocuments = async (filter = {}) => stores.users.filter((row) => matches(row, filter)).length;

Event.find = (filter) => query(() => stores.events.filter((row) => matches(row, filter)));
Event.findById = (value) => query(() => stores.events.find((row) => asString(row._id) === asString(value)) || null);
Event.create = async (data) => { const row = add(stores.events, data); stores.events.push(row); return row; };
Event.countDocuments = async (filter = {}) => stores.events.filter((row) => matches(row, filter)).length;

Subject.find = (filter) => query(() => stores.subjects.filter((row) => matches(row, filter)));
Subject.findById = (value) => query(() => stores.subjects.find((row) => asString(row._id) === asString(value)) || null);
Subject.create = async (data) => { const row = add(stores.subjects, data); stores.subjects.push(row); return row; };
Subject.exists = async (filter) => stores.subjects.some((row) => matches(row, filter));
Subject.countDocuments = async (filter = {}) => stores.subjects.filter((row) => matches(row, filter)).length;

ClassSection.find = (filter) => query(() => stores.classes.filter((row) => matches(row, filter)));
ClassSection.findById = (value) => query(() => stores.classes.find((row) => asString(row._id) === asString(value)) || null);
ClassSection.create = async (data) => { const row = add(stores.classes, data); stores.classes.push(row); return row; };
ClassSection.exists = async (filter) => stores.classes.some((row) => matches(row, filter));
ClassSection.countDocuments = async (filter = {}) => stores.classes.filter((row) => matches(row, filter)).length;

FacultyAssignment.findOne = (filter) => query(() => stores.assignments.find((row) => matches(row, filter)) || null);
FacultyAssignment.find = (filter) => query(() => stores.assignments.filter((row) => matches(row, filter)));
FacultyAssignment.findOneAndUpdate = async (filter, update) => {
  let row = stores.assignments.find((item) => matches(item, filter));
  if (!row) { row = add(stores.assignments, update); stores.assignments.push(row); }
  else Object.assign(row, update);
  return row;
};
FacultyAssignment.exists = async (filter) => stores.assignments.some((row) => matches(row, filter));

Enrollment.findOne = (filter) => query(() => stores.enrollments.find((row) => matches(row, filter)) || null);
Enrollment.find = (filter) => query(() => stores.enrollments.filter((row) => matches(row, filter)));
Enrollment.findOneAndUpdate = async (filter, update) => {
  let row = stores.enrollments.find((item) => matches(item, filter));
  if (!row) { row = add(stores.enrollments, update); stores.enrollments.push(row); }
  else Object.assign(row, update);
  return row;
};
Enrollment.exists = async (filter) => stores.enrollments.some((row) => matches(row, filter));

DataFolder.createIndexes = async () => {};
DataFolder.find = (filter) => query(() => stores.folders.filter((row) => matches(row, filter)));
DataFolder.countDocuments = async (filter = {}) => stores.folders.filter((row) => matches(row, filter)).length;
DataFolder.findOneAndUpdate = async (filter, update) => {
  let row = stores.folders.find((item) => matches(item, filter));
  if (!row) {
    row = add(stores.folders, update.$setOnInsert || update);
    stores.folders.push(row);
  }
  return row;
};

Attendance.find = (filter) => query(() => stores.attendance.filter((row) => matches(row, filter)));
Attendance.exists = async (filter) => stores.attendance.some((row) => matches(row, filter));
Attendance.findById = (value) => query(() => stores.attendance.find((row) => asString(row._id) === asString(value)) || null);
Attendance.findOneAndUpdate = async (filter, update) => {
  let row = stores.attendance.find((item) => matches(item, filter));
  if (!row) { row = add(stores.attendance, update); stores.attendance.push(row); }
  else Object.assign(row, update);
  return row;
};

AttendanceDocument.find = (filter) => query(() => stores.attendanceDocuments.filter((row) => matches(row, filter)));
AttendanceDocument.findById = (value) => query(() => stores.attendanceDocuments.find((row) => asString(row._id) === asString(value)) || null);
AttendanceDocument.create = async (data) => { const row = add(stores.attendanceDocuments, data); stores.attendanceDocuments.push(row); return row; };

Marks.find = (filter) => query(() => stores.marks.filter((row) => matches(row, filter)));
Marks.findOne = (filter) => query(() => stores.marks.find((row) => matches(row, filter)) || null);
Marks.findById = (value) => query(() => stores.marks.find((row) => asString(row._id) === asString(value)) || null);
Marks.exists = async (filter) => stores.marks.some((row) => matches(row, filter));
Marks.findOneAndUpdate = (filter, update) => query(() => {
  let row = stores.marks.find((item) => matches(item, filter));
  const values = update.$set || update;
  if (!row) { row = add(stores.marks, values); stores.marks.push(row); }
  else Object.assign(row, values);
  return row;
});
Marks.countDocuments = async (filter = {}) => stores.marks.filter((row) => matches(row, filter)).length;
Attendance.countDocuments = async (filter = {}) => stores.attendance.filter((row) => matches(row, filter)).length;

ModuleRecord.find = (filter) => query(() => stores.moduleRecords.filter((row) => matches(row, filter)));
ModuleRecord.findOne = (filter) => query(() => stores.moduleRecords.find((row) => matches(row, filter)) || null);
ModuleRecord.create = async (data) => { const row = add(stores.moduleRecords, data); stores.moduleRecords.push(row); return row; };
ModuleRecord.countDocuments = async (filter = {}) => stores.moduleRecords.filter((row) => matches(row, filter)).length;

function cookie(response) {
  const value = response.headers.get("set-cookie");
  assert.ok(value, "response should set a session cookie");
  return value.split(";")[0];
}

async function jsonRequest(baseUrl, path, { method = "GET", body, session, headers: extraHeaders = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(session ? { cookie: session } : {}),
      ...extraHeaders,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

test("shared ERP API security and CRUD smoke tests (in-memory model adapter)", async () => {
  stores.users.length = 0;
  stores.events.length = 0;
  stores.subjects.length = 0;
  stores.classes.length = 0;
  stores.attendance.length = 0;
  stores.attendanceDocuments.length = 0;
  stores.marks.length = 0;
  stores.assignments.length = 0;
  stores.enrollments.length = 0;
  stores.folders.length = 0;
  stores.moduleRecords.length = 0;

  const adminPassword = "Admin-Test-Only-Password!";
  const admin = await User.create({ code: "ERP-ADMIN", name: "Test Administrator", role: "admin", email: "admin@test.invalid", passwordHash: await bcrypt.hash(adminPassword, 4), isActive: true });
  const app = createApp();
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // Health route and protected-route behaviour.
    const health = await jsonRequest(baseUrl, "/api/health");
    assert.equal(health.response.status, 200);
    assert.equal(health.data.ok, true);
    const rejectedOrigin = await jsonRequest(baseUrl, "/api/health", { headers: { origin: "https://untrusted.invalid" } });
    assert.equal(rejectedOrigin.response.status, 403);
    const privateLanOrigin = await jsonRequest(baseUrl, "/api/health", { headers: { origin: "http://192.168.1.25:5175" } });
    assert.equal(privateLanOrigin.response.status, 200, "development mode should allow localhost/private LAN portal origins");
    const noToken = await jsonRequest(baseUrl, "/api/auth/me");
    assert.equal(noToken.response.status, 401);
    const noTokenFaculty = await jsonRequest(baseUrl, "/api/attendance");
    assert.equal(noTokenFaculty.response.status, 401);

    // The first administrator provisions student accounts. Public signup is
    // intentionally disabled so a stranger cannot claim a known student ID.
    const publicRegistration = await jsonRequest(baseUrl, "/api/auth/register", {
      method: "POST", body: { code: "STU-1001", name: "Test Student One", password: "Student-Test-Password!" },
    });
    assert.equal(publicRegistration.response.status, 401);
    const adminLogin = await jsonRequest(baseUrl, "/api/auth/login", {
      method: "POST", body: { identifier: "ERP-ADMIN", password: adminPassword, role: "admin" },
    });
    assert.equal(adminLogin.response.status, 200);
    const adminCookie = cookie(adminLogin.response);
    assert.ok(adminCookie.startsWith("svyasa_admin_session="), "administrator login must use its own portal cookie");
    const adminPortalIdentity = await jsonRequest(baseUrl, "/api/auth/me", { session: adminCookie, headers: { "x-erp-portal-role": "admin" } });
    assert.equal(adminPortalIdentity.response.status, 200);
    const adminCookieCannotAuthenticateFacultyPortal = await jsonRequest(baseUrl, "/api/auth/me", { session: adminCookie, headers: { "x-erp-portal-role": "faculty" } });
    assert.equal(adminCookieCannotAuthenticateFacultyPortal.response.status, 401, "portal sessions must not cross roles");
    const registered = await jsonRequest(baseUrl, "/api/auth/register", {
      method: "POST", session: adminCookie,
      body: { code: "STU-1001", name: "Test Student One", password: "Student-Test-Password!", role: "admin", department: "Computer Science", semester: 1, section: "A" },
    });
    assert.equal(registered.response.status, 201);
    assert.equal(registered.data.user.role, "student", "registration endpoint must force Student role");
    assert.equal("passwordHash" in registered.data.user, false);
    assert.equal("password" in registered.data.user, false);
    const registeredRecord = stores.users.find((row) => row.code === "STU-1001");
    assert.ok(/^\$2[aby]\$12\$/.test(registeredRecord.passwordHash), "password must be bcrypt-hashed with cost 12");
    assert.equal(await bcrypt.compare("Student-Test-Password!", registeredRecord.passwordHash), true);
    assert.ok(registeredRecord.folderId, "new student should be auto-filed into a generated folder");
    const studentId = registered.data.user.id;

    const secondStudent = await jsonRequest(baseUrl, "/api/auth/register", {
      method: "POST", session: adminCookie,
      body: { student_id: "STU-1002", name: "Test Student Two", password: "Second-Test-Password!", department: "Computer Science", semester: 1, section: "A" },
    });
    assert.equal(secondStudent.response.status, 201);
    const secondStudentId = secondStudent.data.user.id;

    // Student login and only-own-record access.
    const studentLogin = await jsonRequest(baseUrl, "/api/student/login", {
      method: "POST",
      body: { student_id: "STU-1001", password: "Student-Test-Password!" },
    });
    assert.equal(studentLogin.response.status, 200);
    const loggedStudentCookie = cookie(studentLogin.response);
    assert.ok(loggedStudentCookie.startsWith("svyasa_student_session="), "student login must use its own portal cookie");
    const ownProfile = await jsonRequest(baseUrl, `/api/student/profile/STU-1001`, { session: loggedStudentCookie });
    assert.equal(ownProfile.response.status, 200);
    const otherProfile = await jsonRequest(baseUrl, `/api/student/profile/STU-1002`, { session: loggedStudentCookie });
    assert.equal(otherProfile.response.status, 403);
    const otherAttendance = await jsonRequest(baseUrl, `/api/student/attendance/STU-1002`, { session: loggedStudentCookie });
    assert.equal(otherAttendance.response.status, 403);
    const ownAttendance = await jsonRequest(baseUrl, `/api/student/attendance/STU-1001`, { session: loggedStudentCookie });
    assert.equal(ownAttendance.response.status, 200);
    assert.deepEqual(ownAttendance.data.attendance, []);
    const ownMarks = await jsonRequest(baseUrl, `/api/student/marks/STU-1001`, { session: loggedStudentCookie });
    assert.equal(ownMarks.response.status, 200);
    assert.deepEqual(ownMarks.data.marks, []);

    // Admin-only faculty provisioning, followed by a faculty login.
    const studentCannotProvision = await jsonRequest(baseUrl, "/api/auth/users", {
      method: "POST", session: loggedStudentCookie,
      body: { code: "FAC-001", name: "Test Faculty", role: "faculty", password: "Faculty-Test-Password!" },
    });
    assert.equal(studentCannotProvision.response.status, 403);
    const facultyCreated = await jsonRequest(baseUrl, "/api/auth/users", {
      method: "POST", session: adminCookie,
      body: { code: "FAC-001", name: "Test Faculty", role: "faculty", password: "Faculty-Test-Password!", department: "Computer Science" },
    });
    assert.equal(facultyCreated.response.status, 201);
    const facultyId = facultyCreated.data.user.id;
    const facultyLogin = await jsonRequest(baseUrl, "/api/auth/login", {
      method: "POST", body: { identifier: "FAC-001", password: "Faculty-Test-Password!", role: "faculty" },
    });
    assert.equal(facultyLogin.response.status, 200);
    const facultyCookie = cookie(facultyLogin.response);
    assert.ok(facultyCookie.startsWith("svyasa_faculty_session="), "faculty login must use its own portal cookie");
    const facultyPortalIdentity = await jsonRequest(baseUrl, "/api/auth/me", { session: facultyCookie, headers: { "x-erp-portal-role": "faculty" } });
    assert.equal(facultyPortalIdentity.response.status, 200);
    const facultyCookieCannotAuthenticateAdminPortal = await jsonRequest(baseUrl, "/api/auth/me", { session: facultyCookie, headers: { "x-erp-portal-role": "admin" } });
    assert.equal(facultyCookieCannotAuthenticateAdminPortal.response.status, 401, "faculty sessions must not authenticate as admin");
    const studentOnFacultyRoute = await jsonRequest(baseUrl, "/api/faculty-data", { session: loggedStudentCookie });
    assert.equal(studentOnFacultyRoute.response.status, 403);
    const facultyIdentity = await jsonRequest(baseUrl, "/api/auth/me", { session: facultyCookie });
    assert.equal(facultyIdentity.response.status, 200);
    assert.equal(facultyIdentity.data.user.role, "faculty");

    // Shared academic setup CRUD: administrators create one class, subject, assignment and enrolment.
    const classCreated = await jsonRequest(baseUrl, "/api/admin/classes", {
      method: "POST", session: adminCookie,
      body: { department: "Computer Science", semester: 1, academicYear: "2026-27", section: "A", name: "MCA Sem 1 A" },
    });
    assert.equal(classCreated.response.status, 201);
    const classId = classCreated.data.class._id;
    const subjectCreated = await jsonRequest(baseUrl, "/api/admin/subjects", {
      method: "POST", session: adminCookie,
      body: { code: "CS101", name: "Foundations of Computing", department: "Computer Science", semester: 1, section: "A" },
    });
    assert.equal(subjectCreated.response.status, 201);
    const subjectId = subjectCreated.data.subject._id;
    const assignmentCreated = await jsonRequest(baseUrl, "/api/admin/assignments", {
      method: "POST", session: adminCookie,
      body: { facultyId, classId, subjectId, slot: "A1" },
    });
    assert.equal(assignmentCreated.response.status, 201);
    const enrollmentCreated = await jsonRequest(baseUrl, "/api/admin/enrollments", {
      method: "POST", session: adminCookie,
      body: { studentId, classId },
    });
    assert.equal(enrollmentCreated.response.status, 201);
    assert.ok(stores.classes.find((row) => row._id === classId)?.folderId, "class should be auto-filed");
    assert.ok(stores.subjects.find((row) => row._id === subjectId)?.folderId, "subject should be auto-filed");
    assert.ok(stores.assignments[0]?.folderId, "faculty assignment should be auto-filed");
    assert.ok(stores.enrollments[0]?.folderId, "student enrollment should be auto-filed");

    // Student academic subjects are derived from explicit enrolments, not a
    // department/semester/section profile match alone.
    const enrolledStudentSubjects = await jsonRequest(baseUrl, "/api/student/subjects/STU-1001", { session: loggedStudentCookie });
    assert.equal(enrolledStudentSubjects.response.status, 200);
    assert.equal(enrolledStudentSubjects.data.subjects.length, 1);
    const secondStudentLogin = await jsonRequest(baseUrl, "/api/student/login", {
      method: "POST", body: { student_id: "STU-1002", password: "Second-Test-Password!" },
    });
    assert.equal(secondStudentLogin.response.status, 200);
    const secondStudentCookie = cookie(secondStudentLogin.response);
    const nonEnrolledStudentSubjects = await jsonRequest(baseUrl, "/api/student/subjects/STU-1002", { session: secondStudentCookie });
    assert.equal(nonEnrolledStudentSubjects.response.status, 200);
    assert.equal(nonEnrolledStudentSubjects.data.subjects.length, 0, "matching profile details must not substitute for enrolment");

    // A published faculty assignment is visible to the enrolled student. The
    // student can submit a link, while only assigned faculty may grade it.
    const publishedAssignment = await jsonRequest(baseUrl, "/api/workspace/assignments", {
      method: "POST", session: facultyCookie,
      body: {
        title: "Database Fundamentals Assignment", description: "Submit a short report.", status: "Published",
        classId, subjectCode: "CS101", fields: { subjectName: "Foundations of Computing", maxMarks: 50, instructions: "Submit a PDF report." },
      },
    });
    assert.equal(publishedAssignment.response.status, 201);
    assert.ok(publishedAssignment.data.record.folderId, "published assignment should be auto-filed");
    const studentAssignments = await jsonRequest(baseUrl, "/api/workspace/assignments", { session: loggedStudentCookie });
    assert.equal(studentAssignments.response.status, 200);
    assert.equal(studentAssignments.data.records.length, 1, "enrolled student should see published class assignments");
    const nonEnrolledStudentAssignments = await jsonRequest(baseUrl, "/api/workspace/assignments", { session: secondStudentCookie });
    assert.equal(nonEnrolledStudentAssignments.response.status, 200);
    assert.equal(nonEnrolledStudentAssignments.data.records.length, 0, "students with matching profile attributes but no enrolment must not see class assignments");
    const studentCannotCreateAcademicAssignment = await jsonRequest(baseUrl, "/api/workspace/assignments", {
      method: "POST", session: loggedStudentCookie, body: { title: "Unauthorized assignment", fields: {} },
    });
    assert.equal(studentCannotCreateAcademicAssignment.response.status, 403);
    const studentSubmissionWithGradeFields = await jsonRequest(baseUrl, "/api/workspace/assignment-submissions", {
      method: "POST", session: loggedStudentCookie,
      body: { title: "My submission", fields: { assignmentId: publishedAssignment.data.record._id, submissionUrl: "https://example.invalid/report.pdf", marksAwarded: 50 } },
    });
    assert.equal(studentSubmissionWithGradeFields.response.status, 400, "students must not set their own marks or faculty feedback");
    const studentSubmission = await jsonRequest(baseUrl, "/api/workspace/assignment-submissions", {
      method: "POST", session: loggedStudentCookie,
      body: { title: "My submission", fields: { assignmentId: publishedAssignment.data.record._id, submissionUrl: "https://example.invalid/report.pdf", submissionNotes: "Completed." } },
    });
    assert.equal(studentSubmission.response.status, 201);
    assert.ok(studentSubmission.data.record.folderId, "student submission should be auto-filed");
    const facultySubmissionInbox = await jsonRequest(baseUrl, "/api/workspace/assignment-submissions", { session: facultyCookie });
    assert.equal(facultySubmissionInbox.response.status, 200);
    assert.ok(facultySubmissionInbox.data.records.some((row) => row._id === studentSubmission.data.record._id), "assigned faculty should see submissions for their class-subject");

    // An administrator may publish work for another subject in the same class,
    // but faculty assigned only to CS101 must not see or grade CS102 submissions.
    const secondSubjectAssignment = await jsonRequest(baseUrl, "/api/workspace/assignments", {
      method: "POST", session: adminCookie,
      body: {
        title: "Data Structures Assignment", status: "Published", visibility: "class", classId,
        subjectCode: "CS102", fields: { subjectName: "Data Structures", maxMarks: 20, instructions: "Submit a short solution." },
      },
    });
    assert.equal(secondSubjectAssignment.response.status, 201);
    const studentSecondSubjectSubmission = await jsonRequest(baseUrl, "/api/workspace/assignment-submissions", {
      method: "POST", session: loggedStudentCookie,
      body: { title: "Data Structures work", fields: { assignmentId: secondSubjectAssignment.data.record._id, submissionUrl: "https://example.invalid/data-structures.pdf" } },
    });
    assert.equal(studentSecondSubjectSubmission.response.status, 201);
    const refreshedFacultyInbox = await jsonRequest(baseUrl, "/api/workspace/assignment-submissions", { session: facultyCookie });
    assert.equal(refreshedFacultyInbox.response.status, 200);
    assert.ok(!refreshedFacultyInbox.data.records.some((row) => row._id === studentSecondSubjectSubmission.data.record._id), "faculty must not see a different subject's submissions within an otherwise assigned class");
    const facultyCannotGradeOtherSubject = await jsonRequest(baseUrl, `/api/workspace/assignment-submissions/${studentSecondSubjectSubmission.data.record._id}`, {
      method: "PUT", session: facultyCookie, body: { fields: { marksAwarded: 18, feedback: "Not your allocated subject" } },
    });
    assert.equal(facultyCannotGradeOtherSubject.response.status, 403);

    const facultyGradeOutOfRange = await jsonRequest(baseUrl, `/api/workspace/assignment-submissions/${studentSubmission.data.record._id}`, {
      method: "PUT", session: facultyCookie, body: { fields: { marksAwarded: 51, feedback: "Good work" } },
    });
    assert.equal(facultyGradeOutOfRange.response.status, 400, "faculty marks must not exceed assignment maximum");
    const facultyGrade = await jsonRequest(baseUrl, `/api/workspace/assignment-submissions/${studentSubmission.data.record._id}`, {
      method: "PUT", session: facultyCookie, body: { fields: { marksAwarded: 45, feedback: "Clear and complete." } },
    });
    assert.equal(facultyGrade.response.status, 200);
    assert.equal(facultyGrade.data.record.fields.marksAwarded, 45);
    assert.equal(facultyGrade.data.record.fields.feedback, "Clear and complete.");

    const facultyClasses = await jsonRequest(baseUrl, `/api/faculty/${facultyId}/classes`, { session: facultyCookie });
    assert.equal(facultyClasses.response.status, 200);
    assert.equal(facultyClasses.data.classes.length, 1);
    const classRoster = await jsonRequest(baseUrl, `/api/classes/${classId}/students`, { session: facultyCookie });
    assert.equal(classRoster.response.status, 200);
    assert.equal(classRoster.data.students.length, 1);

    // Faculty attendance create/read/update persists to the shared Attendance model.
    const attendanceCreated = await jsonRequest(baseUrl, "/api/attendance", {
      method: "POST", session: facultyCookie,
      body: {
        facultyId, classId, subjectId, date: "2026-11-12",
        records: [{ studentId, status: "present", remarks: "Smoke-test attendance" }],
      },
    });
    assert.equal(attendanceCreated.response.status, 200);
    assert.equal(attendanceCreated.data.records.length, 1);
    assert.ok(stores.attendance[0]?.folderId, "attendance should be auto-filed");
    const attendanceId = attendanceCreated.data.records[0].id;
    assert.equal(attendanceCreated.data.records[0].status, "present");
    const attendanceUpdated = await jsonRequest(baseUrl, `/api/attendance/${attendanceId}`, {
      method: "PUT", session: facultyCookie, body: { status: "late", remarks: "Updated in smoke test" },
    });
    assert.equal(attendanceUpdated.response.status, 200);
    assert.equal(attendanceUpdated.data.record.status, "late");
    const studentAttendance = await jsonRequest(baseUrl, "/api/student/attendance/STU-1001", { session: loggedStudentCookie });
    assert.equal(studentAttendance.response.status, 200);
    assert.equal(studentAttendance.data.attendance.length, 1);
    assert.equal(studentAttendance.data.attendance[0].percentage, 100);
    assert.equal(studentAttendance.data.attendance[0].history[0].status, "Late");

    // A student can attach a sick certificate to their own attendance row;
    // the upload is pending until the assigned faculty member reviews it.
    const testPdfBase64 = Buffer.from("%PDF-1.4\nS-VYASA test certificate").toString("base64");
    const studentDocumentUpload = await jsonRequest(baseUrl, `/api/attendance/${attendanceId}/documents`, {
      method: "POST", session: loggedStudentCookie,
      body: { documentType: "sick-certificate", fileName: "medical-certificate.pdf", mimeType: "application/pdf", contentBase64: testPdfBase64, note: "Medical leave supporting document" },
    });
    assert.equal(studentDocumentUpload.response.status, 201);
    assert.equal(studentDocumentUpload.data.document.reviewStatus, "pending");
    assert.ok(stores.attendanceDocuments[0]?.folderId, "attendance document should be automatically filed");
    const studentDocumentDownload = await fetch(`${baseUrl}/api/attendance-documents/${studentDocumentUpload.data.document.id}/download`, {
      headers: { cookie: loggedStudentCookie },
    });
    assert.equal(studentDocumentDownload.status, 200);
    assert.match(await studentDocumentDownload.text(), /^%PDF-1\.4/);
    const facultyDocumentReview = await jsonRequest(baseUrl, `/api/attendance-documents/${studentDocumentUpload.data.document.id}/review`, {
      method: "PATCH", session: facultyCookie, body: { reviewStatus: "approved", reviewRemarks: "Verified during smoke test." },
    });
    assert.equal(facultyDocumentReview.response.status, 200);
    assert.equal(facultyDocumentReview.data.document.reviewStatus, "approved");

    // Faculty access is scoped to the exact class/subject assignments, not merely
    // to any class in which the student happens to be enrolled.
    const secondClassCreated = await jsonRequest(baseUrl, "/api/admin/classes", {
      method: "POST", session: adminCookie,
      body: { department: "Computer Science", semester: 2, academicYear: "2026-2027", section: "B", name: "Computer Science - Semester 2 - Section B" },
    });
    assert.equal(secondClassCreated.response.status, 201);
    const secondClassId = secondClassCreated.data.class._id;
    const secondSubjectCreated = await jsonRequest(baseUrl, "/api/admin/subjects", {
      method: "POST", session: adminCookie,
      body: { code: "CS202", name: "Data Structures", department: "Computer Science", semester: 2, section: "B" },
    });
    assert.equal(secondSubjectCreated.response.status, 201);
    const secondSubjectId = secondSubjectCreated.data.subject._id;
    const secondEnrollment = await jsonRequest(baseUrl, "/api/admin/enrollments", {
      method: "POST", session: adminCookie, body: { studentId, classId: secondClassId },
    });
    assert.equal(secondEnrollment.response.status, 201);
    const otherClassAttendance = await jsonRequest(baseUrl, "/api/attendance", {
      method: "POST", session: adminCookie,
      body: { facultyId, classId: secondClassId, subjectId: secondSubjectId, date: "2026-11-13", records: [{ studentId, status: "absent" }] },
    });
    assert.equal(otherClassAttendance.response.status, 200);
    const facultyScopedAttendance = await jsonRequest(baseUrl, `/api/student/${studentId}/attendance`, { session: facultyCookie });
    assert.equal(facultyScopedAttendance.response.status, 200);
    assert.equal(facultyScopedAttendance.data.records.length, 1, "faculty must not see attendance from unassigned classes");
    const facultyWrongSubjectAttendanceList = await jsonRequest(baseUrl, `/api/attendance?classId=${classId}&subjectId=${secondSubjectId}`, { session: facultyCookie });
    assert.equal(facultyWrongSubjectAttendanceList.response.status, 403, "class membership cannot expand faculty access to an unassigned subject");
    const facultyUnassignedClass = await jsonRequest(baseUrl, `/api/student/${studentId}/attendance?classId=${secondClassId}`, { session: facultyCookie });
    assert.equal(facultyUnassignedClass.response.status, 403);
    const facultyUnassignedSubject = await jsonRequest(baseUrl, `/api/student/${studentId}/attendance?classId=${classId}&subjectId=${secondSubjectId}`, { session: facultyCookie });
    assert.equal(facultyUnassignedSubject.response.status, 403);

    // Faculty marks create/read plus the Student's own marks view.
    const marksSaved = await jsonRequest(baseUrl, "/api/marks", {
      method: "POST", session: facultyCookie,
      body: { classId, subjectId, records: [{ studentId, cia1: 18, cia2: 20, cia3: 17, internal1: 19, internal2: 16 }] },
    });
    assert.equal(marksSaved.response.status, 200);
    assert.equal(marksSaved.data.records.length, 1);
    assert.ok(stores.marks[0]?.folderId, "marks should be auto-filed");
    assert.equal(marksSaved.data.records[0].total, 90);
    assert.equal(marksSaved.data.records[0].average, 18);
    assert.equal(marksSaved.data.records[0].ciaAverage, 18.33);
    assert.equal(marksSaved.data.records[0].internalAverage, 17.5);
    assert.equal(marksSaved.data.records[0].ciaCount, 3);
    assert.equal(marksSaved.data.records[0].internalCount, 2);
    const facultyMarks = await jsonRequest(baseUrl, `/api/marks?classId=${classId}&subjectId=${subjectId}`, { session: facultyCookie });
    assert.equal(facultyMarks.response.status, 200);
    assert.equal(facultyMarks.data.students.length, 1);
    const studentMarks = await jsonRequest(baseUrl, "/api/student/marks/STU-1001", { session: loggedStudentCookie });
    assert.equal(studentMarks.response.status, 200);
    assert.equal(studentMarks.data.marks.length, 1);
    assert.equal(studentMarks.data.marks[0].total, 90);
    assert.equal(studentMarks.data.marks[0].ciaAverage, 18.33);
    assert.equal(studentMarks.data.marks[0].internalAverage, 17.5);
    const invalidMarks = await jsonRequest(baseUrl, "/api/marks", {
      method: "POST", session: facultyCookie,
      body: { classId, subjectId, records: [{ studentId, cia1: 101 }] },
    });
    assert.equal(invalidMarks.response.status, 400);
    const deleteClassWithRecords = await jsonRequest(baseUrl, `/api/admin/classes/${classId}`, { method: "DELETE", session: adminCookie });
    assert.equal(deleteClassWithRecords.response.status, 409, "classes with attendance records must not be deleted");
    const deleteSubjectWithRecords = await jsonRequest(baseUrl, `/api/admin/subjects/${subjectId}`, { method: "DELETE", session: adminCookie });
    assert.equal(deleteSubjectWithRecords.response.status, 409, "subjects with attendance or marks must not be deleted");

    // Faculty event CRUD, with student read-only access.
    const eventCreated = await jsonRequest(baseUrl, "/api/events", {
      method: "POST", session: facultyCookie,
      body: { title: "Smoke Test Event", startsAt: "2026-11-20T10:00:00.000Z", location: "Test Hall", description: "Temporary test event" },
    });
    assert.equal(eventCreated.response.status, 201);
    assert.ok(stores.events[0]?.folderId, "event should be auto-filed");
    const eventId = eventCreated.data.event._id;
    const eventListBeforeApproval = await jsonRequest(baseUrl, "/api/events", { session: loggedStudentCookie });
    assert.equal(eventListBeforeApproval.response.status, 200);
    assert.equal(eventListBeforeApproval.data.events.length, 0, "students must not see pending events");
    const studentCannotCreateEvent = await jsonRequest(baseUrl, "/api/events", {
      method: "POST", session: loggedStudentCookie,
      body: { title: "Forbidden", startsAt: "2026-11-21T10:00:00.000Z" },
    });
    assert.equal(studentCannotCreateEvent.response.status, 403);
    const studentCannotApprove = await jsonRequest(baseUrl, `/api/events/${eventId}/approval`, {
      method: "POST", session: loggedStudentCookie, body: { status: "Granted" },
    });
    assert.equal(studentCannotApprove.response.status, 403);
    const eventApproved = await jsonRequest(baseUrl, `/api/events/${eventId}/approval`, {
      method: "POST", session: adminCookie, body: { status: "Granted" },
    });
    assert.equal(eventApproved.response.status, 200);
    assert.equal(eventApproved.data.event.permissionStatus, "Granted");
    const eventList = await jsonRequest(baseUrl, "/api/events", { session: loggedStudentCookie });
    assert.equal(eventList.response.status, 200);
    assert.equal(eventList.data.events.length, 1);
    const facultyCannotEditGranted = await jsonRequest(baseUrl, `/api/events/${eventId}`, {
      method: "PUT", session: facultyCookie, body: { title: "Attempted unauthorized update" },
    });
    assert.equal(facultyCannotEditGranted.response.status, 403);
    const eventUpdated = await jsonRequest(baseUrl, `/api/events/${eventId}`, {
      method: "PUT", session: adminCookie, body: { title: "Updated Smoke Test Event" },
    });
    assert.equal(eventUpdated.response.status, 200);
    assert.equal(eventUpdated.data.event.title, "Updated Smoke Test Event");
    const eventDeleted = await jsonRequest(baseUrl, `/api/events/${eventId}`, { method: "DELETE", session: adminCookie });
    assert.equal(eventDeleted.response.status, 200);
    assert.equal(stores.events.length, 0);

    // The actual token expires; it cannot remain valid after its signed expiry.
    process.env.JWT_EXPIRES_IN = "1s";
    const shortLogin = await jsonRequest(baseUrl, "/api/auth/login", {
      method: "POST", body: { identifier: "FAC-001", password: "Faculty-Test-Password!", role: "faculty" },
    });
    assert.equal(shortLogin.response.status, 200);
    const expiredCookie = cookie(shortLogin.response);
    await new Promise((resolve) => setTimeout(resolve, 1150));
    const expiredSession = await jsonRequest(baseUrl, "/api/auth/me", { session: expiredCookie });
    assert.equal(expiredSession.response.status, 401);
    process.env.JWT_EXPIRES_IN = "1h";

    assert.ok(studentId);
    assert.ok(secondStudentId);
    assert.ok(facultyId);
    assert.ok(admin._id);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
