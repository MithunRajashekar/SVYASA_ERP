import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, ChevronDown, CirclePlus, Clock3, FileText, LoaderCircle, Pencil, Plus, RefreshCw, Search, Send, Trash2, X } from "lucide-react";
import { MODULES } from "./modules";
import { api, fmtDate } from "./api";

const EMPTY = { title: "", description: "", status: "Draft", visibility: "private", department: "", program: "", semester: "", section: "", academicYear: "", classId: "", subjectCode: "", startsAt: "", endsAt: "", dueAt: "", targetUserId: "", fields: {} };
const CAN_PUBLISH = new Set(["admin", "faculty"]);

function InputField({ field, value, onChange, options = [] }) {
  const common = { value: value ?? "", onChange: (event) => onChange(event.target.value), required: Boolean(field.required), placeholder: field.placeholder || "" };
  if (field.type === "textarea") return <textarea {...common} rows={3} className="erp-input erp-textarea" />;
  if (field.type === "select") return <select {...common} className="erp-input"><option value="">Select</option>{(options.length ? options : (field.options || []).map((option) => ({ value: option, label: option }))).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
  return <input {...common} type={field.type || "text"} min={field.type === "number" ? 0 : undefined} step={field.type === "number" ? "any" : undefined} className="erp-input" />;
}

export default function ModuleWorkspace({ module, user }) {
  const definition = MODULES[module];
  const [records, setRecords] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [relatedRecords, setRelatedRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const isAdmin = user.role === "admin";
  const isStudent = user.role === "student";
  const facultyCreateModules = new Set(["class-timetable", "exam-timetable", "lesson-plans", "assessment", "assignments", "mentoring", "academic-calendar", "notices"]);
  const studentRequestModules = new Set(["assignment-submissions", "mentoring-requests", "fee-queries", "library-requests", "hostel-requests", "placement-applications", "internship-applications", "soft-skill-enrollments", "student-requests"]);
  const mayCreate = isAdmin || (isStudent && studentRequestModules.has(module)) || (user.role === "faculty" && facultyCreateModules.has(module));

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await api(`/api/workspace/${module}`);
      setRecords(response.records || []);
      const relation = definition?.fields?.find((field) => field.dynamic)?.dynamic;
      if (relation) {
        const related = await api(`/api/workspace/${relation}`);
        setRelatedRecords((related.records || []).filter((row) => ["Published", "Approved", "Open", "Active"].includes(row.status)));
      } else setRelatedRecords([]);
      if (isAdmin) {
        const [userResponse, classResponse] = await Promise.all([api("/api/admin/users"), api("/api/admin/classes")]);
        setStudents((userResponse.users || []).filter((entry) => entry.role === "student" && entry.isActive !== false));
        setClasses(classResponse.classes || []);
      } else if (user.role === "faculty") {
        const response = await api(`/api/faculty/${user.id}/classes`);
        setClasses(response.classes || []);
      }
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, [definition, isAdmin, module, user.id, user.role]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;
    return records.filter((record) => [record.title, record.description, record.status, record.department, record.subjectCode, JSON.stringify(record.fields || {})].join(" ").toLowerCase().includes(term));
  }, [records, search]);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, status: isStudent ? "Submitted" : "Draft", visibility: user.role === "faculty" && ["class-timetable", "exam-timetable", "lesson-plans", "assessment", "assignments"].includes(module) ? "class" : user.role === "faculty" && ["academic-calendar", "notices"].includes(module) ? "department" : definition.defaultVisibility || "private", department: user.department || "", program: user.program || "", semester: user.semester || "", section: user.section || "", targetUserId: "" });
    setError(""); setSuccess(""); setShowForm(true);
  }

  function openEdit(record) {
    setEditing(record);
    setForm({ ...EMPTY, ...record, classId: record.classId?._id || record.classId || "", targetUserId: record.targetUserId?._id || record.targetUserId || "", semester: record.semester ?? "", startsAt: record.startsAt ? String(record.startsAt).slice(0, 10) : "", endsAt: record.endsAt ? String(record.endsAt).slice(0, 10) : "", dueAt: record.dueAt ? String(record.dueAt).slice(0, 10) : "", fields: record.fields || {} });
    setError(""); setSuccess(""); setShowForm(true);
  }

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      const payload = { ...form, semester: form.semester === "" ? null : Number(form.semester), fields: form.fields };
      // Faculty may grade submissions, but must not overwrite the student's
      // submission URL, assignment reference, ownership or notes.
      if (user.role === "faculty" && module === "assignment-submissions") {
        payload.fields = { marksAwarded: form.fields?.marksAwarded, feedback: form.fields?.feedback };
      }
      if (!payload.classId) delete payload.classId;
      if (!payload.targetUserId) delete payload.targetUserId;
      const response = await api(editing ? `/api/workspace/${module}/${editing._id}` : `/api/workspace/${module}`, { method: editing ? "PUT" : "POST", body: payload });
      setSuccess(editing ? "Record updated." : "Record saved. Its database folder was generated automatically.");
      setShowForm(false); setEditing(null); setForm(EMPTY); await load();
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  }

  async function updateStatus(record, status) {
    setError(""); setSuccess("");
    try { await api(`/api/workspace/${module}/${record._id}/status`, { method: "PATCH", body: { status } }); setSuccess(`Status changed to ${status}.`); await load(); }
    catch (statusError) { setError(statusError.message); }
  }

  async function remove(record) {
    if (!window.confirm(`Delete "${record.title}"? This cannot be undone.`)) return;
    setError(""); setSuccess("");
    try { await api(`/api/workspace/${module}/${record._id}`, { method: "DELETE" }); setSuccess("Record deleted."); await load(); }
    catch (deleteError) { setError(deleteError.message); }
  }

  if (!definition) return <div className="erp-card">Unknown module.</div>;

  return (
    <section className="erp-page">
      <div className="erp-page-head">
        <div><div className="erp-eyebrow">{definition.group}</div><h1>{definition.label}</h1><p>{definition.description}</p></div>
        <div className="erp-actions"><button className="erp-button erp-button-light" onClick={load}><RefreshCw size={15} /> Refresh</button>{mayCreate && <button className="erp-button" onClick={openCreate}><Plus size={16} /> Add entry</button>}</div>
      </div>
      {(error || success) && <div className={`erp-alert ${error ? "erp-alert-error" : "erp-alert-success"}`}><span>{error ? <AlertCircle size={17} /> : <Check size={17} />}</span>{error || success}<button onClick={() => { setError(""); setSuccess(""); }}><X size={15} /></button></div>}
      <div className="erp-card">
        <div className="erp-toolbar"><div className="erp-record-count"><strong>{records.length}</strong> records</div><label className="erp-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records..." /></label></div>
        {loading ? <div className="erp-loading"><LoaderCircle className="erp-spin" /> Loading records…</div> : filtered.length === 0 ? <div className="erp-empty"><div className="erp-empty-icon"><FileText size={24} /></div><strong>No records yet</strong><span>{mayCreate ? "Create the first entry for this module." : "Published records and records assigned to your account will appear here."}</span>{mayCreate && <button className="erp-button" onClick={openCreate}><CirclePlus size={16} /> Create first entry</button>}</div> : (
          <div className="erp-record-list">
            {filtered.map((record) => {
              const status = record.status || "Draft";
              const canEdit = isAdmin || (user.role === "faculty" && module === "assignment-submissions") || (String(record.ownerId) === user.id || String(record.createdBy) === user.id) && (!isStudent || status === "Submitted");
              const canReview = CAN_PUBLISH.has(user.role) && (isAdmin || String(record.ownerId) === user.id || String(record.createdBy) === user.id || ["assignment-submissions", "mentoring-requests"].includes(module));
              return <article className="erp-record" key={record._id}>
                <div className="erp-record-main"><div className="erp-record-top"><h3>{record.title}</h3><span className={`erp-status status-${status.toLowerCase()}`}>{status}</span></div>
                  {record.description && <p className="erp-record-description">{record.description}</p>}
                  <div className="erp-record-meta"><span>{record.department || user.department || "University"}</span>{record.semester && <span>Semester {record.semester}</span>}{record.section && <span>Section {record.section}</span>}{record.dueAt && <span><Clock3 size={12} /> Due {fmtDate(record.dueAt)}</span>}{record.startsAt && <span>{fmtDate(record.startsAt)}</span>}{record.targetUserId?.name && <span>Student: {record.targetUserId.name}</span>}</div>
                  {Object.keys(record.fields || {}).length > 0 && <div className="erp-fields-preview">{Object.entries(record.fields).slice(0, 5).map(([key, value]) => <span key={key}><b>{key.replace(/([A-Z])/g, " $1")}:</b> {Array.isArray(value) ? value.join(", ") : String(value ?? "—")}</span>)}</div>}
                </div>
                <div className="erp-record-actions">{canEdit && <button className="erp-icon-button" title="Edit" onClick={() => openEdit(record)}><Pencil size={15} /></button>}{canReview && <select aria-label="Change status" className="erp-status-select" value={status} onChange={(e) => updateStatus(record, e.target.value)}><option>Draft</option><option>Submitted</option><option>Pending</option><option>Published</option><option>Approved</option><option>Rejected</option><option>Open</option><option>Active</option><option>Completed</option><option>Reviewed</option><option>Closed</option><option>Paid</option><option>Overdue</option></select>}{(isAdmin || canEdit && ["Draft", "Submitted", "Pending"].includes(status)) && <button className="erp-icon-button erp-icon-danger" title="Delete" onClick={() => remove(record)}><Trash2 size={15} /></button>}</div>
              </article>;
            })}
          </div>
        )}
      </div>

      {showForm && <div className="erp-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}><form className="erp-modal" onSubmit={submit}>
        <div className="erp-modal-head"><div><div className="erp-eyebrow">{editing ? "Update record" : "New record"}</div><h2>{editing ? "Edit " : "Create "}{definition.label}</h2></div><button type="button" className="erp-icon-button" onClick={() => setShowForm(false)}><X size={18} /></button></div>
        <div className="erp-form-grid">
          <label className="erp-form-field erp-span-2"><span>Title *</span><input className="erp-input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Enter a clear title" /></label>
          <label className="erp-form-field erp-span-2"><span>Description / instructions</span><textarea className="erp-input erp-textarea" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Add context or instructions" /></label>
          {definition.fields.filter((field) => {
            if (isStudent && module === "assignment-submissions") return !["marksAwarded", "feedback"].includes(field.key);
            if (user.role === "faculty" && module === "assignment-submissions") return ["marksAwarded", "feedback"].includes(field.key);
            return true;
          }).map((field) => <label className={`erp-form-field ${field.type === "textarea" ? "erp-span-2" : ""}`} key={field.key}><span>{field.label}{field.required ? " *" : ""}</span><InputField field={field} options={field.dynamic ? relatedRecords.map((row) => ({ value: row._id, label: row.title })) : []} value={form.fields?.[field.key] ?? ""} onChange={(value) => setForm({ ...form, fields: { ...form.fields, [field.key]: value } })} /></label>)}
          {isAdmin && definition.targetStudent && <label className="erp-form-field erp-span-2"><span>Assign to student *</span><select className="erp-input" required value={form.targetUserId} onChange={(e) => setForm({ ...form, targetUserId: e.target.value })}><option value="">Choose a student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.code}</option>)}</select></label>}
          {!isStudent && classes.length > 0 && ["class-timetable", "exam-timetable", "lesson-plans", "assessment", "assignments", "assignment-submissions", "mentoring"].includes(module) && <label className="erp-form-field erp-span-2"><span>{user.role === "faculty" ? "Assigned class & subject" : "Class scope (optional)"}</span><select className="erp-input" value={user.role === "faculty" && form.classId ? `${form.classId}|${form.subjectCode || ""}` : form.classId || ""} onChange={(e) => { const [classId, selectedSubject] = user.role === "faculty" ? e.target.value.split("|") : [e.target.value, ""]; const selected = classes.find((item) => String(item.classId || item._id) === classId && (!selectedSubject || item.subjectCode === selectedSubject)); setForm({ ...form, classId, subjectCode: user.role === "faculty" ? (selected?.subjectCode || selectedSubject || form.subjectCode) : form.subjectCode, department: selected?.department || form.department, semester: selected?.semester ?? form.semester, section: selected?.section || form.section, academicYear: selected?.academicYear || form.academicYear }); }}><option value="">{user.role === "faculty" ? "Choose assigned class" : "No specific class"}</option>{classes.map((item) => <option key={item.assignmentId || item.classId || item._id} value={user.role === "faculty" ? `${item.classId || item._id}|${item.subjectCode || ""}` : item.classId || item._id}>{item.className || item.name} · {item.subjectCode || "All subjects"}</option>)}</select></label>}
          <label className="erp-form-field"><span>Department</span><input className="erp-input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
          <label className="erp-form-field"><span>Academic year</span><input className="erp-input" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2026-2027" /></label>
          <label className="erp-form-field"><span>Semester</span><input className="erp-input" type="number" min="1" max="12" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} /></label>
          <label className="erp-form-field"><span>Section</span><input className="erp-input" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} /></label>
          <label className="erp-form-field"><span>Subject code</span><input className="erp-input" value={form.subjectCode} onChange={(e) => setForm({ ...form, subjectCode: e.target.value.toUpperCase() })} /></label>
          <label className="erp-form-field"><span>Visibility</span><select className="erp-input" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}><option value="private">Private</option><option value="class">Class</option><option value="department">Department</option><option value="university">University</option></select></label>
          <label className="erp-form-field"><span>Start date</span><input className="erp-input" type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></label>
          <label className="erp-form-field"><span>End date</span><input className="erp-input" type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></label>
          <label className="erp-form-field"><span>Due date</span><input className="erp-input" type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></label>
          {!isStudent && <label className="erp-form-field"><span>Initial status</span><select className="erp-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Draft</option><option>Pending</option><option>Published</option><option>Open</option><option>Active</option></select></label>}
        </div>
        {isStudent && <p className="erp-form-note"><Send size={14} /> Your request will be submitted privately to the university. Its status is controlled by the ERP team.</p>}
        <div className="erp-modal-actions"><button type="button" className="erp-button erp-button-light" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="erp-button" disabled={saving}>{saving ? <LoaderCircle className="erp-spin" size={16} /> : <Check size={16} />}{saving ? "Saving…" : editing ? "Save changes" : "Save entry"}</button></div>
      </form></div>}
    </section>
  );
}
