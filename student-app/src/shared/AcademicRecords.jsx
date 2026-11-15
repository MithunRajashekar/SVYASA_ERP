import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle, Check, ClipboardCheck, LoaderCircle, Save, RefreshCw,
  Search, Paperclip, Upload, CheckCircle2, XCircle,
} from "lucide-react";
import { api, fmtDate } from "./api";

const CIA_FIELDS = ["cia1", "cia2", "cia3"];
const INTERNAL_FIELDS = ["internal1", "internal2"];
const MARK_FIELDS = [...CIA_FIELDS, ...INTERNAL_FIELDS];
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

function averageFor(fields, values = {}) {
  const entered = fields.map((field) => values[field]).filter((value) => value !== null && value !== undefined && value !== "").map(Number).filter(Number.isFinite);
  return entered.length ? (entered.reduce((sum, value) => sum + value, 0) / entered.length).toFixed(2) : "—";
}

function documentLabel(type) {
  return type === "od-letter" ? "OD letter" : "Sick certificate";
}

async function fileToBase64(file) {
  if (!file) throw new Error("Choose a document first.");
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error("Each document must be 5 MB or smaller.");
  const allowed = ["application/pdf", "image/jpeg", "image/png"];
  if (!allowed.includes(file.type)) throw new Error("Only PDF, JPG/JPEG and PNG files are accepted.");
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return window.btoa(binary);
}

function DocumentList({ documents = [], onReview, onDownload, showReview = false }) {
  const [reviewRemarks, setReviewRemarks] = useState({});
  if (!documents.length) return <span className="erp-muted">No supporting document</span>;
  return <div className="erp-attendance-documents">
    {documents.map((document) => <div className="erp-attendance-document" key={document.id}>
      <div className="erp-attendance-document-main">
        <Paperclip size={13}/>
        <button type="button" className="erp-document-download" onClick={() => onDownload?.(document)} title={`Download ${document.originalName}`}>
          {documentLabel(document.documentType)} · {document.originalName}
        </button>
        <span className={`erp-doc-status erp-doc-status-${document.reviewStatus}`}>{document.reviewStatus}</span>
      </div>
      {document.note && <small>{document.note}</small>}
      {document.reviewStatus === "pending" && <small>Awaiting review by the assigned faculty member or an administrator.</small>}
      {document.reviewStatus !== "pending" && document.reviewedByRole && <small>{document.reviewStatus === "approved" ? "Approved" : "Rejected"} by {document.reviewedByRole === "faculty" ? "Faculty" : "Administrator"}{document.reviewedAt ? ` · ${new Date(document.reviewedAt).toLocaleDateString("en-IN")}` : ""}</small>}
      {document.reviewRemarks && <small>Review: {document.reviewRemarks}</small>}
      {showReview && document.reviewStatus === "pending" && <div className="erp-document-review">
        <small><strong>Faculty document decision</strong> · You can approve or reject this document for your assigned class and subject.</small>
        <input className="erp-input erp-inline-input" value={reviewRemarks[document.id] || ""} onChange={(event) => setReviewRemarks((current) => ({ ...current, [document.id]: event.target.value }))} placeholder="Review remark (optional)"/>
        <div className="erp-row-actions">
          <button className="erp-button erp-button-small" onClick={() => onReview?.(document.id, "approved", reviewRemarks[document.id] || "")}><CheckCircle2 size={13}/> Approve</button>
          <button className="erp-button erp-button-light erp-button-small" onClick={() => onReview?.(document.id, "rejected", reviewRemarks[document.id] || "")}><XCircle size={13}/> Reject</button>
        </div>
      </div>}
    </div>)}
  </div>;
}

function DocumentUpload({ value, onChange, onUpload, disabled, label = "Attach certificate / OD", hideSubmit = false, helperText = "" }) {
  return <div className="erp-document-upload">
    <select className="erp-input erp-inline-select" value={value?.documentType || "sick-certificate"} disabled={disabled} onChange={(event) => onChange({ ...(value || {}), documentType: event.target.value })}>
      <option value="sick-certificate">Sick certificate</option>
      <option value="od-letter">OD letter</option>
    </select>
    <input key={value?.resetKey || 0} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={disabled} onChange={(event) => onChange({ ...(value || {}), file: event.target.files?.[0] || null })}/>
    <input className="erp-input erp-inline-input" value={value?.note || ""} disabled={disabled} onChange={(event) => onChange({ ...(value || {}), note: event.target.value })} placeholder="Document note (optional)"/>
    {value?.file && <small className="erp-document-selected">Selected: {value.file.name}</small>}
    {helperText && <small className="erp-muted">{helperText}</small>}
    {!hideSubmit && <button type="button" className="erp-button erp-button-light erp-button-small" disabled={disabled || !value?.file} onClick={onUpload}><Upload size={13}/>{label}</button>}
  </div>;
}

