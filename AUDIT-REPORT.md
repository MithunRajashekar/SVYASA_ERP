# S-VYASA ERP - Rebuild and Completion Report

**Scope:** three separate role portals, shared backend/database, completion of visible prototype modules into database-backed workflows, automatic record filing and local setup simplification.

## 1. Delivered architecture

| Component | Local address | Implementation |
|---|---|---|
| Administrator portal | `http://localhost:5175` | `admin-app/`, shared role portal shell |
| Faculty portal | `http://localhost:5173` | `src/`, shared role portal shell |
| Student portal | `http://localhost:5174` | `student-app/`, shared role portal shell |
| Shared API | `http://localhost:4000` | Node.js / Express |
| Database | Atlas | MongoDB / Mongoose |

The three portals use one API and one Atlas database. The API checks both the user's role and relevant class, subject, student ownership or publication scope. Client-side navigation is not relied on for access control.

## 2. Administrator capabilities

- Provision administrator, faculty and student accounts; edit user contact/academic details; activate/deactivate users; reset passwords.
- Create, edit and safely remove classes and subjects, with dependency checks to protect existing academic history.
- Assign faculty to class/subject combinations and enrol students in classes; remove allocations/enrolments only where the implemented history checks allow it.
- Review student module requests and faculty event proposals; approve/reject workflows.
- Create/manage university events and publish university-level academic/student service records.
- Manage class/subject academic content and student services across modules.
- Inspect the automatically generated folder registry (read-only; no manual folder operations).
- Inspect and correct institution-wide attendance and CIA/Internal marks through administrator-only reporting endpoints.

## 3. Faculty capabilities

- Sign in only through the Faculty portal.
- Read only their own assigned class/subject allocations.
- Mark and update attendance only for students enrolled in an assigned class/subject.
- Enter three CIA scores and two Internal assessment scores (0–100 each); API computes CIA Average and Internal Average separately.
- Create class-scoped timetables, exam timetables, lesson plans, assessments and assignments.
- Review/grade assignment submissions for students in assigned classes; validate marks against the assignment maximum and save feedback.
- Create mentoring records for students in assigned classes and review their mentoring requests.
- Publish department-scoped notices/calendar records and submit event proposals for Administrator approval.
- Browse university-level career postings but cannot create central placement/internship/soft-skills opportunities.

## 4. Student capabilities

- Sign in only through the Student portal.
- View their own attendance, CIA scores and Internal scores; access other students' personal records is denied server-side.
- View published university/department/class timetable, exam schedule, assessments, assignments, notices, academic calendar and approved events.
- Submit assignment work once per eligible assignment and view faculty feedback/status.
- Submit and track mentoring, fee, library, hostel and general administrative requests.
- Apply to published placement/internship opportunities and enrol in soft-skills programmes; server checks publication, deadlines, duplicate submissions and configured seat limits.
- Change their own password.

## 5. Modules made database-backed

The shared `ModuleRecord` collection provides validated persistence, role rules, ownership, statuses, visibility and automatic folder links for:

- Class timetable and exam timetable
- Lesson plans, assessments, assignments and assignment submissions
- Mentoring and mentoring requests
- Academic calendar and notices
- Fee records and fee queries
- Library catalogue and library requests
- Hostel requests
- Placement opportunities and applications
- Internship opportunities and applications
- Soft-skills programmes and enrolments
- General student requests

Separate established models remain in use for Users, ClassSection, Subject, FacultyAssignment, Enrollment, Attendance, Marks, Event and DataFolder.

## 6. Automatic data filing

MongoDB does not support physical folders. The ERP implements a logical hierarchy using `DataFolder` documents. When the backend creates or saves supported records, it generates/reuses the folder hierarchy and links the record with `folderId`. Folder registry access is read-only in the Administrator portal. Users are not asked to name, create, move or sort folders.

## 7. Security and setup changes

