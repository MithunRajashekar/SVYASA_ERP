# S-VYASA ERP: CIA/Internal Assessments and Attendance Documents

This guide describes the updated workflow in the three-portal ERP.

## 1. Assessment structure

Each student/subject record now has five score fields:

| Assessment | Database field | Position in the average |
|---|---|---|
| CIA 1 | `cia1` | CIA average |
| CIA 2 | `cia2` | CIA average |
| CIA 3 | `cia3` | CIA average |
| Internal 1 | `internal1` | Internal average |
| Internal 2 | `internal2` | Internal average |

### Score and average rules

- Each score is currently validated between 0 and 100.
- CIA Average = arithmetic mean of the entered CIA 1, CIA 2 and CIA 3 scores.
- Internal Average = arithmetic mean of the entered Internal 1 and Internal 2 scores.
- Empty fields are excluded from the interim average. For example, if CIA 1 and CIA 2 are entered but CIA 3 is blank, the CIA average is calculated from the two entered values and the interface displays `2/3 entered`.
- The combined average over all five fields is an informational value only. It does not replace the separate CIA and Internal averages.
- The backend validates and recalculates all summaries. The frontend preview is not the source of truth.

**Configuration assumption:** the current implementation assumes all five marks are on a 0–100 scale and that each score has equal weight within its own average. If S-VYASA uses different maximum marks (for example CIA out of 20 and Internal out of 50) or a weighted formula, the maximums and formula must be configured before official results are published.

## 2. Faculty: enter marks

1. Sign in to the Faculty portal.
2. Open **CIA & Internal Marks**.
3. Select the assigned class and subject.
4. Enter CIA 1, CIA 2 and CIA 3 in their own columns.
5. Enter Internal 1 and Internal 2 in their own columns.
6. Review the separately calculated CIA Average and Internal Average.
7. Save the marks.

Faculty access is limited by the backend to the class/subject combinations assigned to that faculty account. Students must be enrolled in the selected class before their record can be marked.

## 3. Admin and Faculty: Excel marks import

The Excel / Bulk Import workspace uses these exact mark columns:

```text
studentId, cia1, cia2, cia3, internal1, internal2
```

1. Open **Excel / Bulk Import**.
2. Select **CIA & Internal marks register**.
3. Select an existing class/subject allocation.
4. Download the workbook template.
5. Fill the student ID/USN and any marks being imported.
6. Leave fields blank when you do not want to change an existing score.
7. Upload the workbook and run validation.
8. Review invalid rows and warnings before committing valid rows.

The server checks student enrolment, faculty allocation and score range. The file import is limited to 2,000 rows and 5 MB. A blank mark cell preserves the existing value rather than deleting it.

## 4. Attendance: one-page faculty workflow for attendance and documents

The Faculty portal uses one continuous **Attendance Management** page. There is no second attendance page, document page, modal or navigation step after saving.

1. Sign in to the Faculty portal.
2. Open **Attendance** and choose the assigned class/subject and attendance date.
3. Mark each student's attendance and enter the normal attendance remark, if required.
4. In the same student row, choose **Sick certificate** or **OD letter**, select a PDF/JPG/JPEG/PNG file (maximum 5 MB), and optionally enter a document note. These controls are available before the attendance is saved.
5. Click the single page-level **Save Attendance & Documents** button. The ERP saves/upserts the attendance rows first, then uploads the files selected on those rows without navigating away or opening another page.
6. Saved documents appear inline beside the same student's attendance remarks, with their review status and download action.
7. After the first save, changing attendance/remarks or selecting another document enables **Save Changes & Documents**. If nothing has changed, the button displays **Saved** and is disabled.

The save action is protected against repeat clicks while the request is in progress. The backend attendance key is student + class + subject + date and is upserted, so a repeated save updates the same attendance row rather than creating a second row. If one document upload fails after attendance is saved, the affected file remains selected on that same row with an inline error so the user can retry from the same page.

Faculty uploads are marked approved because the faculty member is the authorized uploader for that allocated class/subject. The document appears alongside the attendance remark in the **Remarks & supporting documents** area.

## 5. Attendance: student submits supporting proof

1. Sign in to the Student portal.
2. Open **My Attendance**.
3. Find the relevant subject and date in the attendance history.
4. Choose **Sick certificate** or **OD letter**.
5. Select a PDF, JPG/JPEG or PNG file (maximum 5 MB), add an optional note and click **Submit**.

Students can submit documents only against their own saved attendance records. Student uploads are marked **Pending** until reviewed. A document upload does not automatically change Present/Absent/Late status or alter the attendance percentage.

## 6. Review and download

Assigned Faculty and Administrators can:

- Open the document from the attendance row.
- Download it after the server checks access to the linked attendance record.
- Approve or reject a pending student upload.
- Add an optional review remark.

Students can view/download documents attached to their own attendance entries. A review decision does not change the attendance status. If attendance needs correction, use the normal attendance correction workflow separately.

## 7. Where the information is stored

- Mark values and calculated summaries are stored in the existing `marks` collection.
- Attendance data remains in the existing `attendance` collection.
- Certificate/OD metadata and file bytes are stored in the `attendancedocuments` collection.
- Each attendance document links to the exact attendance row, student, class and subject. The backend assigns its automatic folder reference; users do not create folders.

For compatibility, startup maps old `cia4` values to `internal1` and old `cia5` values to `internal2` only when the destination Internal field is empty. Existing Internal scores are not overwritten. The old fields are retained as hidden legacy fields for recovery/audit.

## 8. Operational limits and production note

- Only PDF, JPEG and PNG are accepted.
- Maximum document size is 5 MB per upload.
- The current implementation stores file bytes in MongoDB. This is convenient for development and small tests, but repeated document uploads can consume Atlas storage quickly. Before institution-wide production use, move file bytes to private object storage and keep metadata/reference IDs in MongoDB.
- Keep the database user least-privileged, restrict Atlas Network Access, use HTTPS in production, configure backups and follow the university's approved retention/access policy for medical certificates and OD letters.


### Sick certificate and OD-letter approval authority

Student-submitted sick certificates and OD letters enter `pending` review. Faculty members can approve or reject documents only when they are assigned to the exact class and subject linked to the attendance record. Administrators retain institution-wide review authority. The system records the reviewer role (`faculty` or `admin`), decision, timestamp and review remarks; students can see the decision and who made it in their attendance history. Faculty review is available inline in the Faculty Portal under Attendance Management, on the same attendance page.
