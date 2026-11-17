# S-VYASA University ERP

A three-portal ERP MVP for academic and campus operations. The Administrator, Faculty and Student portals share one Node/Express API and one MongoDB Atlas database. The backend enforces roles and record scope on every protected route; separate navigation is not the security boundary.

## Portal addresses

| Portal | Local address | Purpose |
|---|---|---|
| Administrator | http://localhost:5175 | User administration, academic setup, approvals, university services, system oversight and automatic filing registry |
| Faculty | http://localhost:5173 | Assigned classes, attendance, CIA and Internal marks, lesson plans, assessments, assignments, submissions, mentoring and event proposals |
| Student | http://localhost:5174 | Own timetable, attendance, marks, assignments, requests, campus services and career applications |
| API health | http://localhost:4000/api/health | API and MongoDB connection health |

## Architecture

- Administrator frontend: React + Vite (`admin-app/`)
- Faculty frontend: React + Vite (`src/`)
- Student frontend: React + Vite (`student-app/`)
- Shared backend: Node.js + Express (`server/`)
- Shared screens and role-specific navigation are mirrored across the portal source trees. A Mentor is an existing Faculty account with an Admin-created mentor assignment; this is not a fourth portal or a separate login role.
- Database: MongoDB Atlas + Mongoose
- Authentication: bcrypt password hashes, signed session token in an HttpOnly cookie, role-specific sign-in, rate-limited login and server-side resource checks
- Automatic filing: backend-generated `DataFolder` hierarchy; records store a generated `folderId`. No portal exposes folder creation or manual sorting.

## Windows setup

For a beginner-friendly setup, double-click `SETUP-ERP-WINDOWS.bat`. It creates `.env` from the safe example when needed, opens it in Notepad for the two secret values, and installs the root and Student portal dependencies. Once setup completes, double-click `START-ERP-WINDOWS.bat` to start all four processes. The manual steps below explain the same process in detail.

### 1. Prerequisites

Install Node.js 20.19+ or 22.12+, then restart VS Code. Open a new PowerShell terminal and check:

```powershell
node --version
npm --version
```

### 2. Extract and open the project root

Extract this ZIP to a simple path, for example `D:\ERP\SVYASA-ERP`. Open **the extracted folder that directly contains this README and the root `package.json`** in VS Code. There should not be another nested `ERP-Portal` folder between the opened folder and `package.json`.

### 3. Install dependencies

Run these commands from the root project folder:

```powershell
npm install
npm --prefix .\student-app install
```

The student portal keeps its own package manifest. It is expected that this second install command targets `student-app`.

### 4. Configure Atlas and JWT

Create `.env` beside the root `package.json`. The project needs only these two required values for local development. **If you already created the Atlas cluster and database user for the previous ERP build, reuse them; do not create another cluster or database user.** Copy the existing `DATABASE_URL` and `JWT_SECRET` values into this new project's `.env` file. Keep the same database name (`svyasa_erp`) so the rebuilt portal uses the existing database and administrator account.

```env
DATABASE_URL=mongodb+srv://<database-user>:<url-encoded-password>@<cluster-host>/svyasa_erp?retryWrites=true&w=majority
JWT_SECRET=<random-secret-at-least-32-characters>
```

Generate a JWT secret in PowerShell:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

In Atlas, create a dedicated database user, allow your development computer's current IP in Network Access, and copy the Node.js driver connection string. Do not use an Atlas website login or an `atlasAdmin` database user for the app. URL-encode reserved characters in the database password. Never commit, upload or screenshot `.env`.

The three development portals are allowed automatically by default. If your old `.env` contains a custom `FRONTEND_ORIGINS` line, remove that line for local development, or update it to include **all three** origins: `http://localhost:5175,http://localhost:5173,http://localhost:5174`. An old two-portal allow-list will block the new Administrator portal.

### 5. Start the API and all three portals

Double-click `START-ERP-WINDOWS.bat`, or run the command below from the root project folder:

```powershell
npm run dev:all
```

Keep this terminal open while using the ERP. Press `Ctrl+C` to stop all four processes.

### 6. First administrator account

When a brand-new Atlas database has no administrator, the API automatically creates `ERP-ADMIN` and prints a temporary password once in the API terminal. Save it privately and immediately change it from **My Profile → Change Password** after signing in at http://localhost:5175.

If the database already contains an administrator, startup does not create a second administrator or reprint the existing password. **Your existing `ERP-ADMIN` account remains in Atlas** when you reuse the same database; sign in with its current credentials. If its temporary password was previously visible in a screenshot, change it as soon as you regain access. Do not run `npm run seed:demo` against your real database; that command is intended only for isolated testing and can replace demo-account passwords.

Faculty and student accounts are provisioned by the Administrator portal. The administrator then creates classes and subjects, assigns faculty to class/subject pairs and enrols students into classes. Faculty and student visibility follows these allocations and enrolments.