- The API entry point loads the project-root `.env`.
- `DATABASE_URL` and a strong `JWT_SECRET` are the only required app secrets for local setup.
- The API connects to Atlas before listening and bootstraps the first `ERP-ADMIN` account only when the database contains no administrator.
- Passwords use bcrypt hashes; sessions use an HttpOnly cookie; login attempts are rate-limited.
- Public self-registration is disabled; accounts are provisioned by an authenticated administrator.
- Protected endpoints enforce role and record-level access. Administrator-only routes are protected on the server. Portal-specific session cookies and the portal-role header prevent an Administrator, Faculty or Student session from being reused as another role.
- Student class access is based on explicit database enrolments; matching department/semester/section profile fields are not treated as enrolment. Faculty class/subject records and attendance are filtered to exact allocated class/subject pairs.
- Faculty department/subject and Student enrolment alignment is validated when administrators create allocations. Class uniqueness includes academic year; an automatic index migration adds academic year to the former uniqueness rule without rewriting class records.
- Mongoose update operations use `returnDocument: "after"` to avoid the deprecated `new` option warning shown by the previous runtime.
- Development CORS allows the three localhost ports and private IPv4 development origins; production requires explicitly configured origins.

## 8. Known boundaries

The package implements the database-backed workflows described above. It does not include live external services that require institution/vendor accounts or real hardware/inventory. These remain integration work: payment gateway and bank reconciliation, physical library scanner/RFID circulation, placement-provider APIs, email/SMS delivery, private object storage for attendance-document files at larger scale, e-signature and production SSO. The library catalogue/request module is not a barcode circulation system. Hostel room inventory and bed allotment are now implemented in the Admin portal, but there is no external hostel/property management integration or automated waiting-list allocator.

A Free M0 Atlas cluster is suitable for development and a small test deployment, not a production capacity guarantee for a full university.

## 9. Validation status

**Static validation completed in the build environment:**

- Backend JavaScript source files pass `node --check`.
- Frontend JS/JSX syntax parsed with the globally available TypeScript parser.
- Shared portal components are copied identically into the Faculty, Administrator and Student frontend source trees.
- Root and Student package manifests parse as valid JSON.
- The shared module catalogue tests pass: all 22 modules are present in Administrator navigation, module field definitions are valid, and all three portal navigation lists refer to known pages.
- API regression tests are included for student enrolment scoping, exact faculty subject access, assignment-submission grading permissions, portal-role separation and event approvals; they could not execute here because project dependencies are not installed.
- ZIP packaging excludes `.env`, dependency directories and generated build outputs.

**Not verified in this build environment:**

- `npm install` could not complete because dependency retrieval timed out in the isolated environment.
- Consequently, `npm test`, `npm run build:all`, actual browser rendering and full live-Atlas end-to-end testing were not run here.
- The user must run the install/build/test commands on their Windows computer and verify portal workflows with real provisioned accounts.

## 10. Windows startup

For non-technical users, double-click `SETUP-ERP-WINDOWS.bat` once, complete the `.env` file when Notepad opens, and then double-click `START-ERP-WINDOWS.bat`. The two scripts always work from their own project directory, avoiding the nested-folder and PowerShell path mistakes from the earlier setup.

For manual setup, from the folder containing this report and the root `package.json`:

```powershell
npm install
npm --prefix .\student-app install
```

Create `.env` in this same folder. When upgrading from the earlier AutoSetup build, copy your existing `DATABASE_URL` and `JWT_SECRET` values into the new root `.env`. Reuse the same Atlas cluster, database user and `svyasa_erp` database; the existing administrator account is retained. If `FRONTEND_ORIGINS` exists in the old file, remove it for local development or include `http://localhost:5175,http://localhost:5173,http://localhost:5174`.

```env
DATABASE_URL=mongodb+srv://<database-user>:<url-encoded-password>@<cluster-host>/svyasa_erp?retryWrites=true&w=majority
JWT_SECRET=<random-secret-at-least-32-characters>
```

Then start all services:

```powershell
npm run dev:all
```

Do not run the demo seeder against a real database. If Atlas already contains `ERP-ADMIN`, startup will not issue another temporary password; use the existing credential, then rotate it immediately if it was exposed.


## Bulk import enhancement (November 2026)

Added an Excel / Bulk Import workspace to the Administrator and Faculty portals. Supported imports: student accounts, faculty accounts, classes/sections, subjects, student enrolments, faculty assignments, attendance and CIA/Internal marks. XLSX/XLS/CSV parsing runs in the browser using the existing `xlsx` dependency. The server validates rows, scopes faculty imports to the signed-in faculty member's allocation, checks student enrolment, performs idempotent upserts where appropriate, assigns automatic folders and stores import summary history without storing workbooks or plaintext temporary passwords. Account imports generate one-time temporary credentials in the commit response. File limit: 5 MB; row limit: 2,000. Other generic ModuleRecord-backed services remain on their existing forms and are not included in this import enhancement.


