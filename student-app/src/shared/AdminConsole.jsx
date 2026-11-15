import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Check, ClipboardCheck, Download, FolderTree, LoaderCircle, Plus, RefreshCw, ShieldCheck, Trash2, UserPlus, Users, X } from "lucide-react";
import { api, fmtDate } from "./api";

const emptyUser = { code: "", name: "", role: "student", password: "", email: "", phone: "", department: "", program: "", semester: "", section: "", usn: "" };
const emptyClass = { department: "", semester: "1", academicYear: "2026-2027", section: "A", name: "" };
const emptySubject = { code: "", name: "", department: "", semester: "1", section: "" };

function PageMessage({ error, success, clear }) { if (!error && !success) return null; return <div className={`erp-alert ${error ? "erp-alert-error" : "erp-alert-success"}`}><span>{error ? <AlertCircle size={17} /> : <Check size={17} />}</span>{error || success}<button onClick={clear}><X size={15} /></button></div>; }
function FormField({ label, value, onChange, type = "text", options, required = false, placeholder = "" }) {
  return <label className="erp-form-field"><span>{label}{required ? " *" : ""}</span>{options ? <select className="erp-input" required={required} value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select {label.toLowerCase()}</option>{options.map((item) => typeof item === "string" ? <option key={item} value={item}>{item}</option> : <option key={item.value} value={item.value}>{item.label}</option>)}</select> : <input className="erp-input" type={type} required={required} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}</label>;
}