## Role responsibilities

### Administrator

- Create admin, faculty and student accounts; edit profiles, activate/deactivate accounts and reset passwords.
- Create and maintain classes/sections and subjects.
- Assign faculty to class/subject pairs and enrol students in classes.
- Review student requests, assignment submissions, mentoring requests, pending sick certificates/OD letters and faculty event proposals.
- Assign existing Faculty accounts as mentors to students by academic year; oversee NOC requests and mentor decisions.
- Create hostel room inventory, allocate individual beds to students by academic year, view occupancy and release allotments.
- Publish and manage university timetables, academic calendar, notices, fee records, library catalogue, career opportunities and skills programmes.
- View and correct institution-wide attendance and CIA/Internal records; download class/subject attendance and marks reports.
- Create and manage university events.
- Inspect automatically generated data folders. Folder administration is read-only by design.

### Faculty

- Sign in to the Faculty portal and see only their assigned class/subject allocations.
- Mark/update attendance for students enrolled in their allocated class; add attendance remarks and attach sick certificates or OD letters to the saved student/date record; review student-submitted documents for assigned classes.
- Enter three CIA scores and two Internal assessment scores (0–100 each); CIA Average and Internal Average are calculated separately by the API.
- Create lesson plans, assessments, assignments, class timetables and exam schedules for allocated classes.
- Grade assignment submissions and provide feedback for students within assigned classes.
- Schedule mentoring sessions, retain session notes/action items and handle requests from assigned mentees.
- When Admin assigns a Faculty member as a mentor, review OD/sick documents for those assigned mentees, including historical attendance records and subjects the mentor does not teach, while the student remains currently assigned to them; issue or reject their NOC requests.
- Download attendance and CIA/Internal reports for assigned class/subject combinations only.
- Publish department-level notices/calendar content and submit event proposals for Administrator approval.

### Student

- See only their own attendance, CIA scores and Internal scores; submit a sick certificate or OD letter against one of their own saved attendance entries and view its review status.
- Request an NOC from their assigned mentor, track its review status and download the PDF if issued.
- Download their own attendance and CIA/Internal marks reports; class-wide reports are not exposed to Students.
- View published class/university timetable, notices, academic calendar, assessments, events and eligible assignments.
- Submit assignment links, mentoring requests, fee queries, library/hostel requests and general student requests.
- Apply for published placements/internships and enrol in published soft-skills programmes, subject to deadlines and seat availability.
- View request/application status and change their own password.

## Excel / bulk import

The Administrator and Faculty portals include an **Excel / Bulk Import** workspace. It reads `.xlsx`, `.xls` or `.csv` files in the browser, then sends structured rows to the same protected API used by normal data entry. The original workbook is not stored on the server.

### Supported import types

| Portal | Import type | Notes |
|---|---|---|
| Administrator | Student accounts | Creates accounts; ERP generates temporary passwords and returns a one-time credential report |
| Administrator | Faculty accounts | Same one-time temporary-password workflow |
| Administrator | Classes / sections | Creates or updates by department, academic year, semester and section |
| Administrator | Subjects | Creates or updates by unique subject code |
| Administrator | Student enrolments | Matches an existing student and class; repeated enrolments are reused |
| Administrator | Faculty assignments | Matches existing faculty, subject and class; repeated allocations are reused |
| Administrator and Faculty | Attendance | Import by selected class/subject; validates student enrolment and faculty allocation |
| Administrator and Faculty | CIA and Internal marks | Import `cia1`, `cia2`, `cia3`, `internal1`, `internal2` for a selected class/subject; validates enrolment and scores |

### Import process

1. Open **Excel / Bulk Import** from the portal navigation.
2. Select the import type and download its workbook template. The template includes an `Import Data` sheet and a `Read Me` sheet.
3. Fill data below the exact column headers. Keep IDs/USNs formatted as **Text** so Excel does not remove leading zeroes. Use static values, not formulas. For attendance, dates should be `YYYY-MM-DD`; statuses must be `present`, `absent` or `late`.
4. For attendance and marks, select a class-subject allocation. Faculty only see their own allocations. Admin selects an existing allocation.
5. Upload the workbook and choose **Validate spreadsheet**. Validation checks the database, IDs, class membership, permissions, score limits and duplicate rows without writing data.
6. Review the valid/invalid row counts, warnings and preview. Choose **Import valid rows** to commit. Invalid rows are skipped and listed in the downloadable failure report.
7. For account imports, download the temporary-password workbook immediately and share each credential privately. Temporary passwords are returned only in the import response and are not kept in import history. Users must change the temporary password after first sign-in.

### Import safeguards

