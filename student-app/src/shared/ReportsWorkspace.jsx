import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, LoaderCircle, RefreshCw, Search } from "lucide-react";
import { api } from "./api";

function saveWorkbook(rows, sheetName, filename) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet["!cols"] = Object.keys(rows[0] || {}).map((key) => ({ wch: Math.max(14, Math.min(34, key.length + 4)) }));
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

export default function ReportsWorkspace({ user }) {
  const isAdmin = user.role === "admin";
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [marksRows, setMarksRows] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const loadOptions = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (isAdmin) {
        const [classResponse, subjectResponse] = await Promise.all([api("/api/admin/classes"), api("/api/admin/subjects")]);
        setClasses(classResponse.classes || []);
        setSubjects(subjectResponse.subjects || []);
      } else {
        const response = await api(`/api/faculty/${user.id}/classes`);
        const pairs = response.classes || [];
        setAssignments(pairs);
        if (pairs.length) {
          setClassId((current) => pairs.some((row) => row.classId === current) ? current : pairs[0].classId);
          setSubjectId((current) => pairs.some((row) => row.classId === classId && row.subjectId === current) ? current : pairs[0].subjectId);
        }
      }
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, [isAdmin, user.id]);

  useEffect(() => { loadOptions(); }, [loadOptions]);

  const facultyClassOptions = useMemo(() => [...new Map(assignments.map((row) => [row.classId, row])).values()], [assignments]);
  const facultySubjectOptions = useMemo(() => assignments.filter((row) => row.classId === classId), [assignments, classId]);

  async function loadReports(event) {
    event?.preventDefault();
    if (!classId || !subjectId) { setError("Select a class and subject first."); return; }
    if (from && to && from > to) { setError("The start date must not be after the end date."); return; }
    setBusy(true); setError(""); setSuccess(""); setLoaded(false);
    const params = new URLSearchParams({ classId, subjectId });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    try {
      const [attendance, marks] = await Promise.all([
        api(`/api/reports/attendance?${params.toString()}`),
        api(`/api/reports/marks?classId=${encodeURIComponent(classId)}&subjectId=${encodeURIComponent(subjectId)}`),
      ]);
      setAttendanceRows(attendance.records || []);
      setMarksRows(marks.records || []);
      setLoaded(true);
      setSuccess(`Reports loaded: ${attendance.count || 0} attendance rows and ${marks.count || 0} student mark rows.`);
    } catch (loadError) { setError(loadError.message); setAttendanceRows([]); setMarksRows([]); }
    finally { setBusy(false); }
  }

  const classLabel = (classes.find((row) => row._id === classId)?.name) || (facultyClassOptions.find((row) => row.classId === classId)?.className) || "class";
  const subjectLabel = (subjects.find((row) => row._id === subjectId)?.name) || (facultySubjectOptions.find((row) => row.subjectId === subjectId)?.subject) || "subject";
  const baseName = `SVYASA_${classLabel}_${subjectLabel}`.replace(/[^a-z0-9_-]+/gi, "_");

  function downloadAttendance() {
    if (!attendanceRows.length) return;
    saveWorkbook(attendanceRows, "Attendance", `${baseName}_Attendance.xlsx`);
  }
  function downloadMarks() {
    if (!marksRows.length) return;
    saveWorkbook(marksRows, "CIA and Internals", `${baseName}_CIA_Internal_Marks.xlsx`);
  }

  return <section className="erp-page">
    <div className="erp-page-head"><div><div className="erp-eyebrow">Reports & downloads</div><h1>Academic Reports</h1><p>Download attendance and CIA/Internal marks for the selected class and subject. Faculty reports are limited to their assigned allocations.</p></div><button className="erp-button erp-button-light" onClick={loadOptions} disabled={loading}><RefreshCw size={15}/> Refresh allocations</button></div>
    {error && <div className="erp-alert erp-alert-error">{error}</div>}
    {success && <div className="erp-alert erp-alert-success">{success}</div>}
    <form className="erp-card erp-form-card" onSubmit={loadReports}>
      <div className="erp-card-title"><FileSpreadsheet size={18}/><div><h2>Choose report scope</h2><p>Choose one class and subject. Attendance can be restricted to a date range.</p></div></div>
      {loading ? <div className="erp-loading"><LoaderCircle className="erp-spin"/> Loading classes and subjects…</div> : <div className="erp-form-grid">
        {isAdmin ? <>
          <label className="erp-form-field"><span>Class *</span><select className="erp-input" required value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">Select class</option>{classes.map((row) => <option key={row._id} value={row._id}>{row.name} · {row.academicYear}</option>)}</select></label>
          <label className="erp-form-field"><span>Subject *</span><select className="erp-input" required value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="">Select subject</option>{subjects.map((row) => <option key={row._id} value={row._id}>{row.code} · {row.name}</option>)}</select></label>
        </> : <>
          <label className="erp-form-field"><span>Assigned class *</span><select className="erp-input" required value={classId} onChange={(event) => { const next = event.target.value; setClassId(next); const first = assignments.find((row) => row.classId === next); setSubjectId(first?.subjectId || ""); }}><option value="">Select class</option>{facultyClassOptions.map((row) => <option key={row.classId} value={row.classId}>{row.className} · {row.academicYear}</option>)}</select></label>
          <label className="erp-form-field"><span>Assigned subject *</span><select className="erp-input" required value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="">Select subject</option>{facultySubjectOptions.map((row) => <option key={row.subjectId} value={row.subjectId}>{row.subjectCode} · {row.subject}</option>)}</select></label>
        </>}
        <label className="erp-form-field"><span>Attendance from</span><input className="erp-input" type="date" value={from} onChange={(event) => setFrom(event.target.value)}/></label>
        <label className="erp-form-field"><span>Attendance to</span><input className="erp-input" type="date" value={to} onChange={(event) => setTo(event.target.value)}/></label>
        <div className="erp-form-submit"><button className="erp-button" disabled={busy || !classId || !subjectId}>{busy ? <LoaderCircle className="erp-spin" size={16}/> : <Search size={16}/>} Load reports</button></div>
      </div>}
    </form>
    {loaded && <div className="erp-card">
      <div className="erp-card-title"><Download size={18}/><div><h2>Download reports</h2><p>{classLabel} · {subjectLabel}</p></div></div>
      <div className="erp-form-grid">
        <div className="erp-card erp-form-card"><h3>Attendance report</h3><p>{attendanceRows.length} attendance rows, including remarks and OD/sick document review status.</p><button className="erp-button" disabled={!attendanceRows.length} onClick={downloadAttendance}><Download size={16}/> Download Attendance Excel</button></div>
        <div className="erp-card erp-form-card"><h3>CIA & Internal marks</h3><p>{marksRows.length} enrolled students, with CIA 1–3, Internal 1–2 and separate averages.</p><button className="erp-button" disabled={!marksRows.length} onClick={downloadMarks}><Download size={16}/> Download Marks Excel</button></div>
      </div>
    </div>}
  </section>;
}
