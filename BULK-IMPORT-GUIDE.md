# S-VYASA ERP: Excel / Bulk Import Guide

The Administrator and Faculty portals now have an **Excel / Bulk Import** menu. Use the template downloaded from that page. The first worksheet is the import sheet; the second worksheet contains instructions.

## Import types and columns

### Administrator: Student accounts

`userId, name, usn, email, phone, department, program, semester, section`

Example:

| userId | name | usn | email | department | program | semester | section |
|---|---|---|---|---|---|---:|---|
| MCA2026001 | Student Example | 1SV26MCA001 | student@example.edu | Computer Science | MCA | 1 | A |

Account passwords are generated automatically. Download the temporary credential report immediately after import and share each credential privately. The user must change the password after first sign-in. Account creation and class enrolment are separate steps.

### Administrator: Faculty accounts

`userId, name, email, phone, department, program`

Example:

| userId | name | email | department | program |
|---|---|---|---|---|
| FAC001 | Faculty Example | faculty@example.edu | Computer Science | MCA |

Faculty allocations are a separate step and must be completed before a faculty member can import attendance or marks.

### Administrator: Classes / sections

`department, academicYear, semester, section, name`

The ERP matches a class using department + academic year + semester + section. `name` may be blank; the ERP then generates a display name.

### Administrator: Subjects

`subjectCode, subjectName, department, semester, section`

`subjectCode` is the unique subject key. Semester and section may be blank for shared subjects.

### Administrator: Student enrolments

`studentId, department, academicYear, semester, section`

`studentId` accepts an existing student's User ID or USN. The class must already exist.

### Administrator: Faculty assignments

`facultyId, subjectCode, department, academicYear, semester, section, slot`

`facultyId` accepts an existing faculty User ID. The faculty, subject and class must exist and be compatible.

### Administrator and Faculty: Attendance

`studentId, date, status, remarks`

Before uploading, select the exact class-subject allocation in the portal. `studentId` accepts User ID or USN. Date format: `YYYY-MM-DD`. Status must be `present`, `absent` or `late`. The student must be enrolled in the selected class.

### Administrator and Faculty: CIA and Internal marks

`studentId, cia1, cia2, cia3, internal1, internal2`

Before uploading, select the exact class-subject allocation. Every score must be between 0 and 100. At least one score cell must have a value. Blank cells leave existing scores unchanged. The ERP calculates the CIA average from the three CIA scores and the Internal average from the two Internal scores separately. Each average includes only entered scores; incomplete entries show their entered count (for example, 2/3 or 1/2). The overall average across all entered assessments is also retained for reporting.

### Attendance: supporting sick certificates and OD letters

Students can attach a PDF, JPG/JPEG or PNG sick certificate or OD letter to one of their own saved attendance records. Faculty can attach a document to records in their allocated class-subject combinations; administrators can review institution-wide records. A document is displayed inside the attendance **Remarks & documents** column, along with the upload note and review status.

- Attendance must be saved first so that the document is linked to a specific attendance date and student.
- Maximum document size is 5 MB per file.
- Student-uploaded documents enter **Pending** review. The assigned faculty member or an administrator can approve or reject them and add review remarks.
- Faculty/admin documents are marked **Approved** on upload.
- Download access is limited to the student whose attendance it belongs to, faculty assigned to that class-subject pair, and administrators.
- The file is stored in the MongoDB `attendancedocuments` collection and automatically filed in the academic folder hierarchy. For large production deployments, move file bytes to private object storage (for example, institution-managed S3/Azure Blob) and retain only metadata in MongoDB to limit database growth.

## Workflow

1. Open **Excel / Bulk Import** in the Administrator or Faculty portal.
2. Select the data type and download the matching Excel template.
3. Add rows beneath the header row. Keep the headers as supplied.
4. Keep IDs and USNs formatted as Text so Excel does not strip leading zeroes. Use values rather than formulas.
5. For attendance and marks, select the class-subject allocation before uploading.
6. Upload `.xlsx`, `.xls` or `.csv` and select **Validate spreadsheet**.
7. Review valid/invalid counts, warnings, error rows and preview. Validation does not write to MongoDB.
8. Select **Import valid rows**. The server validates again before committing.
9. Download the temporary-password file immediately for new accounts. Share it privately and ask recipients to change their passwords.

## Safeguards and limits

- Maximum 2,000 data rows and 5 MB per file.
- The first worksheet is imported. Other worksheets are ignored.
- Invalid rows are skipped and listed in the downloadable error report.
- Duplicate rows within the same workbook are rejected during validation.
- Existing accounts are never overwritten by user imports. Duplicate User IDs, USNs or email addresses are rejected.
- Class and subject records can be updated by their unique academic key. Repeated enrolments and faculty allocations are reused rather than duplicated.
- Existing attendance for the same student, class, subject and date is updated with the imported status/remarks.
- For marks, non-empty CIA and Internal values update the marks register. CIA and Internal averages are calculated separately. Blank cells preserve any existing values.
- Faculty are restricted by the API to their own class-subject allocations. The server also checks the student's enrolment for every attendance/marks row.
- Import history records the actor, file name, data type, timestamp and row counts. The original workbook and plaintext temporary passwords are not retained in import history.
- Every saved academic record uses the normal automatic folder-filing system. Nobody manually creates or sorts database folders.

Bulk import for other ModuleRecord-based areas (such as timetables, lesson plans, fees, library inventory and placement opportunities) is not included in this release; those modules continue to use their existing forms.
