# S-VYASA ERP: Reports, Mentoring, NOC and Hostel Allotment Guide

This guide describes the four additional workflows added to the existing three-portal ERP. The application still has exactly three portals: Administrator, Faculty and Student.

## 1. Download attendance and CIA/Internal reports

### Administrator
1. Sign in at `http://localhost:5175`.
2. Open **Download Reports**.
3. Select a class and subject.
4. Optionally choose attendance start and end dates.
5. Click **Load reports**.
6. Download **Attendance Excel** and/or **Marks Excel**.

The Administrator can select any institution class/subject. Attendance exports include student, class, date, subject, status, remarks, supporting document names/statuses and faculty marker. Marks exports include CIA 1, CIA 2, CIA 3, CIA average, Internal 1, Internal 2, Internal average and assessment completion counts.

### Faculty
1. Sign in at `http://localhost:5173`.
2. Open **Download Reports**.
3. Choose only a class and subject already assigned to your faculty account.
4. Load and download the workbooks.

The backend rechecks the faculty assignment. Changing a URL or request parameter does not grant access to another faculty member's class.

### Student
Students use **My Attendance** and **My Marks** to download only their own records. The Student portal does not expose class-wide reports.

## 2. Admin assigns mentors

A mentor is an existing Faculty member. Do not create a duplicate user or a fourth portal.

1. Sign in as Administrator at `http://localhost:5175`.
2. Open **Mentoring**.
3. Choose an active Faculty account.
4. Choose an active Student account.
5. Enter the academic year (for example, `2026-2027`) and optional assignment notes.
6. Click **Assign mentor**.

The assignment appears in the list. The server permits one active mentor for a student within an academic year. Reassigning a student updates the existing assignment and routes the student’s pending NOC requests and student-uploaded certificates to the new mentor. The Admin can deactivate an assignment at any time.

## 3. Faculty mentoring workspace

After Admin assigns mentees, the Faculty member opens **Mentoring** at `http://localhost:5173`. It contains:

- **My mentees**: the students actively assigned to this faculty member and the academic year.
- **Pending OD & sick certificates**: supporting documents from those mentees. The mentor can download the private document, add a review remark and approve/reject it. The student must currently be assigned to the reviewing mentor. The current mentor can review historical attendance documents for that mentee, including records from earlier academic years; a former mentor loses access after reassignment. Faculty also retain the existing approval permission for their own teaching allocations.
- **NOC requests**: students' requests routed to the assigned mentor. The mentor can approve and issue an NOC or reject it with a remark. Issuance creates an NOC number and timestamp.
- **NOCs issued**: a record of issued certificates.

If a student has been reassigned or the mentor assignment has been deactivated, the previous mentor cannot decide a still-pending NOC request. The Administrator can inspect NOC history in the Mentoring workspace.

## 4. Student NOC request

1. Sign in at `http://localhost:5174`.
2. Open **Mentoring → NOC**.
3. Confirm that an assigned mentor is displayed. If not, contact the Administrator.
4. Enter the reason/purpose and any supporting details.
5. Submit the request.
6. Track the request status in **NOC history**. When issued, download the NOC PDF.

A student can have only one pending NOC request at a time. A request is routed to the student's current active mentor assignment. When Admin reassigns the student, pending NOC requests are routed to the new mentor.

## 5. Admin hostel room and bed allotment

1. Sign in at `http://localhost:5175`.
2. Open **Hostel Room Allotment**.
3. Under **Add hostel room**, enter hostel name, block, floor, room number, room type and bed capacity.
4. Add every required room to the inventory.
5. Under **Allocate a bed to a student**, select an active student, an available room, a bed number and academic year.
6. Click **Confirm allotment**.
7. Use **Active allotments** to view placements and **Release bed** when a student vacates.

The backend blocks: a second active allotment for the same student/year, an already occupied bed, a bed number above the room capacity, and over-capacity rooms. A room with active occupants cannot be removed.

Students may submit hostel accommodation requests through the Student portal, but a request does not reserve a room. The Administrator performs the actual room/bed allotment.

## 6. Data and permission model

- `MentorAssignment` stores the faculty/student relationship, academic year, active state, assigning Admin and optional notes.
- `StudentNoc` stores the request, purpose, status, mentor, review metadata, NOC number and automatic folder link.
- `HostelRoom` stores room inventory and capacity.
- `HostelAllotment` stores the selected student, room, bed, academic year, allocator and release status.
- Attendance and marks exports are generated from existing records and do not create duplicate academic data.
- New records receive generated `folderId` values through the automatic filing utility. Users do not manually create folders.

## 7. Testing checklist

- Admin assigns a Faculty mentor to one test student; the mentee appears in that Faculty's workspace.
- A document submitted by that mentee appears in the mentor's pending list and can be reviewed. A document from a non-mentee does not appear and cannot be reviewed.
- The student submits an NOC request; the assigned mentor issues or rejects it; the student sees the resulting status and reviewer details.
- Admin creates a two-bed room and allots bed 1 and bed 2 to two students. A third allocation into the same full room is rejected. Attempting to allocate an occupied bed is rejected.
- Admin downloads attendance and marks reports. Faculty downloads reports only for assigned class/subject combinations. Student downloads only personal records.

