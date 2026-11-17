import { useCallback, useEffect, useState } from "react";
import { GraduationCap, LoaderCircle, Plus, RefreshCw, ShieldCheck, UserRound, Users, X } from "lucide-react";
import { api, fmtDate } from "./api";

export default function AdminMentorWorkspace() {
  const [faculty, setFaculty] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [nocRequests, setNocRequests] = useState([]);
  const [form, setForm] = useState({ mentorId: "", studentId: "", academicYear: "2026-2027", notes: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [usersResponse, assignmentResponse, nocResponse] = await Promise.all([
        api("/api/admin/users"), api("/api/admin/mentor-assignments"), api("/api/admin/noc-requests"),
      ]);
      const users = usersResponse.users || [];
      setFaculty(users.filter((row) => row.role === "faculty" && row.isActive !== false));
      setStudents(users.filter((row) => row.role === "student" && row.isActive !== false));
      setAssignments(assignmentResponse.assignments || []);
      setNocRequests(nocResponse.requests || []);
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      await api("/api/admin/mentor-assignments", { method: "POST", body: form });
      setSuccess("Mentor assigned. The faculty member can now see this student in the Mentoring workspace and review their OD/sick documents.");
      setForm((current) => ({ ...current, notes: "" }));
      await load();
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  }

  async function deactivate(row) {
    if (!window.confirm(`Deactivate ${row.studentId?.name || "this student"}'s mentor assignment?`)) return;
    setSaving(true); setError(""); setSuccess("");
    try { await api(`/api/admin/mentor-assignments/${row._id}`, { method: "DELETE" }); setSuccess("Mentor assignment deactivated."); await load(); }
    catch (actionError) { setError(actionError.message); }
    finally { setSaving(false); }
  }

  return <section className="erp-page">
    <div className="erp-page-head"><div><div className="erp-eyebrow">Administration · Student welfare</div><h1>Mentoring</h1><p>Manage mentor-to-mentee assignments and oversee mentoring, student document reviews and NOC decisions. NOC is managed inside Mentoring.</p></div><button className="erp-button erp-button-light" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
    {error && <div className="erp-alert erp-alert-error">{error}<button onClick={() => setError("")}><X size={14}/></button></div>}
    {success && <div className="erp-alert erp-alert-success">{success}<button onClick={() => setSuccess("")}><X size={14}/></button></div>}
    <form className="erp-card erp-form-card" onSubmit={submit}>
      <div className="erp-card-title"><UserRound size={18}/><div><h2>Assign a mentor</h2><p>Mentors are existing Faculty accounts; no separate mentor login is created.</p></div></div>
      <div className="erp-form-grid">
        <label className="erp-form-field"><span>Faculty mentor *</span><select className="erp-input" required value={form.mentorId} onChange={(event) => setForm({ ...form, mentorId: event.target.value })}><option value="">Select faculty</option>{faculty.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.code}</option>)}</select></label>
        <label className="erp-form-field"><span>Student / mentee *</span><select className="erp-input" required value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })}><option value="">Select student</option>{students.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.usn || row.code} · {row.section || "No section"}</option>)}</select></label>
        <label className="erp-form-field"><span>Academic year *</span><input className="erp-input" required pattern="\d{4}-\d{4}" placeholder="2026-2027" value={form.academicYear} onChange={(event) => setForm({ ...form, academicYear: event.target.value })}/></label>
        <label className="erp-form-field"><span>Assignment note (optional)</span><input className="erp-input" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Mentor group / notes"/></label>
        <div className="erp-form-submit"><button className="erp-button" disabled={saving || loading || !faculty.length || !students.length}>{saving ? <LoaderCircle className="erp-spin" size={16}/> : <Plus size={16}/>} Assign mentor</button></div>
      </div>
    </form>
    <div className="erp-card">
      <div className="erp-card-title"><Users size={18}/><div><h2>Mentor assignments <span className="erp-counter">{assignments.length}</span></h2><p>One active mentor is maintained for a student in the current academic year. Reassigning a student updates the existing yearly assignment.</p></div></div>
      {loading ? <div className="erp-loading"><LoaderCircle className="erp-spin"/> Loading assignments…</div> : <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Mentor</th><th>Mentee</th><th>Department / Programme</th><th>Academic year</th><th>Status</th><th>Actions</th></tr></thead><tbody>{assignments.map((row) => <tr key={row._id}><td><strong>{row.mentorId?.name || "—"}</strong><small>{row.mentorId?.code || ""}</small></td><td><strong>{row.studentId?.name || "—"}</strong><small>{row.studentId?.usn || row.studentId?.code || ""}</small></td><td>{row.studentId?.department || "—"}<small>{row.studentId?.program || ""} · {row.studentId?.section || ""}</small></td><td>{row.academicYear}</td><td><span className={`erp-status ${row.status === "active" ? "status-active" : "status-closed"}`}>{row.status}</span></td><td>{row.status === "active" && <button className="erp-button erp-button-danger erp-button-small" disabled={saving} onClick={() => deactivate(row)}>Deactivate</button>}</td></tr>)}</tbody></table></div>}
    </div>
    <div className="erp-card">
      <div className="erp-card-title"><ShieldCheck size={18}/><div><h2>NOC requests & oversight <span className="erp-counter">{nocRequests.length}</span></h2><p>Read-only university overview of student NOC requests and mentor decisions.</p></div></div>
      <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Student</th><th>Mentor</th><th>Purpose</th><th>Academic year</th><th>Status</th><th>Reviewer</th><th>Date</th></tr></thead><tbody>{nocRequests.map((row) => <tr key={row.id}><td>{row.studentId?.name || "—"}<small>{row.studentId?.usn || row.studentId?.code || ""}</small></td><td>{row.mentorId?.name || "—"}</td><td>{row.purpose}</td><td>{row.academicYear}</td><td><span className={`erp-status status-${row.status}`}>{row.status}</span>{row.nocNumber && <small>{row.nocNumber}</small>}</td><td>{row.reviewedBy?.name || (row.reviewedByRole === "faculty" ? "Faculty" : row.reviewedByRole === "admin" ? "Administrator" : "—")}</td><td>{fmtDate(row.reviewedAt || row.requestedAt)}</td></tr>)}</tbody></table></div>
    </div>
  </section>;
}