- Maximum 2,000 data rows and 5 MB per file. The first worksheet is imported; extra worksheets are ignored.
- A validation preview happens before commit. The server validates again when committing, so client-side edits cannot bypass checks.
- Faculty can import only attendance/marks for their own assigned class and subject. Every student must be enrolled in the selected class.
- Attendance rows with an existing student/class/subject/date key update that record. Existing CIA and Internal values are preserved when the corresponding Excel cell is blank; non-empty cells update the mark sheet. CIA Average (CIA 1–3) and Internal Average (Internal 1–2) are recalculated separately.
- Existing user accounts are never overwritten by account import. Duplicate user IDs, USNs or emails are rejected. Class, subject, enrolment and allocation imports are idempotent/reusable where applicable.
- A server-side import history stores who imported, when, the type, filename and row totals/errors. It does not store the original workbook or plaintext temporary passwords. Admin can see institution-wide history; Faculty can see only their own uploads.
- Core records continue to receive their normal automatic `folderId`; no user creates or sorts storage folders.

**Current scope:** bulk import is implemented for high-volume account, academic master-data, attendance and CIA/Internal-mark workflows. Bulk import for other module records (for example timetables, lesson plans, fees, library inventory and placement opportunities) can be added with module-specific templates and validation; those modules continue to use their existing data-entry forms until that work is completed.

## Modules

- Academic administration: classes, subjects, faculty allocations, student enrolments.
- Teaching and learning: class timetable, exam timetable, lesson plans, assessments, assignments, assignment submissions, attendance, three CIA assessments, two Internal assessments, mentoring and mentoring requests.
- Communication and events: notices, academic calendar, faculty event proposals, administrator approvals and student-facing approved events.
- Student services: fee records and queries, library catalogue and requests, hostel requests, general student requests.
- Career development: placement opportunities/applications, internship opportunities/applications, soft-skills programmes/enrolments.
- System administration: users, approvals, generated folder registry and academic oversight reports.

The shared `ModuleRecord` service persists the above business modules in MongoDB's `modulerecords` collection, with validated module keys, server-owned ownership/status data, scope rules and automatic `folderId` references. Core existing collections remain in use for users, classes, subjects, allocations, enrolments, attendance, marks, events and data folders.

## Build and test

From the root project folder:

```powershell
npm run build:all
npm test
```

`build:all` builds the Faculty, Administrator and Student frontends. `npm test` runs the API smoke tests using an in-memory model adapter, not your live Atlas database. Also test the three portals locally with actual Administrator, Faculty and Student accounts before using real student records.

## Boundaries and production prerequisites

This package implements database-backed core workflows; it does not claim external provider integrations that have not been configured. The following require institution/vendor accounts or real-world inventory/processes: online fee collection/payment gateway, bank reconciliation, physical library barcode/RFID circulation hardware, hostel room/bed inventory, third-party placement-provider APIs, email/SMS delivery, private object storage for attendance documents at larger scale, e-signatures and production SSO. The current library and hostel workflows capture catalogue/request data; they do not control scanners or allocate actual rooms.

A Free M0 Atlas cluster is for development and small-scale testing, not a capacity guarantee for a university-wide production rollout. Before production, use an appropriately sized deployment, least-privilege database credentials, exact HTTPS `FRONTEND_ORIGINS`, TLS, backups, monitoring, audit retention, password recovery procedures and institution-approved data retention controls.

## Important notes

- MongoDB has databases, collections and documents, not physical folders. The ERP represents folders as records in `datafolders` and attaches generated IDs through `folderId`.
- The `.env` file is not included in this ZIP. Re-create it using the steps above.
- During development the API allows localhost and private-LAN HTTP origins for testing. Production must use explicitly configured HTTPS origins.


## CIA, Internal assessment and attendance documents

The marks register uses exactly three CIA scores (`cia1`–`cia3`) and two Internal scores (`internal1`–`internal2`), each on a 0–100 scale. The API calculates CIA Average and Internal Average separately, using only scores entered so far. The administrator and faculty portals show both averages; students can view their own scores and averages. The Excel marks template uses the same five fields.

The attendance register supports PDF/JPG/PNG sick certificates and OD letters (maximum 5 MB each). Documents are attached to a saved attendance row, displayed with remarks, and student uploads are held for assigned-faculty/administrator review. Access to document downloads is checked against the linked attendance record and the caller's role. Document bytes are currently kept in MongoDB; use private object storage before large-scale production to control database growth.


### Sick certificate and OD-letter approval authority

Student-submitted sick certificates and OD letters enter `pending` review. Faculty members can approve or reject documents only when they are assigned to the exact class and subject linked to the attendance record. Administrators retain institution-wide review authority. The system records the reviewer role (`faculty` or `admin`), decision, timestamp and review remarks; students can see the decision and who made it in their attendance history. Faculty review is available inline in the Faculty Portal under Attendance Management, on the same attendance page.


## 13. Mentor, NOC and hostel allotment workflows