## 8. Deployment and limitations

Run the existing installation from the root folder: `npm install`, `npm --prefix .\student-app install`, `npm test`, `npm run build:all`, then `npm run dev:all`. Preserve the existing `.env` locally; never commit it.

The included tests are source-level regression tests. Perform live Atlas/browser testing before using official student records. Hostel allotment is an internal ERP workflow, not an integration to a third-party hostel platform. NOC PDFs are generated in the browser and are not digitally signed; if the University requires an official signature/seal or a legally recognised certificate workflow, connect an approved e-signature or institutional signing process.


## Extended Mentoring workspace (17 November update)

The navigation label is **Mentoring** in Admin, Faculty and Student portals. NOC is a section inside Mentoring, not a separate navigation item.

### Mentor session planning and records
- An existing Faculty account can be assigned as a Mentor; this does not create a fourth portal or separate login.
- Admin assigns each student to one active mentor per academic year.
- Mentors can schedule a mentoring session for an assigned mentee at any time, recording date/time, agenda, mode, duration, room/meeting link and a student-visible summary.
- On completion, mentors record private notes, a student-visible outcome, follow-up date and up to 20 action items. Session history remains in the mentor and student Mentoring workspaces.

### Complete assigned-mentee record
- A Mentor can open the complete record only for students currently assigned to them as active mentees.
- The dossier includes identity/contact and configured personal/guardian/emergency details, enrolments, attendance history and linked OD/medical documents, CIA 1–3 and Internal 1–2 marks with averages, fee records (total, paid and outstanding), hostel allotments, NOC history, certificates and other student-linked service/application records.
- The API checks the active mentor assignment on every dossier, certificate, download and session request. Reassignment/deactivation removes access to the former mentor.
- The current Mentor can see the student's historical attendance, certificates, fees and mentoring timeline while the active assignment exists. Private notes from sessions conducted by a previous Mentor are not revealed to the new Mentor.

### Student certificates
- Students can upload individual academic, achievement, workshop, internship, participation, sports and cultural certificates from Mentoring.
- The assigned mentor receives pending submissions in a Mentoring inbox, can open/download and approve/reject with remarks.
- Mentors can also add a certificate directly to an individual mentee's permanent student record. Student-uploaded certificates remain pending until reviewed.

### Privacy note
Personal, guardian, financial, attendance and academic information is sensitive. It is returned only to an authenticated, active assigned Mentor for the relevant student; students receive only their own records and the student-visible mentoring summary. The student does not receive mentor-only session notes.


## Extended Mentoring workspace: sessions, full student records and certificates

### Navigation and role model

The navigation label is **Mentoring** in all three portals. NOC is a feature inside Mentoring, not a separate tab or fourth portal. A mentor is an existing Faculty account with an Admin-assigned mentoring responsibility. Teaching allocations and mentoring assignments remain distinct permissions.

### Mentor-to-mentee access

Admin assigns a Faculty member to a student for an academic year. Only the student's currently assigned mentor can open that student's complete dossier. The server validates the active assignment on every dossier/session/certificate request. After reassignment, the former mentor loses access; pending student certificate and NOC requests are routed to the new mentor.

### Full student dossier

The mentor dossier brings together the student information currently recorded in the ERP: basic identity and contact fields; address, guardian and emergency-contact details where supplied; enrolments; attendance history and linked OD/sick documents; CIA 1–3 and Internal 1–2 marks with averages; fee records showing total amount, amount paid and outstanding amount; certificates; other student-linked service/application records; NOC history; hostel allotments; and mentoring history. Fee balances are derived from fee records actually stored in the ERP. Missing or externally recorded transactions cannot be inferred.

### Mentoring sessions

A mentor can schedule a session whenever needed for a currently assigned mentee. Each session requires an agenda and date/time and supports duration, mode (in-person/online/phone), location or meeting link, student-facing summary, follow-up date and action items. When completing a session, the mentor can record private mentor notes and update action-item status. Student-facing summaries and action items are shown in the Student portal; private mentor notes are not exposed to students.

A current mentor can see historical session details for a newly assigned mentee, including the previous mentor's name, agenda, date, student-facing summary and action items. Private notes authored by a different mentor remain hidden.

### Individual student certificates

A mentor can add a certificate directly to an individual mentee's record, with title, category, issuer, issue date, description and a PDF/JPG/PNG attachment (maximum 5 MB). A student can also upload their own certificates through Student → Mentoring. Student-uploaded certificates enter the pending-review inbox. The mentor can inspect, download and approve/reject them while the student remains actively assigned to that mentor.

### NOC inside Mentoring

Students submit NOC requests from Student → Mentoring. Requests route to the current mentor; mentors may issue or reject with remarks. Issued NOCs receive a generated number and downloadable PDF. Admin retains institution-wide oversight.
