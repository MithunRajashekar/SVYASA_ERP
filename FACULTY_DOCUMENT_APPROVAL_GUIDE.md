# Faculty approval of sick certificates and OD letters

## Who can approve

- The assigned Faculty member can approve or reject a student's sick certificate or OD letter when the Faculty member has an active assignment for the exact class and subject linked to the attendance record.
- An Administrator can review documents across the institution.
- Students can submit and view their own documents and review decisions. Students cannot approve or reject documents.

## Faculty workflow

1. Open the Faculty Portal and select **Attendance**.
2. Select the class/subject allocation linked to the student's document.
3. Select the same attendance date to which the student attached the document.
4. Find the student's row. The submitted document appears under **Remarks & supporting documents** with a **Pending** status.
5. Download and inspect the document.
6. Enter an optional review remark and select **Approve** or **Reject**.
7. The page refreshes the document status inline. No separate approval page is opened.

## Student visibility

The student sees the document status and any review remark in their attendance history. The updated version also identifies whether the decision was made by **Faculty** or **Administrator**.

## Scope and security

Faculty review is enforced by the backend. A Faculty member must be assigned to the exact class and subject on the linked attendance record. Hiding or showing buttons in the browser is not the security boundary. The review endpoint accepts only authenticated `faculty` and `admin` roles and re-checks the assignment before saving a decision.

## Decision audit

Each reviewed document stores the reviewer account, reviewer role, decision timestamp and review remarks. Existing documents without the reviewer-role field remain readable; that field is populated for decisions made after this update.
