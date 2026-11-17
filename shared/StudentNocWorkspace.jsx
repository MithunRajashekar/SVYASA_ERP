import { useCallback, useEffect, useState } from "react";
import { Award, CalendarClock, Download, FileCheck2, FilePlus2, LoaderCircle, Plus, RefreshCw } from "lucide-react";
import { api, fmtDate } from "./api";

export default function StudentNocWorkspace({ user }) {
  const [mentor, setMentor] = useState(null);
  const [requests, setRequests] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [certificateForm, setCertificateForm] = useState({ title: "", category: "academic", issuer: "", issueDate: "", description: "", file: null });
  const [purpose, setPurpose] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const result = await api("/api/student/noc-requests"); setMentor(result.mentor || null); setRequests(result.requests || []); setSessions(result.sessions || []); setCertificates(result.certificates || []); }
    catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      await api("/api/student/noc-requests", { method: "POST", body: { purpose, details } });
      setPurpose(""); setDetails(""); setSuccess("Your NOC request has been sent to your assigned mentor."); await load();
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  }


  async function uploadCertificate(event) {
    event.preventDefault();
    if (!certificateForm.file) { setError("Choose a PDF, JPG or PNG certificate first."); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Could not read the selected file."));
        reader.readAsDataURL(certificateForm.file);
      });
      await api("/api/student/certificates", { method: "POST", body: {
        title: certificateForm.title, category: certificateForm.category, issuer: certificateForm.issuer,
        issueDate: certificateForm.issueDate || null, description: certificateForm.description,
        fileName: certificateForm.file.name, mimeType: certificateForm.file.type, contentBase64: dataUrl,
      } });
      setCertificateForm({ title: "", category: "academic", issuer: "", issueDate: "", description: "", file: null });
      const picker = document.getElementById("student-certificate-file"); if (picker) picker.value = "";
      setSuccess("Certificate submitted to your assigned mentor for verification."); await load();
    } catch (uploadError) { setError(uploadError.message); }
    finally { setSaving(false); }
  }

  async function downloadCertificate(record) {
    try {
      const response = await fetch(`/api/student/certificates/${record.id}/download`, { credentials: "include", headers: { "X-ERP-Portal-Role": "student" } });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error || `Download failed (${response.status}).`); }
      const blob = await response.blob(); const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = objectUrl; link.download = record.originalName || "certificate";
      document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (downloadError) { setError(downloadError.message); }
  }

  async function downloadNoc(record) {
    const element = document.getElementById(`student-noc-${record.id}`);
    if (!element) return;
    try {
      const imported = await import("html2pdf.js");
      const html2pdf = imported.default || imported;
      await html2pdf().set({ margin: 12, filename: `${record.nocNumber || "SVYASA-NOC"}.pdf`, image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } }).from(element).save();
    } catch (downloadError) { setError(`Could not create NOC PDF: ${downloadError.message}`); }
  }

  return <section className="erp-page">
    <div className="erp-page-head"><div><div className="erp-eyebrow">Student services</div><h1>Mentoring</h1><p>View mentoring sessions, share certificates with your mentor and request an NOC. NOC is one service inside Mentoring.</p></div><button className="erp-button erp-button-light" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
    {error && <div className="erp-alert erp-alert-error">{error}</div>}
    {success && <div className="erp-alert erp-alert-success">{success}</div>}
    {loading ? <div className="erp-card erp-loading"><LoaderCircle className="erp-spin"/> Loading your Mentoring workspace…</div> : <>
      <div className="erp-card erp-form-card"><div className="erp-card-title"><FileCheck2 size={18}/><div><h2>Your assigned mentor</h2><p>NOC requests are automatically routed to this faculty member.</p></div></div>{mentor ? <div className="erp-profile-details"><div><span>Mentor</span><strong>{mentor.name}</strong></div><div><span>Faculty ID</span><strong>{mentor.code}</strong></div><div><span>Academic year</span><strong>{mentor.academicYear}</strong></div></div> : <div className="erp-alert erp-alert-error">No mentor has been assigned to you yet. Please contact the ERP Administrator.</div>}</div>
      <div className="erp-card"><div className="erp-card-title"><CalendarClock size={18}/><div><h2>Mentoring sessions <span className="erp-counter">{sessions.length}</span></h2><p>Your mentor can schedule a discussion whenever guidance is needed. Review the agenda and meeting details below.</p></div></div>{sessions.length ? <div className="erp-record-list">{sessions.map((row) => <article className="erp-record" key={row.id}><div className="erp-record-main"><div className="erp-record-top"><h3>{row.agenda}</h3><span className={`erp-doc-status erp-doc-status-${row.status === "completed" ? "approved" : row.status === "cancelled" ? "rejected" : "pending"}`}>{row.status}</span></div><div className="erp-record-meta"><span>{fmtDate(row.sessionAt)}</span><span>{row.mode}</span><span>{row.durationMinutes} minutes</span><span>Mentor: {row.mentor?.name || mentor?.name || "—"}</span></div>{row.locationOrLink && <p>{row.locationOrLink}</p>}{row.studentSummary && <p>{row.studentSummary}</p>}{row.actionItems?.length > 0 && <p><strong>Your action items:</strong> {row.actionItems.map((item) => `${item.task} (${item.status})`).join(" · ")}</p>}{row.followUpDate && <small>Follow-up: {fmtDate(row.followUpDate)}</small>}</div></article>)}</div> : <div className="erp-empty"><CalendarClock size={24}/><strong>No mentoring sessions scheduled</strong><span>Your mentor's meeting agenda and time will appear here when a session is called.</span></div>}</div>
      <div className="erp-card erp-form-card"><div className="erp-card-title"><FilePlus2 size={18}/><div><h2>Add a certificate to my student record</h2><p>Upload academic, achievement, workshop, internship, sports or participation certificates. Your mentor can verify them.</p></div></div><form className="erp-form-grid" onSubmit={uploadCertificate}><label className="erp-form-field"><span>Certificate title *</span><input className="erp-input" required maxLength={180} value={certificateForm.title} onChange={(event) => setCertificateForm({ ...certificateForm, title: event.target.value })} placeholder="Certificate / achievement name"/></label><label className="erp-form-field"><span>Category</span><select className="erp-input" value={certificateForm.category} onChange={(event) => setCertificateForm({ ...certificateForm, category: event.target.value })}><option value="academic">Academic</option><option value="achievement">Achievement</option><option value="workshop">Workshop</option><option value="internship">Internship</option><option value="participation">Participation</option><option value="sports">Sports</option><option value="cultural">Cultural</option><option value="other">Other</option></select></label><label className="erp-form-field"><span>Issuer / organisation</span><input className="erp-input" value={certificateForm.issuer} onChange={(event) => setCertificateForm({ ...certificateForm, issuer: event.target.value })}/></label><label className="erp-form-field"><span>Issue date</span><input className="erp-input" type="date" value={certificateForm.issueDate} onChange={(event) => setCertificateForm({ ...certificateForm, issueDate: event.target.value })}/></label><label className="erp-form-field erp-form-field-wide"><span>Description</span><textarea className="erp-input erp-textarea" rows={2} value={certificateForm.description} onChange={(event) => setCertificateForm({ ...certificateForm, description: event.target.value })}/></label><label className="erp-form-field"><span>Certificate file (PDF/JPG/PNG, max 5 MB) *</span><input id="student-certificate-file" className="erp-input" type="file" accept="application/pdf,image/jpeg,image/png" required onChange={(event) => setCertificateForm({ ...certificateForm, file: event.target.files?.[0] || null })}/></label><div className="erp-form-submit"><button className="erp-button" disabled={saving || !certificateForm.file}>{saving ? <LoaderCircle className="erp-spin" size={16}/> : <FilePlus2 size={16}/>} Submit certificate</button></div></form></div>
      <div className="erp-card"><div className="erp-card-title"><Award size={18}/><div><h2>My certificates <span className="erp-counter">{certificates.length}</span></h2><p>Certificates added by your mentor or submitted by you are stored in your student record.</p></div></div>{certificates.length ? <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Certificate</th><th>Category</th><th>Issuer</th><th>Issue date</th><th>Status</th><th>File</th></tr></thead><tbody>{certificates.map((row) => <tr key={row.id}><td>{row.title}<small>{row.description || ""}</small></td><td>{row.category}</td><td>{row.issuer || "—"}</td><td>{row.issueDate ? fmtDate(row.issueDate) : "—"}</td><td><span className={`erp-doc-status erp-doc-status-${row.reviewStatus === "approved" ? "approved" : row.reviewStatus === "rejected" ? "rejected" : "pending"}`}>{row.reviewStatus}</span>{row.reviewRemarks && <small>{row.reviewRemarks}</small>}</td><td><button className="erp-button erp-button-light erp-button-small" onClick={() => downloadCertificate(row)}><Download size={13}/> Download</button></td></tr>)}</tbody></table></div> : <div className="erp-empty"><Award size={24}/><strong>No certificates uploaded yet</strong></div>}</div>
      <form className="erp-card erp-form-card" onSubmit={submit}><div className="erp-card-title"><Plus size={18}/><div><h2>Submit an NOC request</h2><p>Explain why you need the certificate. Your mentor will review it.</p></div></div><div className="erp-form-grid"><label className="erp-form-field"><span>Purpose *</span><input className="erp-input" required maxLength={180} value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="For example: internship, scholarship, event participation"/></label><label className="erp-form-field"><span>Additional details</span><textarea className="erp-input erp-textarea" rows={3} maxLength={3000} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Add relevant details or destination organisation"/></label><div className="erp-form-submit"><button className="erp-button" disabled={saving || !mentor}>{saving ? <LoaderCircle className="erp-spin" size={16}/> : <Plus size={16}/>} Submit request</button></div></div></form>
      <div className="erp-card"><div className="erp-card-title"><FileCheck2 size={18}/><div><h2>Your NOC history <span className="erp-counter">{requests.length}</span></h2></div></div>{requests.length ? <div className="erp-record-list">{requests.map((row) => <article className="erp-record" key={row.id}><div className="erp-record-main"><div className="erp-record-top"><h3>{row.purpose}</h3><span className={`erp-doc-status erp-doc-status-${row.status === "issued" ? "approved" : row.status === "rejected" ? "rejected" : "pending"}`}>{row.status}</span></div><p>{row.details || "No additional details."}</p><div className="erp-record-meta"><span>Mentor: {row.mentor?.name || mentor?.name || "—"}</span><span>Requested: {fmtDate(row.requestedAt)}</span><span>Reviewed: {fmtDate(row.reviewedAt)}</span></div>{row.nocNumber && <strong>{row.nocNumber}</strong>}{row.reviewRemarks && <small>Mentor remarks: {row.reviewRemarks}</small>}</div>{row.status === "issued" && <div><button className="erp-button erp-button-light erp-button-small" onClick={() => downloadNoc(row)}><Download size={14}/> Download NOC PDF</button><div id={`student-noc-${row.id}`} className="erp-noc-certificate"><h1>S-VYASA DEEMED TO BE UNIVERSITY</h1><h2>NO OBJECTION CERTIFICATE</h2><p>Certificate No: {row.nocNumber}</p><p>This is to certify that <strong>{user.name}</strong> ({user.usn || user.student_id || user.code}) has requested a No Objection Certificate for the following purpose:</p><p><strong>{row.purpose}</strong></p><p>{row.details}</p><p>Academic Year: {row.academicYear}</p><p>Issued by Mentor: {row.mentor?.name || mentor?.name || "Assigned Faculty Mentor"}</p><p>Date: {fmtDate(row.issuedAt)}</p><p>Remarks: {row.reviewRemarks || "No additional remarks."}</p><p className="erp-noc-signature">Mentor Signature / University Seal</p></div></div>}</article>)}</div> : <div className="erp-empty"><FileCheck2 size={24}/><strong>No NOC requests yet</strong><span>Submit an NOC request above when you need one.</span></div>}</div>
    </>}
  </section>;
}
