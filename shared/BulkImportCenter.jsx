import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Info, LoaderCircle, RefreshCw, ShieldCheck, TriangleAlert, Upload, X } from "lucide-react";
import { api } from "./api";

const IMPORTS = {
  students: {
    label: "Student accounts", description: "Create student accounts in bulk. Temporary passwords are generated automatically and shown once after import.",
    headers: ["userId", "name", "usn", "email", "phone", "department", "program", "semester", "section"],
    instructions: ["Use one row per student.", "userId must be unique. USN should be unique where provided.", "Do not add passwords. The ERP generates a one-time temporary password for each new account.", "Creating an account does not enrol the student. Use the Student enrolments import separately."],
  },
  faculty: {
    label: "Faculty accounts", description: "Create faculty accounts in bulk. Temporary passwords are generated automatically and shown once after import.",
    headers: ["userId", "name", "email", "phone", "department", "program"],
    instructions: ["Use one row per faculty member.", "userId must be unique.", "Do not add passwords. The ERP generates a one-time temporary password for each new account.", "Faculty must be allocated to class-subject combinations before using attendance and marks."],
  },
  classes: {
    label: "Classes / sections", description: "Create or update academic class sections by department, year, semester and section.",
    headers: ["department", "academicYear", "semester", "section", "name"],
    instructions: ["Use one row per class section.", "The unique class key is department + academicYear + semester + section.", "name is optional; the ERP generates a display name if it is blank."],
  },
  subjects: {
    label: "Subjects", description: "Create or update subject catalogue entries using unique subject codes.",
    headers: ["subjectCode", "subjectName", "department", "semester", "section"],
    instructions: ["subjectCode and subjectName are required.", "subjectCode is the unique subject key.", "Semester and section may be left blank for common subjects."],
  },
  enrollments: {
    label: "Student enrolments", description: "Enrol existing student accounts into an already-created class.",
    headers: ["studentId", "department", "academicYear", "semester", "section"],
    instructions: ["studentId accepts the student's User ID or USN.", "The class must already exist in Academic Setup.", "Repeated enrolments are safely reused; they are not duplicated."],
  },
  "faculty-assignments": {
    label: "Faculty assignments", description: "Allocate existing faculty accounts to existing class and subject combinations.",
    headers: ["facultyId", "subjectCode", "department", "academicYear", "semester", "section", "slot"],
    instructions: ["facultyId accepts the faculty User ID.", "The subject and class must already exist.", "Faculty, subject and class departments/semesters must match.", "Repeated allocations are safely reused."],
  },
  attendance: {
    label: "Attendance register", description: "Import attendance rows for the selected class and subject. Faculty can only import their own allocated class-subject records.",
    headers: ["studentId", "date", "status", "remarks"],
    instructions: ["Choose a class-subject allocation before uploading.", "studentId accepts User ID or USN and must be enrolled in the selected class.", "date must be YYYY-MM-DD. Valid statuses: present, absent, late.", "If the same student, class, subject and date already exists, the import updates that record."],
  },
  marks: {
    label: "CIA & Internal marks register", description: "Import exactly three CIA scores and two Internal assessment scores for the selected class and subject.",
    headers: ["studentId", "cia1", "cia2", "cia3", "internal1", "internal2"],
    instructions: ["Choose a class-subject allocation before uploading.", "studentId accepts User ID or USN and must be enrolled in the selected class.", "Each score must be between 0 and 100.", "Blank cells leave existing scores unchanged. Enter at least one CIA or Internal score.", "CIA average (CIA 1–3) and Internal average (Internal 1–2) are calculated separately by the ERP."],
  },
};

const TYPE_OPTIONS = {
  admin: ["students", "faculty", "classes", "subjects", "enrollments", "faculty-assignments", "attendance", "marks"],
  faculty: ["attendance", "marks"],
};

const HEADER_ALIASES = {
  userid: "userId", code: "code", studentid: "studentId", studentcode: "studentId", usn: "usn", studentusn: "usn",
  facultyid: "facultyId", facultycode: "facultyId", fullname: "name", name: "name", email: "email", phone: "phone",
  department: "department", program: "program", programme: "program", semester: "semester", section: "section",
  academicyear: "academicYear", classname: "name", subjectcode: "subjectCode", subjectname: "subjectName", date: "date", attendancedate: "date", status: "status", remarks: "remarks", slot: "slot",
  cia1: "cia1", cia2: "cia2", cia3: "cia3", internal1: "internal1", internal2: "internal2", ia1: "internal1", ia2: "internal2", internalassessment1: "internal1", internalassessment2: "internal2",
};