function RoleAcademicRecords({ module, user }) {
  const isStudent = user.role === "student";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [summary, setSummary] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [roster, setRoster] = useState([]);
  const [marks, setMarks] = useState([]);
  const [query, setQuery] = useState("");
  const selected = assignments.find((item) => item.assignmentId === assignmentId) || assignments[0] || null;

  const loadStudent = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const code = user.student_id || user.code || user.usn;
      if (module === "attendance") {
        const result = await api(`/api/student/attendance/${encodeURIComponent(code)}`);
        setSummary(result.attendance || []);
      } else {
        const result = await api(`/api/student/marks/${encodeURIComponent(code)}`);
        setSummary(result.marks || []);
      }
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, [module, user.code, user.student_id, user.usn]);

  const loadAssignments = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await api(`/api/faculty/${user.id}/classes`);
      const list = (result.classes || []).map((item) => ({
        assignmentId: String(item.assignmentId || item._id),
        classId: String(item.classId?._id || item.classId),
        subjectId: String(item.subjectId?._id || item.subjectId),
        className: item.className || item.classId?.name || "Class",
        subjectName: item.subject || item.subjectId?.name || "Subject",
        subjectCode: item.subjectCode || item.subjectId?.code || "",
        label: `${item.className || item.classId?.name || "Class"} · ${item.subject || item.subjectId?.name || "Subject"}`,
      }));
      setAssignments(list);
      if (list.length) setAssignmentId((current) => list.some((item) => item.assignmentId === current) ? current : list[0].assignmentId);
      else setAssignmentId("");
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, [user.id]);

  const loadRoster = useCallback(async () => {
    if (!selected) return;
    setLoading(true); setError("");
    try {
      if (module === "attendance") {
        const [rosterResult, recordsResult] = await Promise.all([
          api(`/api/classes/${selected.classId}/students`),
          api(`/api/attendance?classId=${selected.classId}&subjectId=${selected.subjectId}&date=${date}`),
        ]);
        const saved = new Map((recordsResult.records || []).map((item) => [item.studentId, item]));
        const rows = (rosterResult.students || []).map((student) => {
          const record = saved.get(student.id);
          return {
            ...student,
            status: record?.status || "present",
            remarks: record?.remarks || "",
            attendanceId: record?.id || "",
            documents: record?.documents || [],
            documentUpload: { documentType: "sick-certificate", file: null, note: "", resetKey: 0 },
            documentUploadError: "",
            dirty: false,
          };
        });
        setRoster(rows);
      } else {
        const result = await api(`/api/marks?classId=${selected.classId}&subjectId=${selected.subjectId}`);
        setMarks((result.students || []).map((student) => ({ ...student, marks: student.marks || {} })));
      }
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, [date, module, selected]);

  useEffect(() => {
    if (isStudent) loadStudent();
    else if (user.role === "admin") return;
    else loadAssignments();
  }, [user.role, isStudent, loadStudent, loadAssignments]);

  useEffect(() => { if (!isStudent && selected) loadRoster(); }, [isStudent, selected, date, module, loadRoster]);

  async function saveAttendance() {
    if (!selected || saving || !roster.length) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      // Attendance and any selected documents are committed from this one page action.
      // The API upserts on student + class + subject + date, so repeated saves update the same record.
      const result = await api("/api/attendance", { method: "POST", body: {
        facultyId: user.id, classId: selected.classId, subjectId: selected.subjectId, date,
        records: roster.map((row) => ({ studentId: row.id, status: row.status, remarks: row.remarks })),
      } });
      const savedByStudent = new Map((result.records || []).map((record) => [record.studentId, record]));
      const nextRoster = [];
      const documentErrors = [];
      const attendanceErrors = (result.details || []).map((item) => `${roster[item.index]?.name || `Row ${item.index + 1}`}: ${item.error}`);

      // Upload selected files immediately after attendance IDs are returned. No second screen or per-row Attach action.
      for (const row of roster) {
        const savedRecord = savedByStudent.get(row.id);
        const attendanceId = savedRecord?.id || row.attendanceId || "";
        const nextRow = {
          ...row,
          attendanceId,
          documents: savedRecord?.documents || row.documents || [],
          dirty: false,
          documentUploadError: "",
        };

        if (row.documentUpload?.file) {
          if (!attendanceId) {
            nextRow.documentUploadError = "Attendance for this student was not saved. The selected document is still attached here; correct the attendance error and save again.";
            documentErrors.push(`${row.name}: attendance record was not saved, so the document was not uploaded.`);
          } else {
            try {
              const file = row.documentUpload.file;
              const contentBase64 = await fileToBase64(file);
              const uploadResult = await api(`/api/attendance/${attendanceId}/documents`, { method: "POST", body: {
                documentType: row.documentUpload.documentType,
                fileName: file.name,
                mimeType: file.type,
                contentBase64,
                note: row.documentUpload.note || "",
              } });
              nextRow.documents = [...nextRow.documents, uploadResult.document];
              nextRow.documentUpload = { documentType: "sick-certificate", file: null, note: "", resetKey: (row.documentUpload?.resetKey || 0) + 1 };
            } catch (uploadError) {
              nextRow.documentUploadError = uploadError.message;
              documentErrors.push(`${row.name}: ${uploadError.message}`);
            }
          }
        }
        nextRoster.push(nextRow);
      }

      setRoster(nextRoster);
      if (attendanceErrors.length || documentErrors.length) {
        const issues = [...attendanceErrors, ...documentErrors];
        setError(`Attendance was saved where possible, but ${issues.length} item(s) need attention: ${issues.slice(0, 3).join("; ")}${issues.length > 3 ? "; see affected student rows" : ""}`);
      } else {
        const uploadedCount = roster.filter((row) => row.documentUpload?.file).length;
        setSuccess(uploadedCount
          ? `Attendance and ${uploadedCount} supporting document(s) saved successfully on this page.`
          : "Attendance saved successfully. You can add supporting documents here and save again.");
      }
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  }

  async function uploadStudentDocument(subjectCode, entry) {
    setSaving(true); setError(""); setSuccess("");
    try {
      const file = entry.documentUpload?.file;
      const contentBase64 = await fileToBase64(file);
      const result = await api(`/api/attendance/${entry.id}/documents`, { method: "POST", body: {
        documentType: entry.documentUpload.documentType,
        fileName: file.name,
        mimeType: file.type,
        contentBase64,
        note: entry.documentUpload.note || "",
      } });
      setSummary((items) => items.map((item) => item.subject_code !== subjectCode ? item : {
        ...item,
        history: item.history.map((history) => history.id !== entry.id ? history : {
          ...history,
          documents: [...(history.documents || []), result.document],
          documentUpload: { documentType: "sick-certificate", file: null, note: "", resetKey: (history.documentUpload?.resetKey || 0) + 1 },
        }),
      }));
      setSuccess(result.message || "Document submitted for faculty review.");
    } catch (uploadError) { setError(uploadError.message); }
    finally { setSaving(false); }
  }

  async function reviewDocument(documentId, reviewStatus, reviewRemarks = "") {
    setSaving(true); setError(""); setSuccess("");
    try {
      await api(`/api/attendance-documents/${documentId}/review`, { method: "PATCH", body: { reviewStatus, reviewRemarks } });
      setSuccess(`Attendance document ${reviewStatus}.`);
      await loadRoster();
    } catch (reviewError) { setError(reviewError.message); }
    finally { setSaving(false); }
  }

  async function downloadDocument(document) {
    try {
      const response = await fetch(`/api/attendance-documents/${document.id}/download`, {
        credentials: "include",
        headers: { "X-ERP-Portal-Role": user.role },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Download failed (${response.status}).`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.originalName || "attendance-document";
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) { setError(downloadError.message); }
  }

  async function saveMarks() {
    if (!selected) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const result = await api("/api/marks", { method: "POST", body: {
        classId: selected.classId, subjectId: selected.subjectId,
        records: marks.map((row) => ({ studentId: row.id, ...Object.fromEntries(MARK_FIELDS.map((field) => [field, row.marks[field] ?? null])) })),
      } });
      setSuccess(result.message || "CIA and Internal marks saved successfully.");
      await loadRoster();
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  }

  if (isStudent) return <section className="erp-page">
    <div className="erp-page-head"><div><div className="erp-eyebrow">My Academics</div><h1>{module === "attendance" ? "My Attendance" : "My CIA & Internal Marks"}</h1><p>{module === "attendance" ? "View attendance, remarks and submit supporting sick certificates or OD letters." : "View three CIA scores, two Internal assessments and their separate averages."}</p></div><button className="erp-button erp-button-light" onClick={loadStudent}><RefreshCw size={15}/> Refresh</button></div>
    {(error || success) && <div className={`erp-alert ${error ? "erp-alert-error" : "erp-alert-success"}`}>{error ? <AlertCircle size={16}/> : <Check size={16}/>} {error || success}</div>}
    <div className="erp-card">
      {loading ? <div className="erp-loading"><LoaderCircle className="erp-spin"/> Loading your records…</div> : !summary?.length ? <div className="erp-empty"><ClipboardCheck size={24}/><strong>No records available yet</strong><span>Your records appear after the relevant faculty enters and saves them.</span></div> : module === "attendance" ? <div className="erp-student-attendance-list">
        {summary.map((subject) => <section className="erp-student-attendance-subject" key={subject.subject_code}>
          <div className="erp-student-attendance-heading"><div><strong>{subject.subject_name}</strong><small>{subject.subject_code}</small></div><div><strong>{subject.percentage}%</strong><small>{subject.classes_present} present / {subject.total_classes} classes</small></div></div>
          <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Date</th><th>Status</th><th>Remarks & documents</th><th>Submit document</th></tr></thead><tbody>
            {(subject.history || []).map((entry) => <tr key={entry.id || entry.date}>
              <td>{fmtDate(entry.date)}</td><td><span className={`erp-status status-${String(entry.status).toLowerCase()}`}>{entry.status}</span></td>
              <td><div>{entry.remarks || "—"}</div><DocumentList documents={entry.documents || []} onDownload={downloadDocument}/></td>
              <td><DocumentUpload value={entry.documentUpload} onChange={(value) => setSummary((items) => items.map((item) => item.subject_code !== subject.subject_code ? item : { ...item, history: item.history.map((history) => history.id !== entry.id ? history : { ...history, documentUpload: value }) }))} onUpload={() => uploadStudentDocument(subject.subject_code, entry)} disabled={saving || !entry.id} label="Submit"/></td>
            </tr>)}
          </tbody></table></div>
        </section>)}
      </div> : <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Subject</th><th>CIA 1</th><th>CIA 2</th><th>CIA 3</th><th>CIA Average</th><th>Internal 1</th><th>Internal 2</th><th>Internal Average</th></tr></thead><tbody>{summary.map((row) => <tr key={row.subject_code}><td><strong>{row.subject_name}</strong><small>{row.subject_code}</small></td>{CIA_FIELDS.map((key) => <td key={key}>{row[key] ?? "—"}</td>)}<td><strong>{row.ciaAverage ?? "—"}</strong><small>{row.ciaCount ?? 0}/3 entered</small></td>{INTERNAL_FIELDS.map((key) => <td key={key}>{row[key] ?? "—"}</td>)}<td><strong>{row.internalAverage ?? "—"}</strong><small>{row.internalCount ?? 0}/2 entered</small></td></tr>)}</tbody></table></div>}
    </div>
  </section>;

  const visibleRoster = roster.filter((row) => [row.name, row.usn, row.code].join(" ").toLowerCase().includes(query.toLowerCase()));
  const visibleMarks = marks.filter((row) => [row.name, row.usn, row.code].join(" ").toLowerCase().includes(query.toLowerCase()));
  const attendanceNeedsSave = roster.some((row) => !row.attendanceId || row.dirty || row.documentUpload?.file);
  const allAttendanceSaved = roster.length > 0 && roster.every((row) => Boolean(row.attendanceId));

  return <section className="erp-page">
    <div className="erp-page-head"><div><div className="erp-eyebrow">Teaching</div><h1>{module === "attendance" ? "Attendance Management" : "CIA & Internal Marks Entry"}</h1><p>{module === "attendance" ? "Mark attendance, add remarks and attach sick certificates or OD letters on this page. Review student-submitted documents for your assigned class and subject; Administrators retain institution-wide oversight." : "Enter three CIA scores and two Internal assessment scores. Separate averages are calculated automatically."}</p></div><button className="erp-button erp-button-light" onClick={loadAssignments}><RefreshCw size={15}/> Refresh allocations</button></div>
    {(error || success) && <div className={`erp-alert ${error ? "erp-alert-error" : "erp-alert-success"}`}>{error ? <AlertCircle size={16}/> : <Check size={16}/>} {error || success}</div>}
    <div className="erp-card">
      <div className="erp-toolbar"><label className="erp-form-field erp-toolbar-select"><span>Assigned class / subject</span><select className="erp-input" value={assignmentId} disabled={saving} onChange={(event) => setAssignmentId(event.target.value)}><option value="">Select allocation</option>{assignments.map((item) => <option key={item.assignmentId} value={item.assignmentId}>{item.label}</option>)}</select></label>{module === "attendance" && <label className="erp-form-field erp-toolbar-date"><span>Attendance date</span><input className="erp-input" type="date" value={date} disabled={saving} onChange={(event) => setDate(event.target.value)}/></label>}<label className="erp-search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search students..."/></label></div>
      {loading ? <div className="erp-loading"><LoaderCircle className="erp-spin"/> Loading class records…</div> : !selected ? <div className="erp-empty"><ClipboardCheck size={24}/><strong>No class allocation found</strong><span>Ask the administrator to assign you a class and subject first.</span></div> : module === "attendance" ? <>
        <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Student</th><th>Student ID</th><th>Status</th><th>Remarks & supporting documents</th></tr></thead><tbody>{visibleRoster.map((row) => <tr key={row.id}>
          <td><strong>{row.name}</strong></td><td>{row.usn || row.code}</td>
          <td><select className="erp-input erp-inline-select" value={row.status} disabled={saving} onChange={(event) => setRoster((items) => items.map((item) => item.id === row.id ? { ...item, status: event.target.value, dirty: true } : item))}><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option></select></td>
          <td><input className="erp-input erp-inline-input" value={row.remarks} disabled={saving} onChange={(event) => setRoster((items) => items.map((item) => item.id === row.id ? { ...item, remarks: event.target.value, dirty: true } : item))} placeholder="Attendance remark (optional)"/>
            <DocumentList documents={row.documents || []} onDownload={downloadDocument} onReview={reviewDocument} showReview/>
            <DocumentUpload value={row.documentUpload} hideSubmit helperText="Selected documents are uploaded together when you save attendance." onChange={(value) => setRoster((items) => items.map((item) => item.id === row.id ? { ...item, documentUpload: value, documentUploadError: "" } : item))} disabled={saving}/>
            {row.documentUploadError && <small className="erp-attendance-upload-error">{row.documentUploadError}</small>}
          </td>
        </tr>)}</tbody></table></div>
        <div className="erp-footer-actions"><span>{roster.length} enrolled students · {date} · {roster.filter((row) => row.attendanceId).length}/{roster.length} saved</span><button className="erp-button" disabled={saving || !roster.length || !attendanceNeedsSave} onClick={saveAttendance}><Save size={16}/>{saving ? "Saving attendance & documents…" : attendanceNeedsSave ? (allAttendanceSaved ? "Save Changes & Documents" : "Save Attendance & Documents") : "Saved"}</button></div>
      </> : <>
        <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Student</th><th>Student ID</th>{CIA_FIELDS.map((field, index) => <th key={field}>CIA {index + 1}</th>)}<th>CIA Average</th>{INTERNAL_FIELDS.map((field, index) => <th key={field}>Internal {index + 1}</th>)}<th>Internal Average</th></tr></thead><tbody>{visibleMarks.map((row) => <tr key={row.id}>
          <td><strong>{row.name}</strong></td><td>{row.usn || row.code}</td>
          {CIA_FIELDS.map((field) => <td key={field}><input type="number" min="0" max="100" step="0.5" className="erp-input erp-score-input" value={row.marks[field] ?? ""} onChange={(event) => setMarks((items) => items.map((item) => item.id === row.id ? { ...item, marks: { ...item.marks, [field]: event.target.value === "" ? null : Number(event.target.value) } } : item))}/></td>)}
          <td><strong>{averageFor(CIA_FIELDS, row.marks)}</strong><small>{CIA_FIELDS.filter((field) => row.marks[field] !== null && row.marks[field] !== undefined && row.marks[field] !== "").length}/3 entered</small></td>
          {INTERNAL_FIELDS.map((field) => <td key={field}><input type="number" min="0" max="100" step="0.5" className="erp-input erp-score-input" value={row.marks[field] ?? ""} onChange={(event) => setMarks((items) => items.map((item) => item.id === row.id ? { ...item, marks: { ...item.marks, [field]: event.target.value === "" ? null : Number(event.target.value) } } : item))}/></td>)}
          <td><strong>{averageFor(INTERNAL_FIELDS, row.marks)}</strong><small>{INTERNAL_FIELDS.filter((field) => row.marks[field] !== null && row.marks[field] !== undefined && row.marks[field] !== "").length}/2 entered</small></td>
        </tr>)}</tbody></table></div>
        <div className="erp-footer-actions"><span>{marks.length} enrolled students · 3 CIAs + 2 Internals · each score 0–100</span><button className="erp-button" disabled={saving || !marks.length} onClick={saveMarks}><Save size={16}/>{saving ? "Saving…" : "Save CIA & Internal marks"}</button></div>
      </>}
    </div>
  </section>;
}

function AdminAcademicRegister({ module }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({});

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = module === "attendance" ? await api("/api/hr/attendance") : await api("/api/hr/marks");
      setRecords(result.records || []);
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, [module]);
  useEffect(() => { load(); }, [load]);

  const filtered = records.filter((row) => {
    const text = module === "attendance"
      ? [row.studentName, row.studentUsn, row.facultyName, row.subjectName, row.subjectCode, row.department, row.section, row.date, row.status, row.remarks].join(" ")
      : [row.studentName, row.studentCode, row.subjectName, row.subject_code, row.department].join(" ");
    return text.toLowerCase().includes(query.trim().toLowerCase());
  });

  function startEdit(row) {
    setEditingId(String(row.id || row._id));
    setDraft(module === "attendance"
      ? { status: row.status, remarks: row.remarks || "" }
      : Object.fromEntries(MARK_FIELDS.map((field) => [field, row[field] ?? ""])));
    setError(""); setSuccess("");
  }

  async function save(row) {
    setSaving(true); setError(""); setSuccess("");
    try {
      if (module === "attendance") {
        await api(`/api/attendance/${row.id}`, { method: "PUT", body: draft });
      } else {
        const payload = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value === "" ? null : Number(value)]));
        await api(`/api/hr/marks/${row._id}`, { method: "PUT", body: payload });
      }
      setEditingId(""); setDraft({}); setSuccess("Academic record updated."); await load();
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  }

  async function reviewDocument(documentId, reviewStatus, reviewRemarks = "") {
    setSaving(true); setError(""); setSuccess("");
    try {
      await api(`/api/attendance-documents/${documentId}/review`, { method: "PATCH", body: { reviewStatus, reviewRemarks } });
      setSuccess(`Attendance document ${reviewStatus}.`); await load();
    } catch (reviewError) { setError(reviewError.message); }
    finally { setSaving(false); }
  }

  async function downloadDocument(document) {
    try {
      const response = await fetch(`/api/attendance-documents/${document.id}/download`, {
        credentials: "include",
        headers: { "X-ERP-Portal-Role": "admin" },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Download failed (${response.status}).`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.originalName || "attendance-document";
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) { setError(downloadError.message); }
  }

  return <section className="erp-page">
    <div className="erp-page-head"><div><div className="erp-eyebrow">Administrator · Institution-wide oversight</div><h1>{module === "attendance" ? "Attendance Register" : "CIA & Internal Marks Register"}</h1><p>{module === "attendance" ? "Review attendance, remarks and supporting sick certificates or OD letters across all classes." : "Review three CIA scores and two Internal scores. The separate averages are recalculated by the API."}</p></div><button className="erp-button erp-button-light" onClick={load}><RefreshCw size={15}/> Refresh</button></div>
    {(error || success) && <div className={`erp-alert ${error ? "erp-alert-error" : "erp-alert-success"}`}>{error ? <AlertCircle size={16}/> : <Check size={16}/>} {error || success}</div>}
    <div className="erp-card">
      <div className="erp-toolbar"><div className="erp-record-count"><strong>{records.length}</strong> records</div><label className="erp-search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student, subject, class or date..."/></label></div>
      {loading ? <div className="erp-loading"><LoaderCircle className="erp-spin"/> Loading institution records…</div> : filtered.length === 0 ? <div className="erp-empty"><ClipboardCheck size={24}/><strong>No records found</strong><span>{records.length ? "Try a different search." : "Records will appear here after faculty save them."}</span></div> : module === "attendance" ? <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Date</th><th>Student</th><th>Class / Subject</th><th>Faculty</th><th>Status</th><th>Remarks & documents</th><th>Action</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}>
        <td>{fmtDate(row.date)}</td><td><strong>{row.studentName || "Student"}</strong><small>{row.studentUsn || ""}</small></td><td>{row.department || "—"}<small>{row.subjectCode} · {row.subjectName}</small></td><td>{row.facultyName || "—"}</td>
        <td>{editingId === row.id ? <select className="erp-input erp-inline-select" value={draft.status || row.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option></select> : <span className={`erp-status status-${String(row.status).toLowerCase()}`}>{row.status}</span>}</td>
        <td>{editingId === row.id ? <input className="erp-input erp-inline-input" value={draft.remarks || ""} onChange={(event) => setDraft({ ...draft, remarks: event.target.value })}/> : row.remarks || "—"}<DocumentList documents={row.documents || []} onDownload={downloadDocument} onReview={reviewDocument} showReview/></td>
        <td>{editingId === row.id ? <div className="erp-row-actions"><button className="erp-button erp-button-small" disabled={saving} onClick={() => save(row)}>Save</button><button className="erp-button erp-button-light erp-button-small" onClick={() => setEditingId("")}>Cancel</button></div> : <button className="erp-button erp-button-light erp-button-small" onClick={() => startEdit(row)}>Correct</button>}</td>
      </tr>)}</tbody></table></div> : <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Student</th><th>Subject</th>{CIA_FIELDS.map((field, index) => <th key={field}>CIA {index + 1}</th>)}<th>CIA Average</th>{INTERNAL_FIELDS.map((field, index) => <th key={field}>Internal {index + 1}</th>)}<th>Internal Average</th><th>Action</th></tr></thead><tbody>{filtered.map((row) => <tr key={row._id}>
        <td><strong>{row.studentName || "Student"}</strong><small>{row.studentCode || row.student_id}</small></td><td>{row.subjectName || row.subject_code}</td>
        {CIA_FIELDS.map((field) => <td key={field}>{editingId === String(row._id) ? <input className="erp-input erp-score-input" type="number" min="0" max="100" step="0.5" value={draft[field] ?? ""} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}/> : row[field] ?? "—"}</td>)}
        <td><strong>{row.ciaAverage ?? "—"}</strong><small>{row.ciaCount ?? 0}/3 entered</small></td>
        {INTERNAL_FIELDS.map((field) => <td key={field}>{editingId === String(row._id) ? <input className="erp-input erp-score-input" type="number" min="0" max="100" step="0.5" value={draft[field] ?? ""} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })}/> : row[field] ?? "—"}</td>)}
        <td><strong>{row.internalAverage ?? "—"}</strong><small>{row.internalCount ?? 0}/2 entered</small></td>
        <td>{editingId === String(row._id) ? <div className="erp-row-actions"><button className="erp-button erp-button-small" disabled={saving} onClick={() => save(row)}>Save</button><button className="erp-button erp-button-light erp-button-small" onClick={() => setEditingId("")}>Cancel</button></div> : <button className="erp-button erp-button-light erp-button-small" onClick={() => startEdit(row)}>Correct</button>}</td>
      </tr>)}</tbody></table></div>}
    </div>
  </section>;
}

export default function AcademicRecords(props) {
  return props.user.role === "admin" ? <AdminAcademicRegister module={props.module}/> : <RoleAcademicRecords {...props}/>;
}
