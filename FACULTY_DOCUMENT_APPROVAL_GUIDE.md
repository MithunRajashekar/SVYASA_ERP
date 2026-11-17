# Faculty approval of sick certificates and OD letters

## Who can approve

- A Faculty member can approve or reject a student's sick certificate or OD letter when either (a) they have an active allocation for the exact class and subject linked to the attendance record, or (b) the Administrator has assigned that student to them as a mentor while the student is currently assigned to that mentor. This also allows the current mentor to review historical attendance documents for that mentee.
- Mentors use **Mentoring** to review documents for assigned mentees, including documents for subjects they do not teach. The mentor must have an active assignment for that student. The current mentor may review historical documents for the currently assigned mentee; a former mentor loses access after reassignment.
- An Administrator can review documents across the institution.
- Students can submit and view their own documents and review decisions. Students cannot approve or reject documents.

## Faculty workflow

**Teaching assignment route:** Open the Faculty Portal → **Attendance**, select the class/subject and attendance date, find the student row, download the Pending document, add an optional review remark and choose **Approve** or **Reject** inline.

**Mentor route:** Open the Faculty Portal → **Mentoring**. Pending OD/sick documents from the Faculty member's assigned mentees appear in one inbox, including documents for subjects they do not teach. Download the document, add a review remark and choose **Approve** or **Reject**.

## Student visibility

The student sees the document status and any review remark in their attendance history. The updated version also identifies whether the decision was made by **Faculty** or **Administrator**.

## Scope and security

Faculty review is enforced by the backend. A Faculty member must be assigned to the exact class and subject on the linked attendance record. Hiding or showing buttons in the browser is not the security boundary. The review endpoint accepts only authenticated `faculty` and `admin` roles and re-checks the assignment before saving a decision.

## Decision audit

Each reviewed document stores the reviewer account, reviewer role, decision timestamp and review remarks. Existing documents without the reviewer-role field remain readable; that field is populated for decisions made after this update.


## Student certificate records and mentoring

- Open **Mentoring** and select an assigned mentee to open the student dossier.
- The dossier includes recorded personal/contact details, academic records, fees, certificates, attendance documents, NOC history, hostel records and mentoring history.
- Use **Add certificate** to attach an individual student certificate to that mentee's record. Accepted file types are PDF, JPG/JPEG and PNG, up to 5 MB.
- Student-uploaded certificates appear in the pending certificate inbox. Review and record approval/rejection remarks.
- Mentors can schedule a mentoring session at any time with a required agenda, date/time, duration, mode and optional location/meeting link. When completing the session, enter private mentor notes, a student-facing summary, follow-up date and action items.
- Private notes authored by a different/previous mentor are not exposed to the current mentor.
- NOC requests and issued NOCs are handled within **Mentoring**; there is no separate NOC navigation item.