- The Administrator assigns existing Faculty accounts as mentors to students for a specified academic year. The same faculty login is used for teaching and mentoring; no fourth portal or separate mentor credentials are created. One active mentor assignment is maintained per student and academic year.
- Faculty see only their own active mentees in **Mentoring**. Mentors can review OD letters and medical/sick certificates submitted by those mentees, even when they do not teach the linked subject, provided the student is currently assigned to that mentor; historical documents remain accessible to the current mentor while the assignment is active. Existing Faculty subject-assignment review permissions remain in place.
- Students can request an NOC from their assigned mentor, track pending/rejected/issued states and download an issued NOC PDF. A mentor can issue or reject a pending request only while the student is actively assigned to that mentor. Decisions retain reviewer identity/role, timestamp, remarks and a generated NOC number when issued. The Administrator has a university-wide NOC oversight view and controls mentor assignment.
- The Administrator creates hostel room inventory (hostel, block/floor, room number, type and bed capacity), allots a specific bed to an active student for an academic year, views occupancy/vacancy and releases allotments. Server-side checks prevent duplicate active student allotments, occupied-bed allocation and allocation beyond room capacity. Student hostel requests remain separate from actual bed allotment; only the Administrator performs the allotment.

## 14. Attendance and marks report downloads

- Administrator can download attendance and CIA/Internal marks workbooks for any selected class and subject.
- Faculty can download workbooks only for their own assigned class/subject combinations. Attendance exports accept an optional date range and include remarks plus OD/sick document review status. Marks exports include CIA 1-3, Internal 1-2, their independent averages and completion counts.
- Students can download their own attendance and marks from the Student portal; they cannot download class-wide reports.

## 15. Current validation snapshot

The focused regression suite for reports, mentor dossiers/sessions/certificates, NOC, hostel, role authorization and portal navigation currently passes **26 tests** using Node's built-in test runner. The API smoke test requires the project dependencies to be installed (including `bcryptjs`); it could not run in the dependency-free packaging workspace. These are source-level/regression checks, not a live MongoDB/Atlas or browser end-to-end test. Run `npm test` and `npm run build:all` on a configured Windows development machine after dependencies are installed.


### Mentoring workspace (17 November update)
- The navigation item is named **Mentoring** across all three portals; NOC is included inside Mentoring rather than shown as a separate tab.
- Admin assigns existing Faculty members to students as Mentors by academic year.
- Mentors schedule sessions with agenda, meeting details and student-visible notes, then record private notes, outcomes, follow-up dates and action items.
- Mentors can open the full dossier for their active mentees, including configured personal/guardian details, attendance, marks, fees paid/outstanding, certificates, hostel/NOC and service records.
- Students upload individual certificates; assigned Mentors review them. Mentors can also add certificates to an individual mentee record.
- Mentor dossier, certificate, download and session endpoints enforce active mentor assignment server-side. Mentor-only session notes are not returned to students.
- The active Mentor can review the mentee's historical ERP records. Private mentor notes from prior Mentors remain restricted to their original authors. Students can see their own session agenda, student-facing summary, follow-up and action items, but not mentor-only notes.


## Extended Mentoring workspace (latest update)

- The navigation item is named **Mentoring** in the Admin, Faculty and Student portals. NOC is a section within Mentoring; it is not a separate portal or top-level tab.
- Admin assigns existing Faculty accounts as mentors and allocates students as mentees by academic year. Mentoring does not create a fourth login role or portal.
- Mentors can schedule sessions whenever needed, with an agenda, date/time, duration, mode, location/meeting link, student-facing summary, follow-up date and action items. After a session, the mentor records private notes and completion details.
- Mentors can open a full dossier for each currently assigned mentee: personal/contact details, guardians and emergency contacts (when recorded), enrolments, historical attendance and linked documents, CIA/Internal marks and averages, fee totals/paid/outstanding and fee records, student certificates, mentoring sessions, NOC history, hostel allotments and other student-linked service records. Access is restricted server-side to currently assigned mentees.
- Historical session entries identify the mentor. Private mentor notes are visible only to the mentor who authored them; current mentors can see prior session agenda, date, student-facing summary and action items, but not another mentor’s private notes.
- Mentors can add certificates individually to a mentee’s student record. Students can upload their own certificates through Student → Mentoring. Student uploads enter review; mentor-added certificates are recorded as added by the assigned mentor.
- A pending certificate inbox helps mentors find student uploads without opening every profile. The mentor must still be the student’s current assigned mentor to review or download that student’s private records.
- NOC remains within the Mentoring workspace. Students request an NOC from their assigned mentor; the mentor can review, issue or reject it; Admin has university-wide oversight.
- Fee totals are calculated from the student-linked fee records currently stored in the ERP. If fee transactions are incomplete or entered outside the ERP, the displayed balance will also be incomplete.