export default function AdminConsole({ section }) {
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [approvals, setApprovals] = useState({ events: [], records: [] });
  const [subtab, setSubtab] = useState("classes");
  const [userForm, setUserForm] = useState(emptyUser);
  const [classForm, setClassForm] = useState(emptyClass);
  const [subjectForm, setSubjectForm] = useState(emptySubject);
  const [assignmentForm, setAssignmentForm] = useState({ facultyId: "", classId: "", subjectId: "", slot: "" });
  const [enrollmentForm, setEnrollmentForm] = useState({ studentId: "", classId: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (section === "users" || section === "academics") {
        const [userResponse, classResponse, subjectResponse, assignmentResponse, enrollmentResponse] = await Promise.all([
          api("/api/admin/users"), api("/api/admin/classes"), api("/api/admin/subjects"), api("/api/admin/assignments"), api("/api/admin/enrollments"),
        ]);
        setUsers(userResponse.users || []); setClasses(classResponse.classes || []); setSubjects(subjectResponse.subjects || []);
        setAssignments(assignmentResponse.assignments || []); setEnrollments(enrollmentResponse.enrollments || []);
        setFaculty((userResponse.users || []).filter((item) => item.role === "faculty" && item.isActive !== false));
        setStudents((userResponse.users || []).filter((item) => item.role === "student" && item.isActive !== false));
      } else if (section === "approvals") {
        setApprovals(await api("/api/admin/approvals"));
      } else if (section === "folders") {
        const result = await api("/api/admin/data-folders"); setFolders(result.folders || []);
      }
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, [section]);

  useEffect(() => { load(); }, [load]);

  function clearMessages() { setError(""); setSuccess(""); }
  async function runSave(action, done) {
    setSaving(true); clearMessages(); setTemporaryPassword("");
    try { const result = await action(); done?.(result); setSuccess("Saved successfully."); await load(); }
    catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  }

  async function createUser(event) {
    event.preventDefault();
    await runSave(() => api("/api/auth/users", { method: "POST", body: { ...userForm, semester: userForm.semester ? Number(userForm.semester) : null } }), () => setUserForm(emptyUser));
  }

  async function toggleUser(user) {
    await runSave(() => api(`/api/admin/users/${user.id}`, { method: "PUT", body: { isActive: user.isActive === false } }));
  }

  async function resetPassword(user) {
    if (!window.confirm(`Generate a new temporary password for ${user.name} (${user.code})? Their current password will stop working.`)) return;
    await runSave(async () => {
      const result = await api(`/api/admin/users/${user.id}/reset-password`, { method: "POST", body: {} });
      setTemporaryPassword(`${result.userId}: ${result.temporaryPassword}`);
      return result;
    });
  }

  async function createClass(event) {
    event.preventDefault();
    await runSave(() => api("/api/admin/classes", { method: "POST", body: { ...classForm, semester: Number(classForm.semester) } }), () => setClassForm(emptyClass));
  }

  async function createSubject(event) {
    event.preventDefault();
    await runSave(() => api("/api/admin/subjects", { method: "POST", body: { ...subjectForm, semester: Number(subjectForm.semester) } }), () => setSubjectForm(emptySubject));
  }

  async function createAssignment(event) {
    event.preventDefault(); await runSave(() => api("/api/admin/assignments", { method: "POST", body: assignmentForm }), () => setAssignmentForm({ facultyId: "", classId: "", subjectId: "", slot: "" }));
  }
  async function createEnrollment(event) {
    event.preventDefault(); await runSave(() => api("/api/admin/enrollments", { method: "POST", body: enrollmentForm }), () => setEnrollmentForm({ studentId: "", classId: "" }));
  }

  async function reviewRecord(record, status) {
    await runSave(() => api(`/api/workspace/${record.module}/${record._id}/status`, { method: "PATCH", body: { status } }));
  }
  async function reviewEvent(event, status) {
    await runSave(() => api(`/api/events/${event._id}/approval`, { method: "POST", body: { status } }));
  }

  async function editUser(user) {
    const name = window.prompt("Full name", user.name);
    if (name === null) return;
    const email = window.prompt("Email address", user.email || "");
    if (email === null) return;
    const phone = window.prompt("Phone number", user.phone || "");
    if (phone === null) return;
    const department = window.prompt("Department", user.department || "");
    if (department === null) return;
    const program = window.prompt("Programme", user.program || "");
    if (program === null) return;
    const profile = { name, email, phone, department, program };
    if (user.role === "student") {
      const usn = window.prompt("Student USN", user.usn || "");
      if (usn === null) return;
      const semester = window.prompt("Semester (1-12)", user.semester ? String(user.semester) : "");
      if (semester === null) return;
      const section = window.prompt("Section", user.section || "");
      if (section === null) return;
      Object.assign(profile, { usn, semester: semester ? Number(semester) : null, section });
    }
    await runSave(() => api(`/api/admin/users/${user.id}`, { method: "PUT", body: profile }));
  }

  async function editClass(row) {
    const name = window.prompt("Class display name", row.name);
    if (name === null) return;
    const department = window.prompt("Department", row.department);
    if (department === null) return;
    const semester = window.prompt("Semester (1-12)", String(row.semester));
    if (semester === null) return;
    const section = window.prompt("Section", row.section);
    if (section === null) return;
    const academicYear = window.prompt("Academic year", row.academicYear);
    if (academicYear === null) return;
    await runSave(() => api(`/api/admin/classes/${row._id}`, { method: "PUT", body: { name, department, semester: Number(semester), section, academicYear } }));
  }

  async function deleteClass(row) {
    if (!window.confirm(`Delete class ${row.name}? Classes with enrolments, faculty allocations or attendance history are protected.`)) return;
    await runSave(() => api(`/api/admin/classes/${row._id}`, { method: "DELETE" }));
  }

  async function editSubject(row) {
    const code = window.prompt("Subject code", row.code);
    if (code === null) return;
    const name = window.prompt("Subject name", row.name);
    if (name === null) return;
    const department = window.prompt("Department", row.department || "");
    if (department === null) return;
    const semester = window.prompt("Semester (leave blank if not applicable)", row.semester || "");
    if (semester === null) return;
    const section = window.prompt("Section", row.section || "");
    if (section === null) return;
    await runSave(() => api(`/api/admin/subjects/${row._id}`, { method: "PUT", body: { code, name, department, semester: semester ? Number(semester) : null, section } }));
  }

  async function deleteSubject(row) {
    if (!window.confirm(`Delete subject ${row.code} · ${row.name}? Subjects with attendance or marks history are protected.`)) return;
    await runSave(() => api(`/api/admin/subjects/${row._id}`, { method: "DELETE" }));
  }

  async function deleteAssignment(row) {
    if (!window.confirm("Remove this faculty allocation? Allocations with attendance history are protected.")) return;
    await runSave(() => api(`/api/admin/assignments/${row._id}`, { method: "DELETE" }));
  }

  async function deleteEnrollment(row) {
    if (!window.confirm("Remove this student enrolment? Enrolments with attendance history are protected.")) return;
    await runSave(() => api(`/api/admin/enrollments/${row._id}`, { method: "DELETE" }));
  }

  const filteredUsers = users.filter((item) => [item.name, item.code, item.email, item.role, item.department].join(" ").toLowerCase().includes(search.toLowerCase()));

  if (section === "users") return <section className="erp-page">
    <div className="erp-page-head"><div><div className="erp-eyebrow">Administration</div><h1>User Management</h1><p>Create and manage administrator, faculty and student accounts. Accounts are provisioned by the university.</p></div><button className="erp-button erp-button-light" onClick={load}><RefreshCw size={15} /> Refresh</button></div>
    <PageMessage error={error} success={success} clear={clearMessages} />
    {temporaryPassword && <div className="erp-secret-box"><ShieldCheck size={18} /><div><strong>Temporary password generated</strong><code>{temporaryPassword}</code><small>Copy it now and share it privately. The password is not shown again.</small></div><button onClick={() => navigator.clipboard?.writeText(temporaryPassword)} className="erp-button erp-button-light">Copy</button></div>}
    <div className="erp-card erp-form-card"><div className="erp-card-title"><UserPlus size={18} /><div><h2>Create account</h2><p>Set the university ID and initial password.</p></div></div>
      <form onSubmit={createUser} className="erp-form-grid">
        <FormField label="User ID" value={userForm.code} onChange={(value) => setUserForm({ ...userForm, code: value.toUpperCase() })} required placeholder="e.g. MCA2026001" />
        <FormField label="Full name" value={userForm.name} onChange={(value) => setUserForm({ ...userForm, name: value })} required />
        <FormField label="Role" value={userForm.role} onChange={(value) => setUserForm({ ...userForm, role: value })} options={["admin", "faculty", "student"]} required />
        <FormField label="Initial password (10+ characters)" value={userForm.password} onChange={(value) => setUserForm({ ...userForm, password: value })} type="password" required />
        <FormField label="Email" value={userForm.email} onChange={(value) => setUserForm({ ...userForm, email: value })} type="email" />
        <FormField label="Phone" value={userForm.phone} onChange={(value) => setUserForm({ ...userForm, phone: value })} />
        <FormField label="Department" value={userForm.department} onChange={(value) => setUserForm({ ...userForm, department: value })} />
        <FormField label="Programme" value={userForm.program} onChange={(value) => setUserForm({ ...userForm, program: value })} />
        {userForm.role === "student" && <><FormField label="USN" value={userForm.usn} onChange={(value) => setUserForm({ ...userForm, usn: value.toUpperCase() })} /><FormField label="Semester" value={userForm.semester} onChange={(value) => setUserForm({ ...userForm, semester: value })} type="number" /><FormField label="Section" value={userForm.section} onChange={(value) => setUserForm({ ...userForm, section: value.toUpperCase() })} /></>}
        <div className="erp-form-submit"><button className="erp-button" disabled={saving}><Plus size={16} /> {saving ? "Creating…" : "Create account"}</button></div>
      </form>
    </div>
    <div className="erp-card"><div className="erp-toolbar"><div className="erp-record-count"><strong>{users.length}</strong> accounts</div><label className="erp-search"><Users size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID, email or role" /></label></div>
      {loading ? <div className="erp-loading"><LoaderCircle className="erp-spin" /> Loading accounts…</div> : <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>User</th><th>Role</th><th>Department / Programme</th><th>Account</th><th>Actions</th></tr></thead><tbody>{filteredUsers.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.code} {item.usn ? `· ${item.usn}` : ""}</small></td><td><span className={`erp-role role-${item.role}`}>{item.role}</span></td><td>{item.department || "—"}<small>{item.program || ""} {item.semester ? `· Semester ${item.semester}` : ""} {item.section ? `· ${item.section}` : ""}</small></td><td><span className={`erp-status status-${item.isActive === false ? "rejected" : "active"}`}>{item.isActive === false ? "Inactive" : "Active"}</span></td><td><div className="erp-row-actions"><button className="erp-button erp-button-light erp-button-small" onClick={() => editUser(item)}>Edit</button><button className="erp-button erp-button-light erp-button-small" onClick={() => resetPassword(item)}>Reset password</button><button className="erp-button erp-button-quiet erp-button-small" onClick={() => toggleUser(item)}>{item.isActive === false ? "Activate" : "Deactivate"}</button></div></td></tr>)}</tbody></table></div>}
    </div>
  </section>;

  if (section === "academics") return <section className="erp-page">
    <div className="erp-page-head"><div><div className="erp-eyebrow">Administration</div><h1>Academic Setup</h1><p>Configure classes, subjects, faculty allocations and student enrolments before academic workflows begin.</p></div><button className="erp-button erp-button-light" onClick={load}><RefreshCw size={15} /> Refresh</button></div>
    <PageMessage error={error} success={success} clear={clearMessages} />
    <div className="erp-tabs">{[["classes", "Classes"], ["subjects", "Subjects"], ["assignments", "Faculty Assignments"], ["enrollments", "Student Enrolments"]].map(([key, label]) => <button className={subtab === key ? "active" : ""} onClick={() => setSubtab(key)} key={key}>{label}</button>)}</div>
    {subtab === "classes" && <div className="erp-card erp-form-card"><div className="erp-card-title"><Plus size={18} /><div><h2>Create class / section</h2><p>One record represents a department, academic year, semester and section.</p></div></div><form onSubmit={createClass} className="erp-form-grid"><FormField label="Department" value={classForm.department} onChange={(v) => setClassForm({ ...classForm, department: v })} required /><FormField label="Academic year" value={classForm.academicYear} onChange={(v) => setClassForm({ ...classForm, academicYear: v })} required /><FormField label="Semester" type="number" value={classForm.semester} onChange={(v) => setClassForm({ ...classForm, semester: v })} required /><FormField label="Section" value={classForm.section} onChange={(v) => setClassForm({ ...classForm, section: v.toUpperCase() })} required /><FormField label="Display name" value={classForm.name} onChange={(v) => setClassForm({ ...classForm, name: v })} required placeholder="MCA · Semester 1 · Section A" /><div className="erp-form-submit"><button className="erp-button" disabled={saving}><Plus size={16} /> Add class</button></div></form><div className="erp-divider" /><div className="erp-card-title"><h2>Existing classes</h2><span className="erp-counter">{classes.length}</span></div><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Class</th><th>Department</th><th>Academic year</th><th>Semester</th><th>Section</th><th>Actions</th></tr></thead><tbody>{classes.map((row) => <tr key={row._id}><td><strong>{row.name}</strong></td><td>{row.department}</td><td>{row.academicYear}</td><td>{row.semester}</td><td>{row.section}</td><td><div className="erp-row-actions"><button className="erp-button erp-button-light erp-button-small" onClick={() => editClass(row)}>Edit</button><button className="erp-button erp-button-danger erp-button-small" onClick={() => deleteClass(row)}>Delete</button></div></td></tr>)}</tbody></table></div></div>}
    {subtab === "subjects" && <div className="erp-card erp-form-card"><div className="erp-card-title"><Plus size={18} /><div><h2>Create subject</h2><p>Subject codes are unique and are used by attendance and marks.</p></div></div><form onSubmit={createSubject} className="erp-form-grid"><FormField label="Subject code" value={subjectForm.code} onChange={(v) => setSubjectForm({ ...subjectForm, code: v.toUpperCase() })} required /><FormField label="Subject name" value={subjectForm.name} onChange={(v) => setSubjectForm({ ...subjectForm, name: v })} required /><FormField label="Department" value={subjectForm.department} onChange={(v) => setSubjectForm({ ...subjectForm, department: v })} /><FormField label="Semester" value={subjectForm.semester} onChange={(v) => setSubjectForm({ ...subjectForm, semester: v })} type="number" /><FormField label="Section (optional)" value={subjectForm.section} onChange={(v) => setSubjectForm({ ...subjectForm, section: v })} /><div className="erp-form-submit"><button className="erp-button" disabled={saving}><Plus size={16} /> Add subject</button></div></form><div className="erp-divider" /><div className="erp-card-title"><h2>Subjects</h2><span className="erp-counter">{subjects.length}</span></div><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Code</th><th>Subject</th><th>Department</th><th>Semester</th><th>Section</th><th>Actions</th></tr></thead><tbody>{subjects.map((row) => <tr key={row._id}><td><strong>{row.code}</strong></td><td>{row.name}</td><td>{row.department || "—"}</td><td>{row.semester || "—"}</td><td>{row.section || "—"}</td><td><div className="erp-row-actions"><button className="erp-button erp-button-light erp-button-small" onClick={() => editSubject(row)}>Edit</button><button className="erp-button erp-button-danger erp-button-small" onClick={() => deleteSubject(row)}>Delete</button></div></td></tr>)}</tbody></table></div></div>}
    {subtab === "assignments" && <div className="erp-card erp-form-card"><div className="erp-card-title"><Plus size={18} /><div><h2>Assign faculty</h2><p>Faculty access to class rosters, attendance and marks follows these assignments.</p></div></div><form onSubmit={createAssignment} className="erp-form-grid"><FormField label="Faculty member" value={assignmentForm.facultyId} onChange={(v) => setAssignmentForm({ ...assignmentForm, facultyId: v })} required options={faculty.map((v) => ({ value: v.id, label: `${v.name} · ${v.code}` }))} /><FormField label="Class" value={assignmentForm.classId} onChange={(v) => setAssignmentForm({ ...assignmentForm, classId: v })} required options={classes.map((v) => ({ value: v._id, label: v.name }))} /><FormField label="Subject" value={assignmentForm.subjectId} onChange={(v) => setAssignmentForm({ ...assignmentForm, subjectId: v })} required options={subjects.map((v) => ({ value: v._id, label: `${v.code} · ${v.name}` }))} /><FormField label="Timetable slot (optional)" value={assignmentForm.slot} onChange={(v) => setAssignmentForm({ ...assignmentForm, slot: v })} /><div className="erp-form-submit"><button className="erp-button" disabled={saving}><Plus size={16} /> Save assignment</button></div></form><div className="erp-divider" /><div className="erp-card-title"><h2>Faculty assignments</h2><span className="erp-counter">{assignments.length}</span></div><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Faculty</th><th>Class</th><th>Subject</th><th>Slot</th><th>Actions</th></tr></thead><tbody>{assignments.map((row) => <tr key={row._id}><td>{row.facultyId?.name || "—"}<small>{row.facultyId?.code || ""}</small></td><td>{row.classId?.name || "—"}</td><td>{row.subjectId?.code} · {row.subjectId?.name}</td><td>{row.slot || "—"}</td><td><button className="erp-button erp-button-danger erp-button-small" onClick={() => deleteAssignment(row)}>Remove</button></td></tr>)}</tbody></table></div></div>}
    {subtab === "enrollments" && <div className="erp-card erp-form-card"><div className="erp-card-title"><Plus size={18} /><div><h2>Enrol student in class</h2><p>Student class membership determines access to their class records.</p></div></div><form onSubmit={createEnrollment} className="erp-form-grid"><FormField label="Student" value={enrollmentForm.studentId} onChange={(v) => setEnrollmentForm({ ...enrollmentForm, studentId: v })} required options={students.map((v) => ({ value: v.id, label: `${v.name} · ${v.code}` }))} /><FormField label="Class" value={enrollmentForm.classId} onChange={(v) => setEnrollmentForm({ ...enrollmentForm, classId: v })} required options={classes.map((v) => ({ value: v._id, label: v.name }))} /><div className="erp-form-submit"><button className="erp-button" disabled={saving}><Plus size={16} /> Enrol student</button></div></form><div className="erp-divider" /><div className="erp-card-title"><h2>Student enrolments</h2><span className="erp-counter">{enrollments.length}</span></div><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Student</th><th>Class</th><th>Department</th><th>Year</th><th>Actions</th></tr></thead><tbody>{enrollments.map((row) => <tr key={row._id}><td>{row.studentId?.name || "—"}<small>{row.studentId?.usn || row.studentId?.code || ""}</small></td><td>{row.classId?.name || "—"}</td><td>{row.classId?.department || "—"}</td><td>{row.classId?.academicYear || "—"}</td><td><button className="erp-button erp-button-danger erp-button-small" onClick={() => deleteEnrollment(row)}>Remove</button></td></tr>)}</tbody></table></div></div>}
  </section>;

  if (section === "approvals") return <section className="erp-page">
    <div className="erp-page-head"><div><div className="erp-eyebrow">Administration</div><h1>Approvals & Requests</h1><p>Review faculty event proposals and student requests submitted through the portals.</p></div><button className="erp-button erp-button-light" onClick={load}><RefreshCw size={15} /> Refresh</button></div><PageMessage error={error} success={success} clear={clearMessages} />
    {loading ? <div className="erp-card erp-loading"><LoaderCircle className="erp-spin" /> Loading pending work…</div> : <>
      <div className="erp-section-title"><ClipboardCheck size={18} /><h2>Module requests <span className="erp-counter">{approvals.records?.length || 0}</span></h2></div>
      <div className="erp-card">{(approvals.records || []).length === 0 ? <div className="erp-empty"><Check size={24} /><strong>No pending module requests</strong><span>New applications and requests will appear here.</span></div> : <div className="erp-record-list">{approvals.records.map((row) => <article className="erp-record" key={row._id}><div className="erp-record-main"><div className="erp-record-top"><h3>{row.title}</h3><span className="erp-status status-submitted">{row.status}</span></div><p className="erp-record-description">{row.module.replaceAll("-", " ")} · {row.createdBy?.name || "User"} ({row.createdBy?.role || ""}) {row.targetUserId?.name ? `· For ${row.targetUserId.name}` : ""}</p><div className="erp-record-meta"><span>{row.department || "University"}</span><span>Received {fmtDate(row.createdAt)}</span></div></div><div className="erp-record-actions"><button className="erp-button erp-button-small" onClick={() => reviewRecord(row, "Approved")}>Approve</button><button className="erp-button erp-button-danger erp-button-small" onClick={() => reviewRecord(row, "Rejected")}>Reject</button></div></article>)}</div>}</div>
      <div className="erp-section-title"><ClipboardCheck size={18} /><h2>Event proposals <span className="erp-counter">{approvals.events?.length || 0}</span></h2></div>
      <div className="erp-card">{(approvals.events || []).length === 0 ? <div className="erp-empty"><Check size={24} /><strong>No pending event proposals</strong></div> : <div className="erp-record-list">{approvals.events.map((row) => <article className="erp-record" key={row._id}><div className="erp-record-main"><div className="erp-record-top"><h3>{row.title}</h3><span className="erp-status status-pending">Pending</span></div><p className="erp-record-description">{row.description}</p><div className="erp-record-meta"><span>{row.department}</span><span>{fmtDate(row.startsAt)}</span><span>{row.location}</span><span>Submitted by {row.createdBy?.name || "Faculty"}</span></div></div><div className="erp-record-actions"><button className="erp-button erp-button-small" onClick={() => reviewEvent(row, "Granted")}>Grant</button><button className="erp-button erp-button-danger erp-button-small" onClick={() => reviewEvent(row, "Rejected")}>Reject</button></div></article>)}</div>}</div>
    </>}</section>;

  if (section === "folders") return <section className="erp-page"><div className="erp-page-head"><div><div className="erp-eyebrow">System storage</div><h1>Automatic Data Filing</h1><p>Generated folder structure for records saved by the ERP. This registry is read-only by design.</p></div><button className="erp-button erp-button-light" onClick={load}><RefreshCw size={15} /> Refresh</button></div><PageMessage error={error} success={success} clear={clearMessages} /><div className="erp-card"><div className="erp-toolbar"><div className="erp-record-count"><strong>{folders.length}</strong> generated folders</div><span className="erp-readonly"><ShieldCheck size={14} /> System-managed · Read only</span></div>{loading ? <div className="erp-loading"><LoaderCircle className="erp-spin" /> Loading folder registry…</div> : folders.length === 0 ? <div className="erp-empty"><FolderTree size={24} /><strong>No folders have been generated yet</strong><span>Folders are created automatically when records are saved.</span></div> : <div className="erp-folder-list">{folders.map((folder) => <div className="erp-folder-row" key={folder._id}><FolderTree size={16} /><div><strong>{folder.path}</strong><small>{folder.module} · {folder.name}</small></div></div>)}</div>}</div></section>;

  return <section className="erp-page"><div className="erp-page-head"><div><div className="erp-eyebrow">Administration</div><h1>Admin Console</h1><p>Select a management area from the navigation.</p></div></div></section>;
}
