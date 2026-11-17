import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock, Check, CheckCircle2, ClipboardList, Download, FileCheck2, FilePlus2,
  GraduationCap, LoaderCircle, RefreshCw, ShieldCheck, Users, Wallet, XCircle,
} from "lucide-react";
import { api, fmtDate } from "./api";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value) || 0);
const showValue = (value) => value === null || value === undefined || value === "" ? "—" : value;

async function downloadPrivateFile(url, role, filename) {
  const response = await fetch(url, { credentials: "include", headers: { "X-ERP-Portal-Role": role } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Download failed (${response.status}).`);
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl; link.download = filename || "document";
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

async function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

function DetailField({ label, value }) {
  return <div className="erp-profile-detail"><span>{label}</span><strong>{showValue(value)}</strong></div>;
}

export default function MentorWorkspace({ user }) {
  const [mentees, setMentees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [pendingCertificates, setPendingCertificates] = useState([]);
  const [nocRequests, setNocRequests] = useState([]);
  const [issuedNocs, setIssuedNocs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [remarks, setRemarks] = useState({});
  const [profile, setProfile] = useState(null);
  const [selectedMenteeId, setSelectedMenteeId] = useState("");
  const [sessionForm, setSessionForm] = useState({ studentId: "", sessionAt: "", agenda: "", mode: "in-person", durationMinutes: 30, locationOrLink: "", studentSummary: "" });
  const [certificateForm, setCertificateForm] = useState({ title: "", category: "academic", issuer: "", issueDate: "", description: "", file: null });
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedMentee = useMemo(() => mentees.find((row) => row.student?.id === selectedMenteeId || row.student?._id === selectedMenteeId) || null, [mentees, selectedMenteeId]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [menteeResponse, documentResponse, certificateResponse, nocResponse, issuedResponse, sessionResponse] = await Promise.all([
        api("/api/mentor/mentees"), api("/api/mentor/pending-documents"), api("/api/mentor/pending-certificates"), api("/api/mentor/noc-requests"),
        api("/api/mentor/nocs"), api("/api/mentor/sessions"),
      ]);
      setMentees(menteeResponse.assignments || []);
      setDocuments(documentResponse.documents || []);
      setPendingCertificates(certificateResponse.certificates || []);
      setNocRequests(nocResponse.requests || []);
      setIssuedNocs(issuedResponse.nocs || []);
      setSessions(sessionResponse.sessions || []);
      if (selectedMenteeId && !(menteeResponse.assignments || []).some((row) => String(row.student?.id || row.student?._id) === selectedMenteeId)) {
        setSelectedMenteeId(""); setProfile(null);
      }
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, [selectedMenteeId]);

  useEffect(() => { load(); }, [load]);

  async function openProfile(mentee) {
    const studentId = String(mentee.student?.id || mentee.student?._id || "");
    if (!studentId) return;
    setSelectedMenteeId(studentId); setProfile(null); setProfileLoading(true); setError("");
    try { setProfile(await api(`/api/mentor/mentees/${studentId}/profile`)); }
    catch (loadError) { setError(loadError.message); }
    finally { setProfileLoading(false); }
  }

  async function reviewDocument(document, decision) {
    setBusyId(document.id); setError(""); setSuccess("");
    try {
      await api(`/api/mentor/documents/${document.id}/review`, { method: "PATCH", body: { decision, reviewRemarks: remarks[document.id] || "" } });
      setSuccess(`${document.documentType === "od-letter" ? "OD letter" : "Sick certificate"} ${decision}.`);
      await load();
      if (selectedMenteeId) await openProfile({ student: { id: selectedMenteeId } });
    } catch (actionError) { setError(actionError.message); }
    finally { setBusyId(""); }
  }

  async function reviewNoc(request, decision) {
    setBusyId(request.id); setError(""); setSuccess("");
    try {
      await api(`/api/mentor/noc-requests/${request.id}`, { method: "PATCH", body: { decision, reviewRemarks: remarks[request.id] || "" } });
      setSuccess(decision === "issue" ? `NOC issued to ${request.student?.name || "student"}.` : "NOC request rejected.");
      await load();
    } catch (actionError) { setError(actionError.message); }
    finally { setBusyId(""); }
  }

  async function scheduleSession(event) {
    event.preventDefault();
    if (!sessionForm.studentId) { setError("Select a mentee for this mentoring session."); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      await api(`/api/mentor/mentees/${sessionForm.studentId}/sessions`, {
        method: "POST",
        body: { ...sessionForm, durationMinutes: Number(sessionForm.durationMinutes) },
      });
      setSuccess("Mentoring session scheduled. The student can see the agenda in their Mentoring area.");
      setSessionForm({ studentId: sessionForm.studentId, sessionAt: "", agenda: "", mode: "in-person", durationMinutes: 30, locationOrLink: "", studentSummary: "" });
      await load();
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  }

  async function completeSession(session) {
    const mentorNotes = window.prompt("Mentor-only session notes / outcome", session.mentorNotes || "");
    if (mentorNotes === null) return;
    const studentSummary = window.prompt("Summary visible to the student (optional)", session.studentSummary || "");
    if (studentSummary === null) return;
    const followUpDate = window.prompt("Follow-up date (YYYY-MM-DD, optional)", session.followUpDate ? String(session.followUpDate).slice(0, 10) : "");
    if (followUpDate === null) return;
    const actionItemsText = window.prompt("Action items (one per line, optional)", (session.actionItems || []).map((item) => item.task).join("\n"));
    if (actionItemsText === null) return;
    const actionItems = actionItemsText.split(/\r?\n/).map((task) => task.trim()).filter(Boolean).slice(0, 20).map((task) => ({ task, status: "open" }));
    setBusyId(session.id); setError(""); setSuccess("");
    try {
      await api(`/api/mentor/sessions/${session.id}`, { method: "PATCH", body: { status: "completed", mentorNotes, studentSummary, followUpDate: followUpDate || null, actionItems } });
      setSuccess("Mentoring session record saved."); await load();
      if (selectedMenteeId) await openProfile({ student: { id: selectedMenteeId } });
    } catch (saveError) { setError(saveError.message); }
    finally { setBusyId(""); }
  }

  async function cancelSession(session) {
    if (!window.confirm("Cancel this mentoring session?")) return;
    setBusyId(session.id); setError(""); setSuccess("");
    try { await api(`/api/mentor/sessions/${session.id}`, { method: "PATCH", body: { status: "cancelled" } }); setSuccess("Mentoring session cancelled."); await load(); }
    catch (saveError) { setError(saveError.message); }
    finally { setBusyId(""); }
  }

  async function addCertificate(event) {
    event.preventDefault();
    if (!selectedMenteeId) return;
    if (!certificateForm.file) { setError("Choose a PDF, JPG or PNG certificate first."); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const dataUrl = await readFileAsBase64(certificateForm.file);
      await api(`/api/mentor/mentees/${selectedMenteeId}/certificates`, { method: "POST", body: {
        title: certificateForm.title, category: certificateForm.category, issuer: certificateForm.issuer,
        issueDate: certificateForm.issueDate || null, description: certificateForm.description,
        fileName: certificateForm.file.name, mimeType: certificateForm.file.type, contentBase64: dataUrl,
      } });
      setCertificateForm({ title: "", category: "academic", issuer: "", issueDate: "", description: "", file: null });
      const picker = document.getElementById("mentor-certificate-file"); if (picker) picker.value = "";
      setSuccess("Certificate added to the student's individual record.");
      await openProfile({ student: { id: selectedMenteeId } });
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  }

  async function reviewCertificate(certificate, decision) {
    const reviewRemarks = window.prompt(`${decision === "approved" ? "Approval" : "Rejection"} remark (optional)`, certificate.reviewRemarks || "");
    if (reviewRemarks === null) return;
    setBusyId(certificate.id); setError(""); setSuccess("");
    try {
      await api(`/api/mentor/certificates/${certificate.id}/review`, { method: "PATCH", body: { decision, reviewRemarks } });
      setSuccess(`Student certificate ${decision}.`);
      const studentId = String(certificate.studentId || selectedMenteeId);
      if (studentId) await openProfile({ student: { id: studentId } });
      await load();
    } catch (actionError) { setError(actionError.message); }
    finally { setBusyId(""); }
  }

  async function downloadNoc(record) {
    const element = document.getElementById(`mentor-noc-${record.id}`);
    if (!element) return;
    try {
      const imported = await import("html2pdf.js");
      const html2pdf = imported.default || imported;
      await html2pdf().set({ margin: 12, filename: `${record.nocNumber || "SVYASA-NOC"}.pdf`, image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } }).from(element).save();
    } catch (downloadError) { setError(`Could not create NOC PDF: ${downloadError.message}`); }
  }

  return <section className="erp-page">
    <div className="erp-page-head"><div><div className="erp-eyebrow">Faculty · Student welfare</div><h1>Mentoring</h1><p>Schedule mentoring whenever needed, keep session records, review student requests and access the complete record of your assigned mentees.</p></div><button className="erp-button erp-button-light" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
    {error && <div className="erp-alert erp-alert-error">{error}</div>}
    {success && <div className="erp-alert erp-alert-success">{success}</div>}
    {loading ? <div className="erp-card erp-loading"><LoaderCircle className="erp-spin"/> Loading mentoring workspace…</div> : <>
      <div className="erp-kpi-grid">
        <div className="erp-kpi"><Users size={18}/><div className="erp-kpi-value">{mentees.length}</div><div className="erp-kpi-label">Active mentees</div></div>
        <div className="erp-kpi"><CalendarClock size={18}/><div className="erp-kpi-value">{sessions.filter((row) => row.status === "scheduled").length}</div><div className="erp-kpi-label">Scheduled sessions</div></div>
        <div className="erp-kpi"><FileCheck2 size={18}/><div className="erp-kpi-value">{documents.length}</div><div className="erp-kpi-label">Pending OD / medical reviews</div></div>
        <div className="erp-kpi"><ShieldCheck size={18}/><div className="erp-kpi-value">{nocRequests.length}</div><div className="erp-kpi-label">Pending NOC requests</div></div>
      </div>

      <div className="erp-card">
        <div className="erp-card-title"><Users size={18}/><div><h2>My mentees <span className="erp-counter">{mentees.length}</span></h2><p>Open a student's complete academic, personal, fee and certificate record. Access is restricted to active mentee assignments.</p></div></div>
        {mentees.length ? <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Student</th><th>Department / Programme</th><th>Semester / Section</th><th>Academic year</th><th>Contact</th><th>Record</th></tr></thead><tbody>{mentees.map((row) => { const id = String(row.student?.id || row.student?._id || ""); return <tr key={row.id}><td><strong>{row.student?.name}</strong><small>{row.student?.usn || row.student?.code}</small></td><td>{row.student?.department || "—"}<small>{row.student?.program || ""}</small></td><td>{row.student?.semester ? `Semester ${row.student.semester}` : "—"} · {row.student?.section || "—"}</td><td>{row.academicYear}</td><td>{row.student?.email || "—"}<small>{row.student?.phone || ""}</small></td><td><button className="erp-button erp-button-small" onClick={() => openProfile(row)}><ClipboardList size={13}/> Full student record</button></td></tr>; })}</tbody></table></div> : <div className="erp-empty"><Users size={24}/><strong>No mentees assigned yet</strong><span>Ask the ERP Administrator to assign students to your Faculty account.</span></div>}
      </div>

      <div className="erp-card erp-form-card">
        <div className="erp-card-title"><CalendarClock size={18}/><div><h2>Call / schedule a mentoring session</h2><p>You can initiate a mentoring session whenever needed. Add a clear agenda; the student can see the scheduled meeting in their Mentoring area.</p></div></div>
        <form className="erp-form-grid" onSubmit={scheduleSession}>
          <label className="erp-form-field"><span>Student / mentee *</span><select className="erp-input" required value={sessionForm.studentId} onChange={(event) => setSessionForm({ ...sessionForm, studentId: event.target.value })}><option value="">Select an assigned mentee</option>{mentees.map((row) => <option key={row.id} value={row.student?.id || row.student?._id}>{row.student?.name} · {row.student?.usn || row.student?.code}</option>)}</select></label>
          <label className="erp-form-field"><span>Session date and time *</span><input className="erp-input" type="datetime-local" required value={sessionForm.sessionAt} onChange={(event) => setSessionForm({ ...sessionForm, sessionAt: event.target.value })}/></label>
          <label className="erp-form-field"><span>Mode *</span><select className="erp-input" value={sessionForm.mode} onChange={(event) => setSessionForm({ ...sessionForm, mode: event.target.value })}><option value="in-person">In person</option><option value="online">Online</option><option value="phone">Phone call</option></select></label>
          <label className="erp-form-field"><span>Duration (minutes)</span><input className="erp-input" type="number" min="5" max="480" value={sessionForm.durationMinutes} onChange={(event) => setSessionForm({ ...sessionForm, durationMinutes: event.target.value })}/></label>
          <label className="erp-form-field"><span>Room / meeting link / phone details</span><input className="erp-input" maxLength={500} value={sessionForm.locationOrLink} onChange={(event) => setSessionForm({ ...sessionForm, locationOrLink: event.target.value })} placeholder="Room number or online meeting link"/></label>
          <label className="erp-form-field erp-form-field-wide"><span>Agenda *</span><textarea className="erp-input erp-textarea" rows={3} required maxLength={1500} value={sessionForm.agenda} onChange={(event) => setSessionForm({ ...sessionForm, agenda: event.target.value })} placeholder="What will be discussed? Academic progress, attendance, wellbeing, career guidance, action plan…"/></label>
          <label className="erp-form-field erp-form-field-wide"><span>Message / summary visible to student (optional)</span><textarea className="erp-input erp-textarea" rows={2} maxLength={2000} value={sessionForm.studentSummary} onChange={(event) => setSessionForm({ ...sessionForm, studentSummary: event.target.value })} placeholder="Instructions for the student before the meeting"/></label>
          <div className="erp-form-submit"><button className="erp-button" disabled={saving || !mentees.length}>{saving ? <LoaderCircle className="erp-spin" size={16}/> : <CalendarClock size={16}/>} Schedule mentoring</button></div>
        </form>
      </div>

      <div className="erp-card">
        <div className="erp-card-title"><ClipboardList size={18}/><div><h2>Mentoring session records <span className="erp-counter">{sessions.length}</span></h2><p>Maintain agenda, outcome, mentor-only notes, student-visible summary and follow-up.</p></div></div>
        {sessions.length ? <div className="erp-record-list">{sessions.map((row) => <article className="erp-record" key={row.id}><div className="erp-record-main"><div className="erp-record-top"><h3>{row.student?.name || "Mentee"} · {row.agenda}</h3><span className={`erp-status status-${row.status === "completed" ? "active" : row.status === "cancelled" ? "rejected" : "pending"}`}>{row.status}</span></div><div className="erp-record-meta"><span>{fmtDate(row.sessionAt)}</span><span>{row.mode}</span><span>{row.durationMinutes} minutes</span><span>{row.academicYear}</span></div>{row.locationOrLink && <p>{row.locationOrLink}</p>}{row.mentorNotes && <p><strong>Mentor notes:</strong> {row.mentorNotes}</p>}{row.actionItems?.length > 0 && <p><strong>Action items:</strong> {row.actionItems.map((item) => item.task).join(" · ")}</p>}{row.followUpDate && <small>Follow-up: {fmtDate(row.followUpDate)}</small>}</div>{row.status === "scheduled" && <div className="erp-record-actions"><button className="erp-button erp-button-small" disabled={busyId === row.id} onClick={() => completeSession(row)}><CheckCircle2 size={13}/> Complete & record notes</button><button className="erp-button erp-button-danger erp-button-small" disabled={busyId === row.id} onClick={() => cancelSession(row)}><XCircle size={13}/> Cancel</button></div>}</article>)}</div> : <div className="erp-empty"><CalendarClock size={24}/><strong>No mentoring sessions recorded</strong><span>Schedule your first session above. Completed sessions remain in the record for future reference.</span></div>}
      </div>

      <div className="erp-card">
        <div className="erp-card-title"><FileCheck2 size={18}/><div><h2>Pending OD & sick certificates <span className="erp-counter">{documents.length}</span></h2><p>Review documents submitted by your assigned mentees, even if you do not teach the linked subject.</p></div></div>
        {documents.length ? <div className="erp-record-list">{documents.map((doc) => <article className="erp-record" key={doc.id}><div className="erp-record-main"><div className="erp-record-top"><h3>{doc.documentType === "od-letter" ? "Official Duty (OD) Letter" : "Medical / Sick Certificate"}</h3><span className="erp-doc-status erp-doc-status-pending">Pending</span></div><p className="erp-record-description">{doc.student?.name} · {doc.student?.code} · {doc.class?.name || "Class"} · {doc.subject?.code || "Subject"}</p><div className="erp-record-meta"><span>Attendance date: {fmtDate(doc.attendance?.date)}</span><span>Attendance: {doc.attendance?.status || "—"}</span><span>Uploaded: {fmtDate(doc.createdAt)}</span></div><p>{doc.originalName}{doc.note ? ` · ${doc.note}` : ""}</p><button className="erp-button erp-button-light erp-button-small" onClick={() => downloadPrivateFile(`/api/attendance-documents/${doc.id}/download`, "faculty", doc.originalName).catch((downloadError) => setError(downloadError.message))}><Download size={14}/> Download document</button></div><div className="erp-record-actions"><input className="erp-input erp-inline-input" value={remarks[doc.id] || ""} onChange={(event) => setRemarks((current) => ({ ...current, [doc.id]: event.target.value }))} placeholder="Review remark (optional)"/><div className="erp-row-actions"><button className="erp-button erp-button-small" disabled={busyId === doc.id} onClick={() => reviewDocument(doc, "approved")}><CheckCircle2 size={13}/> Approve</button><button className="erp-button erp-button-danger erp-button-small" disabled={busyId === doc.id} onClick={() => reviewDocument(doc, "rejected")}><XCircle size={13}/> Reject</button></div></div></article>)}</div> : <div className="erp-empty"><Check size={24}/><strong>No pending documents</strong><span>New OD letters and sick certificates from your mentees will appear here.</span></div>}
      </div>

      <div className="erp-card">
        <div className="erp-card-title"><FilePlus2 size={18}/><div><h2>Pending student certificates <span className="erp-counter">{pendingCertificates.length}</span></h2><p>Review certificates submitted by any of your currently assigned mentees, without opening each profile.</p></div></div>
        {pendingCertificates.length ? <div className="erp-record-list">{pendingCertificates.map((row) => <article className="erp-record" key={row.id}><div className="erp-record-main"><h3>{row.title}</h3><p>{row.student?.name || "Student"} · {row.student?.code || ""} · {row.category} · {row.originalName} · {row.issuer || "Issuer not provided"}</p><small>Submitted {fmtDate(row.createdAt)} · {row.academicYear || "Academic year not specified"}</small></div><div className="erp-record-actions"><button className="erp-button erp-button-light erp-button-small" onClick={() => downloadPrivateFile(`/api/mentor/certificates/${row.id}/download`, "faculty", row.originalName).catch((e) => setError(e.message))}><Download size={13}/> View</button><input className="erp-input erp-inline-input" value={remarks[row.id] || ""} onChange={(event) => setRemarks((current) => ({ ...current, [row.id]: event.target.value }))} placeholder="Review remark (optional)"/><button className="erp-button erp-button-small" disabled={busyId === row.id} onClick={() => reviewCertificate(row, "approved")}>Approve</button><button className="erp-button erp-button-danger erp-button-small" disabled={busyId === row.id} onClick={() => reviewCertificate(row, "rejected")}>Reject</button></div></article>)}</div> : <div className="erp-empty"><FileCheck2 size={24}/><strong>No pending student certificates</strong><span>New certificate submissions from your mentees will appear here.</span></div>}
      </div>

      <div className="erp-card">
        <div className="erp-card-title"><ShieldCheck size={18}/><div><h2>NOC requests <span className="erp-counter">{nocRequests.length}</span></h2><p>NOC is part of Mentoring. Issue an NOC after checking the student's request, or reject it with a clear reason.</p></div></div>
        {nocRequests.length ? <div className="erp-record-list">{nocRequests.map((row) => <article className="erp-record" key={row.id}><div className="erp-record-main"><div className="erp-record-top"><h3>{row.student?.name || "Student"}</h3><span className="erp-doc-status erp-doc-status-pending">Pending</span></div><p className="erp-record-description">{row.student?.usn || row.student?.code} · {row.academicYear}</p><strong>Purpose: {row.purpose}</strong><p>{row.details || "No additional details provided."}</p><small>Requested {fmtDate(row.requestedAt)}</small></div><div className="erp-record-actions"><input className="erp-input erp-inline-input" value={remarks[row.id] || ""} onChange={(event) => setRemarks((current) => ({ ...current, [row.id]: event.target.value }))} placeholder="Approval / rejection note"/><div className="erp-row-actions"><button className="erp-button erp-button-small" disabled={busyId === row.id} onClick={() => reviewNoc(row, "issue")}><CheckCircle2 size={13}/> Approve & issue NOC</button><button className="erp-button erp-button-danger erp-button-small" disabled={busyId === row.id} onClick={() => reviewNoc(row, "reject")}><XCircle size={13}/> Reject</button></div></div></article>)}</div> : <div className="erp-empty"><Check size={24}/><strong>No pending NOC requests</strong><span>Student requests sent to you will appear here.</span></div>}
      </div>
      <div className="erp-card">
        <div className="erp-card-title"><CheckCircle2 size={18}/><div><h2>NOCs issued <span className="erp-counter">{issuedNocs.length}</span></h2><p>Issued NOCs remain available for the student and assigned mentor.</p></div></div>
        {issuedNocs.length ? <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>NOC number</th><th>Student</th><th>Purpose</th><th>Issued</th><th>Download</th></tr></thead><tbody>{issuedNocs.map((row) => <tr key={row.id}><td>{row.nocNumber}</td><td>{row.student?.name || "—"}<small>{row.student?.usn || row.student?.code}</small></td><td>{row.purpose}</td><td>{fmtDate(row.issuedAt)}</td><td><button className="erp-button erp-button-light erp-button-small" onClick={() => downloadNoc(row)}><Download size={14}/> PDF</button><div id={`mentor-noc-${row.id}`} className="erp-noc-certificate"><h1>S-VYASA DEEMED TO BE UNIVERSITY</h1><h2>NO OBJECTION CERTIFICATE</h2><p>Certificate No: {row.nocNumber}</p><p>This is to certify that <strong>{row.student?.name}</strong> ({row.student?.usn || row.student?.code}) has requested a No Objection Certificate for the following purpose:</p><p><strong>{row.purpose}</strong></p><p>{row.details}</p><p>Academic Year: {row.academicYear}</p><p>Issued by Mentor: {user.name} ({user.code})</p><p>Date: {fmtDate(row.issuedAt)}</p><p>Remarks: {row.reviewRemarks || "No additional remarks."}</p><p className="erp-noc-signature">Mentor Signature / University Seal</p></div></td></tr>)}</tbody></table></div> : <div className="erp-empty"><FileCheck2 size={24}/><strong>No NOCs issued yet</strong></div>}
      </div>

      {profileLoading && <div className="erp-card erp-loading"><LoaderCircle className="erp-spin"/> Loading the complete student record…</div>}
      {profile && !profileLoading && <div className="erp-card erp-student-dossier" id="mentor-student-profile">
        <div className="erp-card-title"><GraduationCap size={18}/><div><h2>Complete student record · {profile.student.name}</h2><p>{profile.student.usn || profile.student.code} · {profile.assignment.academicYear}. Personal and financial details are visible only while this student remains your active mentee.</p></div><button className="erp-button erp-button-light erp-button-small" onClick={() => { setProfile(null); setSelectedMenteeId(""); }}>Close record</button></div>
        <div className="erp-dossier-section"><h3>Personal and contact details</h3><div className="erp-profile-details">
          <DetailField label="Full name" value={profile.student.name}/><DetailField label="Student ID" value={profile.student.code}/><DetailField label="USN" value={profile.student.usn}/><DetailField label="Email" value={profile.student.email}/><DetailField label="Phone" value={profile.student.phone}/><DetailField label="Department" value={profile.student.department}/><DetailField label="Programme" value={profile.student.program}/><DetailField label="Semester / Section" value={`${profile.student.semester || "—"} / ${profile.student.section || "—"}`}/>
          <DetailField label="Date of birth" value={profile.student.personalDetails?.dateOfBirth}/><DetailField label="Gender" value={profile.student.personalDetails?.gender}/><DetailField label="Blood group" value={profile.student.personalDetails?.bloodGroup}/><DetailField label="Nationality" value={profile.student.personalDetails?.nationality}/><DetailField label="Admission number" value={profile.student.personalDetails?.admissionNumber}/><DetailField label="Address line 1" value={profile.student.personalDetails?.addressLine1}/><DetailField label="Address line 2" value={profile.student.personalDetails?.addressLine2}/><DetailField label="City" value={profile.student.personalDetails?.city}/><DetailField label="State" value={profile.student.personalDetails?.state}/><DetailField label="Postal code" value={profile.student.personalDetails?.postalCode}/><DetailField label="Parent / guardian" value={profile.student.personalDetails?.guardianName}/><DetailField label="Guardian relationship" value={profile.student.personalDetails?.guardianRelation}/><DetailField label="Guardian email" value={profile.student.personalDetails?.guardianEmail}/><DetailField label="Guardian phone" value={profile.student.personalDetails?.guardianPhone}/><DetailField label="Emergency contact" value={profile.student.personalDetails?.emergencyContactName}/><DetailField label="Emergency phone" value={profile.student.personalDetails?.emergencyContactPhone}/>
        </div></div>
        <div className="erp-dossier-section"><h3>Fee status</h3><div className="erp-kpi-grid"><div className="erp-kpi"><Wallet size={17}/><div className="erp-kpi-value">{money(profile.fees.amount)}</div><div className="erp-kpi-label">Total fees</div></div><div className="erp-kpi"><CheckCircle2 size={17}/><div className="erp-kpi-value">{money(profile.fees.paid)}</div><div className="erp-kpi-label">Amount paid</div></div><div className="erp-kpi"><Wallet size={17}/><div className="erp-kpi-value">{money(profile.fees.remaining)}</div><div className="erp-kpi-label">Remaining balance</div></div></div>
          {profile.fees.records.length ? <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Fee record</th><th>Fee head</th><th>Due date</th><th>Amount</th><th>Paid</th><th>Remaining</th><th>Receipt</th><th>Status</th></tr></thead><tbody>{profile.fees.records.map((row) => <tr key={row.id}><td>{row.title}</td><td>{row.feeType}</td><td>{row.dueDate ? fmtDate(row.dueDate) : "—"}</td><td>{money(row.amount)}</td><td>{money(row.paidAmount)}</td><td>{money(row.remaining)}</td><td>{row.receiptReference || "—"}</td><td>{row.status}</td></tr>)}</tbody></table></div> : <div className="erp-empty"><Wallet size={20}/><strong>No fee records found</strong></div>}
        </div>
        <div className="erp-dossier-section"><h3>Academic record</h3><p className="erp-record-description">Attendance: {profile.attendance.attended}/{profile.attendance.total} attended · {profile.attendance.percentage}% · {profile.attendance.absent} absent</p>
          <h4>Enrolments</h4>{profile.enrollments.length ? <div className="erp-record-list">{profile.enrollments.map((row) => <p key={row.id}>{row.class?.name || "Class"} · {row.class?.academicYear || ""}</p>)}</div> : <small>No enrolments recorded.</small>}
          <h4>Attendance history</h4>{profile.attendance.records.length ? <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Date</th><th>Class</th><th>Subject</th><th>Status</th><th>Remarks / documents</th></tr></thead><tbody>{profile.attendance.records.slice(0, 300).map((row) => <tr key={row.id}><td>{fmtDate(row.date)}</td><td>{row.class?.name || "—"}</td><td>{row.subject?.code || "—"} · {row.subject?.name || ""}</td><td>{row.status}</td><td>{row.remarks || "—"}{row.documents?.map((doc) => <small key={doc.id}>{doc.documentType} · {doc.originalName} · {doc.reviewStatus}</small>)}</td></tr>)}</tbody></table></div> : <small>No attendance records found.</small>}
          <h4>CIA and Internal marks</h4>{profile.marks.length ? <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Subject</th><th>CIA 1</th><th>CIA 2</th><th>CIA 3</th><th>CIA Avg</th><th>Internal 1</th><th>Internal 2</th><th>Internal Avg</th></tr></thead><tbody>{profile.marks.map((row) => <tr key={`${row.subject_code}-${row.student_id}`}><td>{row.subject?.code || row.subject_code} · {row.subject?.name || ""}</td><td>{showValue(row.cia1)}</td><td>{showValue(row.cia2)}</td><td>{showValue(row.cia3)}</td><td>{showValue(row.ciaAverage)}</td><td>{showValue(row.internal1)}</td><td>{showValue(row.internal2)}</td><td>{showValue(row.internalAverage)}</td></tr>)}</tbody></table></div> : <small>No marks records found.</small>}
        </div>
        <div className="erp-dossier-section"><h3>Certificates and achievements</h3><form className="erp-form-grid" onSubmit={addCertificate}><label className="erp-form-field"><span>Certificate title *</span><input className="erp-input" required maxLength={180} value={certificateForm.title} onChange={(event) => setCertificateForm({ ...certificateForm, title: event.target.value })} placeholder="e.g. Hackathon participation certificate"/></label><label className="erp-form-field"><span>Category</span><select className="erp-input" value={certificateForm.category} onChange={(event) => setCertificateForm({ ...certificateForm, category: event.target.value })}><option value="academic">Academic</option><option value="achievement">Achievement</option><option value="workshop">Workshop</option><option value="internship">Internship</option><option value="participation">Participation</option><option value="sports">Sports</option><option value="cultural">Cultural</option><option value="other">Other</option></select></label><label className="erp-form-field"><span>Issuer / organisation</span><input className="erp-input" value={certificateForm.issuer} onChange={(event) => setCertificateForm({ ...certificateForm, issuer: event.target.value })}/></label><label className="erp-form-field"><span>Issue date</span><input className="erp-input" type="date" value={certificateForm.issueDate} onChange={(event) => setCertificateForm({ ...certificateForm, issueDate: event.target.value })}/></label><label className="erp-form-field erp-form-field-wide"><span>Description</span><textarea className="erp-input erp-textarea" rows={2} value={certificateForm.description} onChange={(event) => setCertificateForm({ ...certificateForm, description: event.target.value })}/></label><label className="erp-form-field"><span>Certificate file (PDF/JPG/PNG, max 5 MB) *</span><input id="mentor-certificate-file" className="erp-input" type="file" accept="application/pdf,image/jpeg,image/png" required onChange={(event) => setCertificateForm({ ...certificateForm, file: event.target.files?.[0] || null })}/></label><div className="erp-form-submit"><button className="erp-button" disabled={saving || !certificateForm.file}>{saving ? <LoaderCircle className="erp-spin" size={16}/> : <FilePlus2 size={16}/>} Add to student record</button></div></form>
          {profile.certificates.length ? <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Certificate</th><th>Category</th><th>Issuer</th><th>Issue date</th><th>Status</th><th>File</th><th>Review</th></tr></thead><tbody>{profile.certificates.map((row) => <tr key={row.id}><td>{row.title}<small>{row.description}</small></td><td>{row.category}</td><td>{row.issuer || "—"}</td><td>{row.issueDate ? fmtDate(row.issueDate) : "—"}</td><td>{row.reviewStatus}</td><td><button className="erp-button erp-button-light erp-button-small" onClick={() => downloadPrivateFile(`/api/mentor/certificates/${row.id}/download`, "faculty", row.originalName).catch((e) => setError(e.message))}><Download size={13}/> Download</button></td><td>{row.reviewStatus === "pending" && row.uploadedByRole === "student" ? <div className="erp-row-actions"><button className="erp-button erp-button-small" onClick={() => reviewCertificate(row, "approved")}>Approve</button><button className="erp-button erp-button-danger erp-button-small" onClick={() => reviewCertificate(row, "rejected")}>Reject</button></div> : row.reviewedByRole ? `Reviewed by ${row.reviewedByRole}` : "—"}</td></tr>)}</tbody></table></div> : <small>No certificates have been recorded for this student.</small>}
        </div>
        <div className="erp-dossier-section"><h3>Other student records</h3>{profile.serviceRecords.length ? <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Module</th><th>Title</th><th>Status</th><th>Details</th><th>Created</th></tr></thead><tbody>{profile.serviceRecords.map((row) => <tr key={row.id}><td>{row.module.replaceAll("-", " ")}</td><td>{row.title}</td><td>{row.status}</td><td>{row.description || Object.entries(row.fields || {}).map(([key, value]) => `${key}: ${String(value)}`).join(" · ") || "—"}</td><td>{fmtDate(row.createdAt)}</td></tr>)}</tbody></table></div> : <small>No additional service/application records found.</small>}</div>
        <div className="erp-dossier-section"><h3>Mentoring history</h3>{profile.sessions.length ? <div className="erp-record-list">{profile.sessions.map((row) => <article className="erp-record" key={row.id}><div className="erp-record-main"><div className="erp-record-top"><h3>{row.agenda}</h3><span className={`erp-doc-status erp-doc-status-${row.status === "completed" ? "approved" : row.status === "cancelled" ? "rejected" : "pending"}`}>{row.status}</span></div><div className="erp-record-meta"><span>{fmtDate(row.sessionAt)}</span><span>{row.mode}</span><span>{row.durationMinutes} minutes</span><span>Mentor: {row.mentor?.name || "—"}</span></div>{row.studentSummary && <p>{row.studentSummary}</p>}{row.mentorNotes && <p><strong>Your private notes:</strong> {row.mentorNotes}</p>}{row.actionItems?.length > 0 && <p><strong>Action items:</strong> {row.actionItems.map((item) => `${item.task} (${item.status})`).join(" · ")}</p>}{row.followUpDate && <small>Follow-up: {fmtDate(row.followUpDate)}</small>}</div></article>)}</div> : <small>No mentoring history recorded for this student yet.</small>}</div>
        <div className="erp-dossier-section"><h3>NOC and hostel history</h3>{profile.nocRequests.map((row) => <p key={row._id}>NOC · {row.purpose} · {row.status} {row.nocNumber ? `· ${row.nocNumber}` : ""}</p>)}{profile.hostelAllotments.map((row) => <p key={row._id}>Hostel · {row.roomId?.hostelName || "Hostel"} · Block {row.roomId?.block || "—"} · Room {row.roomId?.roomNumber || "—"} · Bed {row.bedNumber} · {row.academicYear} · {row.status}</p>)}{!profile.nocRequests.length && !profile.hostelAllotments.length && <small>No NOC or hostel records found.</small>}</div>
      </div>}
    </>}
  </section>;
}