## 11. CIA/Internal assessment and attendance-document enhancement

The marks model and all active portal marks views now use exactly three CIA fields (`cia1`–`cia3`) and two Internal fields (`internal1`–`internal2`). Each score is validated from 0 to 100. CIA total/count/average and Internal total/count/average are calculated independently. Partial averages use only entered scores and show the entered count. An informational combined average is retained separately. Excel marks templates and the legacy student marks view were aligned to the same five fields.

A startup compatibility migration maps legacy `cia4` to `internal1` and `cia5` to `internal2` only where the target Internal field is empty. It retains old CIA4/5 values as hidden legacy fields for audit/recovery and never overwrites an existing Internal mark.

The attendance workflow supports sick certificates and OD letters in PDF, JPEG or PNG format, up to 5 MB per document. Faculty save the attendance row first and attach a document to that exact student/class/subject/date row; students can submit documents only against their own attendance records. The existing attendance remark and document metadata appear together in the Remarks & documents area. Student uploads start Pending and assigned Faculty or Admin can approve/reject them with an optional review remark. Download access is checked against the linked attendance record and the caller role. File bytes are currently stored in MongoDB; private object storage is recommended before larger institutional rollout.

## 12. Additional validation for this enhancement

- Five focused Node unit tests pass for the CIA/Internal field set, separate averages, partial averages, blank-cell-preserving imports, score validation and legacy CIA4/5 migration.
- Backend syntax checks pass for the changed assessment, attendance, marks, imports, student and database modules.
- Frontend JSX parsing passes for the shared Academic Records and Bulk Import screens in all three portals and the legacy student marks page.
- Full API smoke tests and Vite production builds remain unverified in this isolated packaging environment because dependencies are not installed here. Run `npm install`, `npm --prefix .\student-app install`, `npm test` and `npm run build:all` on the Windows development machine before using production records.


## One-page faculty attendance workflow update

Faculty can select a sick certificate or OD letter directly in each student row before saving. The single page-level Save Attendance & Documents action first upserts attendance and then uploads each selected document to the newly saved attendance ID. No second page or per-row Attach action is required. After saving, the same page remains open; documents are shown inline with status. The action is disabled when there are no unsaved changes and is protected against repeated clicks while saving. Failed document uploads remain selected with an inline error for retry.


## 13. New report, mentoring, NOC and hostel features (17 November 2026)

- Added downloadable Excel attendance and CIA/Internal marks reports. Administrator report access is institution-wide; Faculty access is checked against the exact assigned class/subject pair; Students retain personal-only attendance and marks downloads. Attendance report export supports a date range and includes remarks and document review statuses. CIA/Internals exports contain three CIA values, two Internal values, separate averages and completion counts.
- Added Admin-managed mentor-to-mentee assignments for an academic year. A mentor is an existing Faculty account with an additional assigned responsibility, not a new role or separate portal. The schema enforces one mentor assignment per student and academic year; reassignment deactivates a previous active assignment for a different year.
- Added a Faculty Mentoring workspace. Mentors see only their assigned mentees, review OD/sick documents associated with those mentees (subject to the attendance class academic year matching the mentor assignment), and issue/reject NOC requests. Existing teaching-assignment document review remains available. NOC decisions include reviewer role, timestamp, remarks and a generated certificate number. Students can create NOC requests only when assigned an active mentor and can view/download issued certificates. Admin has a university-wide NOC oversight view and owns mentor assignment.
- Added real Admin hostel room inventory and bed allotment. Admin can create rooms, define capacity, allocate individual beds to active students by academic year, view occupied/vacant capacity and release beds. Unique partial indexes and server validation prevent an active student from receiving two allotments for the same year or a bed being allotted twice; capacity is checked before allocation. Student hostel requests remain requests, not automatic allotments.
- Added explicit active-mentor validation before NOC decisions and academic-year filtering in the mentor pending-document inbox so a reassigned mentor does not see older-year documents outside the assignment scope.

## 14. New validation snapshot

The focused source-level regression suite `node --test tests/module-catalog.test.js tests/document-review-authorization.test.js tests/mentor-hostel-reports.test.js tests/assessment.test.js` passes **19/19 tests**. Tests cover portal navigation, Admin mentor assignment, mentee-scoped document review, NOC issue/reject, Admin room inventory/bed allotment and class/subject-scoped attendance/marks downloads. This does not replace live Atlas, browser or full Vite build testing.