function normaliseHeader(header) {
  const key = String(header || "").replace(/^\uFEFF/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return HEADER_ALIASES[key] || String(header || "").trim();
}
function normaliseRows(rows) {
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [normaliseHeader(key), value instanceof Date ? value.toISOString().slice(0, 10) : value])));
}
function downloadWorkbook(headers, instructions, filename) {
  const workbook = XLSX.utils.book_new();
  const template = XLSX.utils.aoa_to_sheet([headers]);
  template["!cols"] = headers.map((header) => ({ wch: Math.max(14, Math.min(24, header.length + 5)) }));
  XLSX.utils.book_append_sheet(workbook, template, "Import Data");
  const guide = XLSX.utils.aoa_to_sheet([["Instructions"], ...instructions.map((text) => [text])]);
  guide["!cols"] = [{ wch: 105 }];
  XLSX.utils.book_append_sheet(workbook, guide, "Read Me");
  XLSX.writeFile(workbook, filename);
}
function downloadRows(rows, filename, sheetName = "Results") {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

export default function BulkImportCenter({ user }) {
  const availableTypes = TYPE_OPTIONS[user.role] || [];
  const [type, setType] = useState(availableTypes[0] || "attendance");
  const [assignments, setAssignments] = useState([]);
  const [history, setHistory] = useState([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [validation, setValidation] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const definition = IMPORTS[type];
  const needsContext = type === "attendance" || type === "marks";
  const selectedAssignment = useMemo(() => assignments.find((item) => item.assignmentId === assignmentId), [assignments, assignmentId]);

  const loadAssignments = useCallback(async () => {
    try {
      const [response, historyResponse] = await Promise.all([api("/api/imports/context"), api("/api/imports/history")]);
      setAssignments(response.assignments || []);
      setHistory(historyResponse.batches || []);
      setAssignmentId((current) => response.assignments?.some((item) => item.assignmentId === current) ? current : (response.assignments?.[0]?.assignmentId || ""));
    } catch (loadError) { setError(loadError.message); }
  }, []);
  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  function resetFileState() { setFileName(""); setRows([]); setValidation(null); setResult(null); setError(""); }
  function changeType(nextType) { setType(nextType); resetFileState(); }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    resetFileState();
    setBusy(true);
    try {
      const extension = file.name.split(".").pop().toLowerCase();
      if (!["xlsx", "xls", "csv"].includes(extension)) throw new Error("Choose an Excel (.xlsx, .xls) or CSV (.csv) file.");
      if (file.size > 5 * 1024 * 1024) throw new Error("File is larger than 5 MB. Split it into smaller files.");
      const bytes = await file.arrayBuffer();
      const workbook = XLSX.read(bytes, { type: "array", cellDates: true });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) throw new Error("The workbook does not contain a worksheet.");
      const parsed = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "", raw: true, blankrows: false });
      const cleanRows = normaliseRows(parsed).filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""));
      if (!cleanRows.length) throw new Error("No data rows were found. Keep the column headers in the first row.");
      if (cleanRows.length > 2000) throw new Error("This import supports up to 2,000 data rows at a time.");
      setRows(cleanRows); setFileName(file.name);
    } catch (parseError) { setError(parseError.message); }
    finally { setBusy(false); event.target.value = ""; }
  }

  const context = selectedAssignment ? {
    assignmentId: selectedAssignment.assignmentId,
    facultyId: selectedAssignment.facultyId,
    classId: selectedAssignment.classId,
    subjectId: selectedAssignment.subjectId,
  } : {};

  async function validate() {
    if (!rows.length) { setError("Choose a file first."); return; }
    if (needsContext && !selectedAssignment) { setError("No allocated class-subject combination is available. Ask the administrator to create the faculty assignment first."); return; }
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await api(`/api/imports/${type}/validate`, { method: "POST", body: { rows, context } });
      setValidation(response);
    } catch (validateError) { setError(validateError.message); }
    finally { setBusy(false); }
  }

  async function commit() {
    if (!validation?.validRows) return;
    const message = validation.invalidRows
      ? `${validation.validRows} valid rows will be imported. ${validation.invalidRows} invalid rows will be skipped. Continue?`
      : `Import all ${validation.validRows} validated rows?`;
    if (!window.confirm(message)) return;
    setBusy(true); setError("");
    try {
      const response = await api(`/api/imports/${type}/commit`, { method: "POST", body: { rows, context, fileName } });
      setResult(response); setValidation(null);
      const historyResponse = await api("/api/imports/history"); setHistory(historyResponse.batches || []);
    } catch (commitError) { setError(commitError.message); }
    finally { setBusy(false); }
  }

  return <section className="erp-page">
    <div className="erp-page-head"><div><div className="erp-eyebrow">Data operations</div><h1>Excel / Bulk Import</h1><p>Import structured records from Excel instead of entering them one at a time. Every row is checked by the server before it is saved.</p></div><button className="erp-button erp-button-light" onClick={loadAssignments}><RefreshCw size={15}/> Refresh allocations</button></div>
    <div className="erp-import-security"><ShieldCheck size={18}/><div><strong>Role-aware import controls</strong><span>{user.role === "admin" ? "Administrators can provision accounts and manage academic master data. Attendance and marks imports still require a valid teaching allocation." : "Faculty can import attendance and CIA/Internal marks only for their own assigned class and subject combinations. Student enrolment is checked for every row."}</span></div></div>
    {error && <div className="erp-alert erp-alert-error"><AlertCircle size={16}/>{error}<button onClick={() => setError("")}><X size={14}/></button></div>}

    <div className="erp-card erp-import-card">
      <div className="erp-import-step"><span>1</span><div><h2>Choose what you want to import</h2><p>Select an import type. Download its template before preparing your workbook.</p></div></div>
      <label className="erp-form-field"><span>Import type</span><select className="erp-input" value={type} onChange={(event) => changeType(event.target.value)}>{availableTypes.map((key) => <option value={key} key={key}>{IMPORTS[key].label}</option>)}</select></label>
      <div className="erp-import-description"><strong>{definition.label}</strong><span>{definition.description}</span></div>
      <button className="erp-button erp-button-light" onClick={() => downloadWorkbook(definition.headers, definition.instructions, `SVYASA_${type}_template.xlsx`)}><Download size={16}/> Download Excel template</button>
      <div className="erp-import-columns"><strong>Required column headers</strong><div>{definition.headers.map((header) => <code key={header}>{header}</code>)}</div></div>
      <div className="erp-import-note"><Info size={16}/><div>{definition.instructions.map((instruction) => <span key={instruction}>{instruction}</span>)}</div></div>
    </div>

    {needsContext && <div className="erp-card erp-import-card">
      <div className="erp-import-step"><span>2</span><div><h2>Select class and subject</h2><p>Import rows are scoped to one teaching allocation. The file does not need internal MongoDB IDs.</p></div></div>
      <label className="erp-form-field"><span>Assigned class · subject · faculty</span><select className="erp-input" value={assignmentId} onChange={(event) => { setAssignmentId(event.target.value); setValidation(null); setResult(null); }}><option value="">Choose an allocation</option>{assignments.map((item) => <option value={item.assignmentId} key={item.assignmentId}>{item.className} · {item.subjectCode} · {item.facultyName || "Assigned faculty"} · {item.academicYear}</option>)}</select></label>
      {!assignments.length && <div className="erp-import-empty">No class-subject allocation is available. Ask the administrator to assign the subject first.</div>}
    </div>}

    <div className="erp-card erp-import-card">
      <div className="erp-import-step"><span>{needsContext ? "3" : "2"}</span><div><h2>Upload your workbook</h2><p>Supported formats: .xlsx, .xls and .csv. Maximum 5 MB and 2,000 rows per import.</p></div></div>
      <label className="erp-import-drop"><FileSpreadsheet size={30}/><strong>{fileName || "Choose an Excel or CSV file"}</strong><span>{rows.length ? `${rows.length.toLocaleString()} data rows loaded` : "The first worksheet is read. Keep the column headers in row 1."}</span><input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile}/></label>
      {rows.length > 0 && <div className="erp-import-file-row"><span><CheckCircle2 size={16}/> {fileName}</span><button className="erp-button erp-button-quiet erp-button-small" onClick={resetFileState}>Remove file</button></div>}
      <div className="erp-import-actions"><button className="erp-button" onClick={validate} disabled={busy || !rows.length || (needsContext && !selectedAssignment)}>{busy ? <LoaderCircle size={16} className="erp-spin"/> : <ClipboardIcon/>} Validate spreadsheet</button></div>
    </div>

    {validation && <div className="erp-card erp-import-card">
      <div className="erp-import-step"><span>✓</span><div><h2>Validation results</h2><p>No database changes have been made yet. Review errors and warnings before committing.</p></div></div>
      <div className="erp-import-stats"><div><strong>{validation.totalRows}</strong><span>Total rows</span></div><div className="good"><strong>{validation.validRows}</strong><span>Valid</span></div><div className="bad"><strong>{validation.invalidRows}</strong><span>Invalid</span></div></div>
      {validation.warnings?.length > 0 && <div className="erp-import-warning"><TriangleAlert size={16}/><div><strong>{validation.warnings.length} row warning(s)</strong>{validation.warnings.slice(0, 8).map((item) => <span key={item.rowNumber}>Row {item.rowNumber}: {item.warning}</span>)}</div></div>}
      {validation.errors?.length > 0 && <div className="erp-import-errors"><strong>Rows that need correction</strong><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Excel row</th><th>Problem</th></tr></thead><tbody>{validation.errors.slice(0, 20).map((item) => <tr key={`${item.rowNumber}-${item.error}`}><td>{item.rowNumber}</td><td>{item.error}</td></tr>)}</tbody></table></div>{validation.errors.length > 20 && <small>Showing first 20 errors.</small>}<button className="erp-button erp-button-light erp-button-small" onClick={() => downloadRows(validation.errors.map((item) => ({ rowNumber: item.rowNumber, error: item.error, ...item.values })), "SVYASA_validation_errors.xlsx", "Invalid Rows")}><Download size={15}/> Download invalid rows</button></div>}
      {validation.preview?.length > 0 && <div className="erp-import-preview"><strong>Validated row preview</strong><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Excel row</th>{definition.headers.slice(0, 5).map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{validation.preview.slice(0, 8).map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td>{definition.headers.slice(0, 5).map((header) => <td key={header}>{String(row.values?.[header] ?? "—")}</td>)}</tr>)}</tbody></table></div></div>}
      <div className="erp-import-actions"><button className="erp-button erp-button-light" onClick={() => setValidation(null)}>Back to file</button><button className="erp-button" onClick={commit} disabled={busy || !validation.validRows}>{busy ? <LoaderCircle size={16} className="erp-spin"/> : <Upload size={16}/>} Import {validation.validRows} valid rows</button></div>
    </div>}

    {result && <div className="erp-card erp-import-card">
      <div className="erp-import-step"><span>✓</span><div><h2>Import completed</h2><p>Review the row counts below. Invalid rows were not saved.</p></div></div>
      <div className="erp-import-stats"><div><strong>{result.totalRows}</strong><span>Total rows</span></div><div className="good"><strong>{result.created || 0}</strong><span>Created</span></div><div><strong>{result.updated || 0}</strong><span>Updated</span></div><div><strong>{result.skipped || 0}</strong><span>Reused / skipped</span></div><div className="bad"><strong>{result.failed || 0}</strong><span>Failed</span></div></div>
      {result.auditWarning && <div className="erp-import-warning"><TriangleAlert size={16}/><div><strong>Audit-history warning</strong><span>{result.auditWarning}</span></div></div>}
      {result.credentials?.length > 0 && <div className="erp-import-credentials"><ShieldCheck size={18}/><div><strong>Temporary passwords generated</strong><span>These credentials are shown only in this result. Download and share them securely, then ask each user to change their password. Do not leave this page open on a shared computer.</span></div><button className="erp-button erp-button-light" onClick={() => downloadRows(result.credentials, "SVYASA_temporary_account_credentials.xlsx", "Credentials")}><Download size={15}/> Download credentials</button></div>}
      {result.errors?.length > 0 && <div className="erp-import-errors"><strong>Failed rows</strong><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Excel row</th><th>Error</th></tr></thead><tbody>{result.errors.slice(0, 20).map((item, index) => <tr key={`${item.rowNumber}-${index}`}><td>{item.rowNumber}</td><td>{item.error}</td></tr>)}</tbody></table></div><button className="erp-button erp-button-light erp-button-small" onClick={() => downloadRows(result.errors.map((item) => ({ rowNumber: item.rowNumber, error: item.error, ...item.values })), "SVYASA_failed_import_rows.xlsx", "Failed Rows")}><Download size={15}/> Download failed rows</button></div>}
      <div className="erp-import-actions"><button className="erp-button" onClick={() => { resetFileState(); setResult(null); }}>Start another import</button></div>
    </div>}
    <div className="erp-card erp-import-card">
      <div className="erp-import-step"><span><RefreshCw size={14}/></span><div><h2>Recent import history</h2><p>Audit trail of recent bulk uploads. The workbook and temporary passwords are not stored in the history.</p></div></div>
      {!history.length ? <div className="erp-import-empty">No bulk imports have been completed yet.</div> : <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Completed</th><th>File</th><th>Import type</th><th>Rows</th><th>Created</th><th>Updated</th><th>Failed</th></tr></thead><tbody>{history.map((item) => <tr key={item._id}><td>{new Date(item.completedAt || item.createdAt).toLocaleString("en-IN")}</td><td>{item.fileName || "—"}<small>{item.uploadedBy?.name || ""}</small></td><td>{IMPORTS[item.importType]?.label || item.importType}</td><td>{item.totalRows}</td><td>{item.created || 0}</td><td>{item.updated || 0}</td><td>{item.failed || 0}</td></tr>)}</tbody></table></div>}
    </div>
    <div className="erp-import-footnote"><Info size={15}/> Importing does not create manual database folders. Each committed record is saved using the ERP's automatic folder filing logic. Imports are limited to 2,000 rows per file to keep validation and recovery manageable.</div>
  </section>;
}

function ClipboardIcon() { return <Upload size={16}/>; }
