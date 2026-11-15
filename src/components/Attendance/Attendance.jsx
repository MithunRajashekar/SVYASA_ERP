import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  Download,
  FileCheck,
  CalendarClock,
  AlertCircle,
  Search,
  RefreshCw,
  LayoutGrid,
  Eye,
  Calendar,
} from "lucide-react";
import * as XLSX from "xlsx";
import AttendanceView from "./AttendanceView";
import ReportGenerationView from "./ReportGenerationView";
import {
  apiStatusToUi,
  fetchAttendance,
  getSessionUser,
  setSessionUser,
  fetchClassStudents,
  fetchFacultyClasses,
  groupRecordsForUi,
  saveAttendance,
  uiStatusToApi,
} from "../../lib/attendanceApi";

const BRAND_GRADIENT = "var(--gradient-brand)";

const STATUS = {
  PRESENT: "P",
  ABSENT: "A",
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function parseExcelFile(file) {
  const workbook = XLSX.read(await file.arrayBuffer());
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  return data.filter((row) => row.some((cell) => String(cell || "").trim() !== ""));
}

function getInitialRows(studentList = []) {
  return studentList.reduce((acc, student) => {
    acc[student.id] = {
      status: STATUS.PRESENT,
      comment: "",
    };
    return acc;
  }, {});
}

function getUnique(values) {
  return [...new Set(values)];
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeStatus(value) {
  const text = String(value || "").trim().toUpperCase();
  if (text === "P" || text === "PRESENT") return STATUS.PRESENT;
  if (text === "A" || text === "ABSENT") return STATUS.ABSENT;
  return null;
}

function isDateHeader(value) {
  const text = String(value || "").trim();
  if (!text) return false;

  const numeric = Number(text);
  if (Number.isFinite(numeric) && numeric > 20000 && numeric < 80000) {
    return true;
  }

  return !Number.isNaN(Date.parse(text));
}

function formatDateHeader(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  const numeric = Number(text);
  if (Number.isFinite(numeric) && numeric > 20000 && numeric < 80000) {
    return XLSX.SSF.format("dd mmm yyyy", numeric);
  }

  return text;
}

function findHeaderIndex(headers, names) {
  return headers.findIndex((header) => names.includes(normalizeHeader(header)));
}

function buildRowsFromAttendance(attendance = [], studentList = []) {
  return studentList.reduce((acc, student) => {
    const matched = attendance.find((row) => row.id === student.id || String(row.usn || "") === student.usn);
    acc[student.id] = {
      status: matched?.status || STATUS.PRESENT,
      comment: matched?.comment || "",
    };
    return acc;
  }, {});
}

function buildWorkbookTemplateRows(classLabel, courseCode, studentList = [], dates = []) {
  return studentList.map((student, index) => [
    index + 1,
    classLabel,
    student.usn,
    student.name,
    courseCode,
    ...dates.map(() => STATUS.PRESENT),
  ]);
}

function getWorkbookLayout(matrix) {
  if (!Array.isArray(matrix) || matrix.length < 3) {
    throw new Error("File is empty or missing attendance rows.");
  }

  const firstRow = matrix[0].map((cell) => String(cell || "").trim());
  const secondRow = matrix[1].map((cell) => String(cell || "").trim());
  const firstRowHasDates = firstRow.some((cell) => isDateHeader(cell));
  const secondRowHasLabels = secondRow.some((cell) => ["sl. no", "sl no", "register no.", "student name", "course code"].includes(cell.toLowerCase()));

  if (firstRowHasDates && secondRowHasLabels) {
    return {
      headerRow: firstRow,
      labelRow: secondRow,
      dataStartRow: 2,
    };
  }

  return {
    headerRow: firstRow,
    labelRow: firstRow,
    dataStartRow: 1,
  };
}

export default function Attendance({ tab = "Student Attendance", onTabChange } = {}) {
  const defaultMarkAllStatus = STATUS.PRESENT;
  const [rows, setRows] = useState({});
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [sessionUser, setDevUser] = useState(() => getSessionUser());
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const tabToModule = {
    "Student Attendance": "mark",
    "View Attendance": "view",
    "View Report": "report",
    "Attendance Report": "report",
  };
  const [activeModule, setActiveModule] = useState(() => tabToModule[tab] || "mark");
  const [markAllStatus, setMarkAllStatus] = useState(defaultMarkAllStatus);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [currentRecordId, setCurrentRecordId] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const uploadInputRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [classInfo, setClassInfo] = useState({
    department: "",
    semester: "",
    academicYear: "",
    subject: "",
    section: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayIsoDate());
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergedSections, setMergedSections] = useState([]);
  const [syncSelections, setSyncSelections] = useState([]);

  useEffect(() => {
    const module = tabToModule[tab] || "mark";
    setActiveModule(module);
  }, [tab]);

  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapFaculty() {
      const current = getSessionUser();
      if (!current?.userId || !["faculty", "admin"].includes(current.role)) {
        if (!cancelled) {
          setError("Sign in with a faculty or administrator account to use attendance.");
          setLoadingClasses(false);
        }
        return;
      }
      if (!cancelled) {
        setDevUser(current);
        setSelectedFaculty(current.name || "");
      }
    }

    bootstrapFaculty();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionUser?.userId || !["faculty", "admin"].includes(sessionUser.role)) {
      setLoadingClasses(false);
      return;
    }

    let cancelled = false;

    async function loadAssignedClasses() {
      setLoadingClasses(true);
      setError("");
      try {
        const payload = await fetchFacultyClasses(sessionUser.userId);
        if (cancelled) return;
        const classes = payload.classes || [];
        setAssignments(classes);
        const first = classes[0];
        if (first) {
          setClassInfo({
            department: first.department,
            semester: first.semester,
            academicYear: first.academicYear,
            subject: first.subject,
            section: first.section,
          });
          setSelectedFaculty(first.facultyName || sessionUser.name);
        } else {
          setClassInfo({ department: "", semester: "", academicYear: "", subject: "", section: "" });
          setStudents([]);
        }

        const history = await fetchAttendance({ facultyId: sessionUser.userId });
        if (!cancelled) {
          setAttendanceRecords(groupRecordsForUi(history.records || []));
        }
      } catch (loadError) {
        if (!cancelled) {
          setAssignments([]);
          setError(loadError.message || "Could not load assigned classes.");
        }
      } finally {
        if (!cancelled) setLoadingClasses(false);
      }
    }

    loadAssignedClasses();
    return () => {
      cancelled = true;
    };
  }, [sessionUser?.userId, sessionUser?.role]);

  const semesterOptions = useMemo(() => {
    return getUnique(assignments.map((entry) => entry.semester));
  }, [assignments]);

  const academicYearOptions = useMemo(() => {
  if (!classInfo.semester) return [];

  return getUnique(
    assignments
      .filter((entry) => entry.semester === classInfo.semester)
      .map((entry) => entry.academicYear)
      .filter(Boolean)
  );
}, [assignments, classInfo.semester]);

  const subjectOptions = useMemo(() => {
  if (!classInfo.semester || !classInfo.academicYear) return [];

  return getUnique(
    assignments
      .filter(
        (entry) =>
          entry.semester === classInfo.semester &&
          entry.academicYear === classInfo.academicYear
      )
      .map((entry) => entry.subject)
  );
}, [assignments, classInfo.semester, classInfo.academicYear]);

  const sections = useMemo(() => {
  if (!classInfo.semester || !classInfo.academicYear || !classInfo.subject) return [];

  return getUnique(
    assignments
      .filter(
        (entry) =>
          entry.semester === classInfo.semester &&
          entry.academicYear === classInfo.academicYear &&
          entry.subject === classInfo.subject
      )
      .map((entry) => entry.section)
  );
}, [
  assignments,
  classInfo.semester,
  classInfo.academicYear,
  classInfo.subject,
]);


  const attendanceStatsMap = useMemo(() => {
    const stats = new Map();

    students.forEach((student) => {
      stats.set(student.id, { attended: 0, total: 0, percentage: 0 });
    });

    attendanceRecords.forEach((record) => {
      record.attendance?.forEach((studentRecord) => {
        const current = stats.get(studentRecord.id);
        if (!current) return;

        current.total += 1;
        if (studentRecord.status === STATUS.PRESENT) {
          current.attended += 1;
        }
      });
    });

    stats.forEach((value, key) => {
      value.percentage = value.total > 0 ? Math.round((value.attended / value.total) * 100) : 0;
      stats.set(key, value);
    });

    return stats;
  }, [attendanceRecords, students]);

  const selectedTimetable = useMemo(() => {
  return (
    assignments.find(
      (entry) =>
        entry.department === classInfo.department &&
        entry.semester === classInfo.semester &&
        entry.academicYear === classInfo.academicYear &&
        entry.subject === classInfo.subject &&
        entry.section === classInfo.section
    ) ||
    assignments.find(
      (entry) =>
        entry.department === classInfo.department &&
        entry.semester === classInfo.semester &&
        entry.academicYear === classInfo.academicYear &&
        entry.subject === classInfo.subject
    ) ||
    null
  );
}, [assignments, classInfo]);

  const contextLabel = useMemo(() => {
    if (!selectedTimetable) {
      return "Select Semester, Subject, and Section to view timetable details.";
    }

    return `${selectedTimetable.department} | Sem ${selectedTimetable.semester} | ${selectedTimetable.subject} | Sec ${classInfo.section || "-"} | ${selectedDate} | ${selectedTimetable.slot || "-"}`;
  }, [selectedTimetable, classInfo.section, selectedDate]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return students;
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) || student.usn.toLowerCase().includes(query)
    );
  }, [searchQuery, students]);

  const selectionSummary = useMemo(() => {
    const parts = [
      classInfo.department,
      classInfo.semester ? `Semester ${classInfo.semester}` : "",
      classInfo.academicYear,
      classInfo.subject,
      classInfo.section ? `Section ${classInfo.section}` : "",
    ].filter(Boolean);

    if (mergedSections.length > 1) {
      parts.push(`Merged sections: ${mergedSections.join(", ")}`);
    }

    return parts.length ? parts.join(" | ") : "Select a class assignment.";
  }, [classInfo, mergedSections]);

  const freezingDate = useMemo(() => {
    const base = selectedDate;
    const date = new Date(base);
    if (Number.isNaN(date.getTime())) return "";
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }, [selectedDate]);

  const previousClassDate = useMemo(() => {
    const base = selectedDate;
    const date = new Date(base);
    if (Number.isNaN(date.getTime())) return "";
    date.setDate(date.getDate() - 1);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedTimetable?.classId) {
      setStudents([]);
      setRows({});
      setSyncSelections([]);
      return;
    }

    let cancelled = false;

    async function loadStudentsAndAttendance() {
      setLoadingStudents(true);
      setError("");
      try {
        const studentPayload = await fetchClassStudents(selectedTimetable.classId);
        if (cancelled) return;
        const roster = studentPayload.students || [];
        setStudents(roster);
        setSyncSelections(roster.slice(0, 8).map((student) => ({ ...student, selected: true })));

        const attendancePayload = await fetchAttendance({
          facultyId: selectedTimetable.facultyId,
          classId: selectedTimetable.classId,
          subjectId: selectedTimetable.subjectId,
          date: selectedDate,
        });
        if (cancelled) return;
        const records = attendancePayload.records || [];
        if (records.length > 0) {
          const mapped = records.map((row) => ({
            id: row.studentId,
            usn: row.studentUsn,
            name: row.studentName,
            status: apiStatusToUi(row.status),
            comment: row.remarks || "",
          }));
          setRows(buildRowsFromAttendance(mapped, roster));
          setCurrentRecordId(`${selectedTimetable.classId}|${selectedTimetable.subjectId}|${selectedDate}`);
          setIsSubmitted(true);
          setMessage("Loaded previously saved attendance for this class and date.");
        } else {
          setRows(getInitialRows(roster));
          setCurrentRecordId(null);
          setIsSubmitted(false);
        }
      } catch (loadError) {
        if (!cancelled) {
          setStudents([]);
          setRows({});
          setError(loadError.message || "Could not load students or attendance.");
        }
      } finally {
        if (!cancelled) setLoadingStudents(false);
      }
    }

    loadStudentsAndAttendance();
    return () => {
      cancelled = true;
    };
  }, [selectedTimetable?.classId, selectedTimetable?.subjectId, selectedTimetable?.facultyId, selectedDate]);

  const goToMark = () => {
    setActiveModule("mark");
    onTabChange?.("Student Attendance");
  };

  const goToView = () => {
    setActiveModule("view");
    onTabChange?.("View Attendance");
  };

  const goToReport = () => {
    setActiveModule("report");
    onTabChange?.("View Report");
  };

  const isClassSelected = Boolean(selectedTimetable && classInfo.section);
  const isEditLocked = false;

  const isStudentEditEnabled = () => !isEditLocked;

  const autoSaveAttendance = (rowsToSave) => {
    if (!selectedTimetable?.classId || !selectedTimetable?.subjectId) return;

    // Clear previous timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save after 2 seconds of inactivity
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const payload = {
          facultyId: selectedTimetable.facultyId,
          classId: selectedTimetable.classId,
          subjectId: selectedTimetable.subjectId,
          date: selectedDate,
          records: students.map((student) => ({
            studentId: student.id,
            status: uiStatusToApi(rowsToSave[student.id]?.status || STATUS.PRESENT),
            remarks: rowsToSave[student.id]?.comment || "",
          })),
        };

        await saveAttendance(payload);
        const history = await fetchAttendance({ facultyId: selectedTimetable.facultyId });
        setAttendanceRecords(groupRecordsForUi(history.records || []));
        setIsSubmitted(true);
        setMessage("Attendance auto-saved successfully.");
      } catch (error) {
        console.error("Auto-save failed:", error.message);
        // Don't show error for auto-save, just log it
      }
    }, 2000); // 2 second delay
  };

  const updateRow = (id, status) => {
    if (!isStudentEditEnabled(id) || !isClassSelected) return;
    setRows((prev) => {
      const updated = {
        ...prev,
        [id]: {
          ...prev[id],
          status,
          comment: "",
        },
      };
      // Trigger auto-save
      autoSaveAttendance(updated);
      return updated;
    });
  };


  const applySyncMeetingAttendees = async () => {
    const selectedIds = new Set(syncSelections.filter((entry) => entry.selected).map((entry) => entry.id));

    if (selectedIds.size === 0) {
      setError("Select at least one attendee to sync.");
      return;
    }

    if (!selectedTimetable?.classId || !selectedTimetable?.subjectId) {
      setError("Select a valid class before syncing attendance.");
      return;
    }

    const updated = { ...rows };
    students.forEach((student) => {
      if (selectedIds.has(student.id)) {
        updated[student.id] = {
          ...updated[student.id],
          status: STATUS.PRESENT,
          comment: "",
        };
      }
    });

    setRows(updated);
    setSaving(true);
    setError("");

    try {
      const payload = {
        facultyId: selectedTimetable.facultyId,
        classId: selectedTimetable.classId,
        subjectId: selectedTimetable.subjectId,
        date: selectedDate,
        records: students.map((student) => ({
          studentId: student.id,
          status: uiStatusToApi(updated[student.id]?.status || STATUS.ABSENT),
          remarks: updated[student.id]?.comment || "",
        })),
      };

      await saveAttendance(payload);

      const history = await fetchAttendance({ facultyId: selectedTimetable.facultyId });
      setAttendanceRecords(groupRecordsForUi(history.records || []));
      setIsSubmitted(true);
      setCurrentRecordId(`${selectedTimetable.classId}|${selectedTimetable.subjectId}|${selectedDate}`);
      setShowSyncModal(false);
      setMessage(`Synced ${selectedIds.size} meeting attendee${selectedIds.size === 1 ? "" : "s"} and saved attendance to MongoDB.`);
    } catch (syncError) {
      setError(syncError.message || "Could not save synced attendance.");
    } finally {
      setSaving(false);
    }
  };

  const applyMergedSections = (sections) => {
    setMergedSections(sections);
    setShowMergeModal(false);
    if (sections.length > 0) {
      setClassInfo((prev) => ({ ...prev, section: sections[0] }));
      setMessage(`Merged sections: ${sections.join(", ")}`);
    } else {
      setMessage("Course sections unmerged.");
    }
    setError("");
  };

  const markAll = (status) => {
    if (isEditLocked || !isClassSelected) return;
    const updated = {};
    students.forEach((student) => {
      updated[student.id] = {
        ...rows[student.id],
        status,
        comment: "",
      };
    });
    setRows(updated);
    setMarkAllStatus(status);
    setMessage(`All students marked as ${status}.`);
    setError("");
  };

  const flipMarkAll = () => {
    markAll(markAllStatus === STATUS.PRESENT ? STATUS.ABSENT : STATUS.PRESENT);
  };

  const downloadTemplate = () => {
    if (!isClassSelected) {
      setError("Select a timetable class first to download template.");
      return;
    }

    const classLabel = [
      selectedTimetable.department,
      selectedTimetable.semester,
      selectedTimetable.academicYear,
      selectedTimetable.subject,
      classInfo.section,
    ].filter(Boolean).join(" - ");
    const courseCode =
      selectedTimetable.courseCode ||
      selectedTimetable.subjectCode ||
      selectedTimetable.subject ||
      "";
    const dates = getUnique(attendanceRecords.map((record) => record.context?.date).filter(Boolean).concat(selectedDate));
    const headerRow = ["", "", "", "", "", ...dates];
    const labelRow = ["Sl. No", "Class Name", "Register No.", "Student Name", "Course Code", ...dates.map(() => STATUS.PRESENT)];
    const worksheetData = [headerRow, labelRow, ...buildWorkbookTemplateRows(classLabel, courseCode, students, dates)];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, "attendance_template.xlsx");
    setMessage("Template downloaded in Excel format.");
    setError("");
  };

  const parseExcelDateToIso = (value) => {
    const text = String(value || "").trim();
    if (!text) return null;

    const numeric = Number(text);
    if (Number.isFinite(numeric) && numeric > 20000 && numeric < 80000) {
      const parsed = XLSX.SSF.parse_date_code(numeric);
      if (parsed?.y && parsed?.m && parsed?.d) {
        return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
      }
    }

    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  };

  const normalizeStudentName = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\\s+/g, " ");

  const processUploadFile = async (file) => {
    if (isEditLocked || !isClassSelected) return false;
    if (!file) return false;

    try {
      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        setError("Please upload an Excel .xlsx file.");
        return false;
      }

      const matrix = await parseExcelFile(file);
      const layout = getWorkbookLayout(matrix);
      const headers = layout.labelRow;
      const dateHeaders = layout.headerRow;
      const registerIndex = findHeaderIndex(headers, ["registerno", "usn", "rollno", "studentid"]);
      const nameIndex = findHeaderIndex(headers, ["studentname", "name"]);

      if (registerIndex === -1 || nameIndex === -1) {
        setError("The Excel sheet must include Register No. and Student Name columns.");
        return false;
      }

      const dateColumns = dateHeaders
        .map((header, index) => ({ header, index }))
        .filter(({ header, index }) => index >= 5 && isDateHeader(header));

      if (dateColumns.length === 0) {
        setError("No date columns found in the Excel sheet.");
        return false;
      }

      const dataRows = matrix
        .slice(layout.dataStartRow)
        .filter((row) => row.some((cell) => String(cell || "").trim() !== ""));

      const rosterByUsn = new Map(
        students.map((student) => [String(student.usn || "").trim().toLowerCase(), student])
      );
      const rosterByName = new Map(
        students.map((student) => [normalizeStudentName(student.name), student])
      );

      const matchedRows = [];
      for (let rowOffset = 0; rowOffset < dataRows.length; rowOffset += 1) {
        const row = dataRows[rowOffset];
        const usn = String(row[registerIndex] || "").trim();
        const name = String(row[nameIndex] || "").trim();

        const student =
          rosterByUsn.get(usn.toLowerCase()) ||
          rosterByName.get(normalizeStudentName(name));

        if (!student) {
          setError(
            `Student "${name || usn || `row ${rowOffset + 1}`}" does not exist in the selected DB roster.`
          );
          return false;
        }

        for (const { header, index } of dateColumns) {
          const rawValue = String(row[index] || "").trim();
          if (!rawValue) continue;

          if (!normalizeStatus(rawValue)) {
            setError(
              `Invalid status "${rawValue}" at Excel row ${layout.dataStartRow + rowOffset + 1} (${formatDateHeader(header)}). Use only P (Present) or A (Absent).`
            );
            return false;
          }
        }

        matchedRows.push({ row, student });
      }

      setSaving(true);
      setError("");

      const savedDates = [];

      for (const { header, index } of dateColumns) {
        const date = parseExcelDateToIso(header);
        if (!date) {
          setError(`Could not convert Excel date "${formatDateHeader(header)}" to a valid date.`);
          return false;
        }

        const records = students.map((student) => {
          const imported = matchedRows.find((entry) => entry.student.id === student.id);
          const rawStatus = imported ? String(imported.row[index] || "").trim() : "";
          return {
            studentId: student.id,
            status: uiStatusToApi(normalizeStatus(rawStatus) || STATUS.ABSENT),
            remarks: "",
          };
        });

        await saveAttendance({
          facultyId: selectedTimetable.facultyId,
          classId: selectedTimetable.classId,
          subjectId: selectedTimetable.subjectId,
          date,
          records,
        });

        savedDates.push(date);

        if (date === selectedDate) {
          const nextRows = {};
          students.forEach((student) => {
            const imported = matchedRows.find((entry) => entry.student.id === student.id);
            const rawStatus = imported ? String(imported.row[index] || "").trim() : "";
            nextRows[student.id] = {
              status: normalizeStatus(rawStatus) || STATUS.ABSENT,
              comment: "",
            };
          });
          setRows(nextRows);
          setCurrentRecordId(`${selectedTimetable.classId}|${selectedTimetable.subjectId}|${date}`);
          setIsSubmitted(true);
        }
      }

      const history = await fetchAttendance({ facultyId: selectedTimetable.facultyId });
      setAttendanceRecords(groupRecordsForUi(history.records || []));

      setMessage(
        `Imported and saved ${savedDates.length} attendance date${savedDates.length === 1 ? "" : "s"} to MongoDB.`
      );
      return true;
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : "Could not import and save the Excel attendance.");
      setMessage("");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const uploadSelectedTemplate = async () => {
    const chosenFile = selectedUploadFile || uploadInputRef.current?.files?.[0] || null;

    if (!chosenFile) {
      setError("Select a file before clicking upload.");
      setMessage("");
      return;
    }

    const success = await processUploadFile(chosenFile);
    if (success) {
      setSelectedUploadFile(null);
      setShowUploadPopup(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
    }
  };

  const handleUploadFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedUploadFile(file);
    if (file) {
      setError("");
    }
  };

  const openUploadPopup = () => {
    setShowUploadPopup(true);
    setError("");
  };

  const closeUploadPopup = () => {
    setShowUploadPopup(false);
    setSelectedUploadFile(null);
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
  };

  const validateBeforeSubmit = () => {
    if (!isClassSelected) {
      return "Choose a timetable class before submitting attendance.";
    }

    if (students.length === 0) {
      return "No students are available for this class.";
    }

    return "";
  };

  const handleSubmit = async () => {
    const validationError = validateBeforeSubmit();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        facultyId: selectedTimetable.facultyId,
        classId: selectedTimetable.classId,
        subjectId: selectedTimetable.subjectId,
        date: selectedDate,
        records: students.map((student) => ({
          studentId: student.id,
          status: uiStatusToApi(rows[student.id]?.status || STATUS.PRESENT),
          remarks: rows[student.id]?.comment || "",
        })),
      };

      const saved = await saveAttendance(payload);
      const history = await fetchAttendance({ facultyId: selectedTimetable.facultyId });
      setAttendanceRecords(groupRecordsForUi(history.records || []));
      setIsSubmitted(true);
      setCurrentRecordId(`${selectedTimetable.classId}|${selectedTimetable.subjectId}|${selectedDate}`);
      setMessage(saved.message || "Attendance submitted.");
    } catch (saveError) {
      setError(saveError.message || "Could not save attendance.");
    } finally {
      setSaving(false);
    }
  };

  const openRecordInMarkingPage = (record) => {
    if (!record) return;

    const restoredRows = students.reduce((acc, student) => {
      const fromRecord = record.attendance.find((row) => row.id === student.id);
      acc[student.id] = {
        status: fromRecord?.status || STATUS.PRESENT,
        comment: fromRecord?.comment || "",
      };
      return acc;
    }, {});

    setRows(restoredRows);
    setClassInfo((prev) => ({
      ...prev,
      department: record.context?.department || prev.department,
      semester: record.context?.semester || prev.semester,
      academicYear: record.context?.academicYear || prev.academicYear,
      subject: record.context?.subject || prev.subject,
      section: record.context?.section || prev.section,
    }));

    if (record.context?.date) {
      const parsed = new Date(record.context.date);
      if (!Number.isNaN(parsed.getTime())) {
        setSelectedDate(parsed.toISOString().slice(0, 10));
      }
    }

    setSelectedFaculty(record.context?.faculty || selectedFaculty);
    setCurrentRecordId(record.recordId || null);
    setIsSubmitted(true);
    goToMark();
    setMessage("Record opened in marking page.");
    setError("");
  };

  const refreshAttendanceHistory = async () => {
    if (!sessionUser?.userId) return;

    try {
      const history = await fetchAttendance({ facultyId: sessionUser.userId });
      setAttendanceRecords(groupRecordsForUi(history.records || []));
      setMessage("Attendance history refreshed from MongoDB.");
      setError("");
    } catch (refreshError) {
      setError(refreshError.message || "Could not refresh attendance history.");
    }
  };

  const deleteRecord = () => {
    setMessage("Attendance history is stored in MongoDB and cannot be removed from this view without a server delete endpoint.");
    setError("");
  };

  const clearAllRecords = () => {
    refreshAttendanceHistory();
  };


  const statusPillClass = (status) => {
    return status === STATUS.PRESENT ? "bg-green-500 text-white" : "bg-red-500 text-white";
  };


  return (
    <main
      className="flex-1 overflow-y-auto p-6 pb-12"
      style={{ scrollbarWidth: "thin", scrollbarColor: "#D1D5DB transparent" }}
    >
      {activeModule === "view" ? (
        <div style={{ maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[12px] text-text2">Student Attendance / View Attendance</p>
              <h1 className="text-[18px] font-bold text-text">Attendance View</h1>
            </div>
            <button
              onClick={goToMark}
              className="rounded-lg border border-border px-4 py-2 text-[13px] font-semibold text-text hover:bg-page-bg"
            >
              ← Back to Mark Attendance
            </button>
          </div>
          <AttendanceView
            records={attendanceRecords}
            students={students}
            selectedClass={classInfo}
            onOpenRecord={openRecordInMarkingPage}
            onDeleteRecord={deleteRecord}
            onClearAll={clearAllRecords}
          />
        </div>
      ) : activeModule === "report" ? (
        <div style={{ maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[12px] text-text2">Student Attendance / View Report</p>
              <h1 className="text-[18px] font-bold text-text">Attendance Report</h1>
            </div>
            <button
              onClick={goToMark}
              className="rounded-lg border border-border px-4 py-2 text-[13px] font-semibold text-text hover:bg-page-bg"
            >
              ← Back to Mark Attendance
            </button>
          </div>
          <ReportGenerationView
            records={attendanceRecords}
            students={students}
            currentClassInfo={classInfo}
            currentTimetable={selectedTimetable}
            onOpenRecord={openRecordInMarkingPage}
            onGoToMark={goToMark}
            onGoToView={goToView}
          />
        </div>
      ) : (
        <div style={{ maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
          {/* Page header */}
          <div className="mb-4">
            <p className="text-[12px] text-text2 mb-1">Student Attendance / Mark Attendance</p>
            <h1 className="text-[20px] font-bold text-text">Mark Attendance</h1>
          </div>

          {/* Filter dropdowns */}
          <section className="mb-4 rounded-xl border border-border bg-white p-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <select
                value={classInfo.department}
                className="rounded-lg border border-border bg-white px-3 py-2 text-[12.5px] text-text"
                disabled
              >
                <option value={classInfo.department}>
                  {classInfo.department || "Department"}
                </option>
              </select>

              <select
                value={classInfo.semester}
                onChange={(event) =>
                  setClassInfo((prev) => ({
                    ...prev,
                    semester: event.target.value,
                    academicYear: "",
                    subject: "",
                    section: "",
                  }))
                }
                className="rounded-lg border border-border bg-white px-3 py-2 text-[12.5px] text-text outline-none focus:ring-2 focus:ring-[rgba(155,35,53,0.2)]"
                disabled={isEditLocked}
              >
                <option value="">Semester</option>
                {semesterOptions.map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>

              <select
  value={classInfo.academicYear}
  onChange={(event) =>
    setClassInfo((prev) => ({
      ...prev,
      academicYear: event.target.value,
      subject: "",
      section: "",
    }))
  }
  className="rounded-lg border border-border bg-white px-3 py-2 text-[12.5px] text-text outline-none focus:ring-2 focus:ring-[rgba(155,35,53,0.2)]"
  disabled={!classInfo.semester || isEditLocked}
>
  <option value="">Academic Year</option>

  {academicYearOptions.map((year) => (
    <option key={year} value={year}>
      {year}
    </option>
  ))}
</select>

              <select
                value={classInfo.subject}
                onChange={(event) =>
                  setClassInfo((prev) => ({
                    ...prev,
                    subject: event.target.value,
                    section: "",
                  }))
                }
                className="rounded-lg border border-border bg-white px-3 py-2 text-[12.5px] text-text outline-none focus:ring-2 focus:ring-[rgba(155,35,53,0.2)]"
                disabled={!classInfo.semester || isEditLocked}
              >
                <option value="">Course</option>
                {subjectOptions.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject} ({subject.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)})
                  </option>
                ))}
              </select>

              <select
                value={classInfo.section}
                onChange={(event) => setClassInfo((prev) => ({ ...prev, section: event.target.value }))}
                className="rounded-lg border border-border bg-white px-3 py-2 text-[12.5px] text-text outline-none focus:ring-2 focus:ring-[rgba(155,35,53,0.2)]"
                disabled={!classInfo.subject || isEditLocked}
              >
                <option value="">Section</option>
                {sections.map((section) => (
                  <option key={section} value={section}>
                    {classInfo.department}-{section}
                  </option>
                ))}
              </select>

              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text2" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-[12.5px] text-text outline-none focus:ring-2 focus:ring-[rgba(155,35,53,0.2)]"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-50">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by Name or USN"
                  className="w-full rounded-lg border border-border bg-page-bg py-2 pl-9 pr-3 text-[12.5px] text-text outline-none focus:border-[#9B2335] focus:ring-1 focus:ring-[#9B2335]"
                />
              </div>
              <span className="text-[12px] font-semibold text-red-600">Freezing On : {freezingDate}</span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSyncModal(true)}
                  disabled={!isClassSelected}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw size={14} /> Sync meeting attendees
                </button>
                <button
                  type="button"
                  onClick={() => setShowMergeModal(true)}
                  disabled={!isClassSelected}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LayoutGrid size={14} /> Merge/Unmerge Courses
                </button>
                <button
                  type="button"
                  onClick={goToView}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#1d4ed8]"
                >
                  <Eye size={14} /> View Attendance
                </button>
                <button
                  type="button"
                  onClick={goToReport}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#1d4ed8]"
                >
                  <Eye size={14} /> View Report
                </button>
                <button
                  type="button"
                  onClick={openUploadPopup}
                  disabled={!isClassSelected}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Upload size={14} /> Upload
                </button>
              </div>
            </div>
          </section>

          {/* Context info & legend */}
          <section className="mb-4 rounded-xl border border-border bg-[#E8F4FD] p-4">
            <div className="mb-2 flex flex-wrap items-center gap-4 text-[11px]">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-pink-400" /> Extra Curricular Course
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-orange-400" /> Co Curricular Course
              </span>
              <button type="button" className="text-[#2563EB] underline hover:no-underline">
                View Attendance Configuration
              </button>
            </div>
            <p className="mb-3 text-[12px] text-text2">
              <span className="font-semibold text-text">Selected Dropdown:</span> {selectionSummary}
            </p>
            <div className="rounded-lg border border-border bg-white p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text2">Indicator</p>
              <div className="flex flex-wrap gap-3 text-[11px]">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-4 w-4 rounded bg-blue-500" /> Special Class
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-4 w-4 rounded bg-orange-400" /> Tutorial Class
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-4 w-4 rounded bg-pink-400" /> Online Class
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-green-600 text-[10px] text-white">✓</span> Present
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-red-600 text-[10px] text-white">✕</span> Absent
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-4 w-4 rounded bg-gray-800" /> Attendance Marked
                </span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-text2">
              <CalendarClock size={12} />
              <span>{contextLabel}</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
                Faculty: {selectedFaculty}
              </span>
            </div>
          </section>

            {error ? (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle size={16} /> {error}
              </div>
            ) : null}

            {message ? (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
                <FileCheck size={16} /> {message}
              </div>
            ) : null}

            {showUploadPopup ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6" onClick={closeUploadPopup}>
                <div
                  className="w-full max-w-4xl rounded-xl border border-gray-200 bg-white shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="border-b border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-ink">Upload Attendance</h3>
                      <button onClick={closeUploadPopup} className="text-xl leading-none text-gray-500 hover:text-gray-800">
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 px-4 py-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={uploadInputRef}
                        type="file"
                        accept=".xlsx"
                        className="min-w-62.5 flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded file:border-0 file:bg-[#7B1D2E] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:opacity-90"
                        onChange={handleUploadFileChange}
                        disabled={!isClassSelected || isEditLocked}
                      />
                      <input
                        type="text"
                        value={selectedUploadFile?.name || "No file selected"}
                        readOnly
                        className="w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600"
                      />
                    </div>

                    <p className="text-sm font-semibold text-gray-700">
                      NOTE: Template accepts only "P" (Present) or "A" (Absent) values.
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button
                        onClick={downloadTemplate}
                        className="inline-flex items-center gap-1 rounded px-3 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ background: BRAND_GRADIENT }}
                        disabled={!isClassSelected}
                      >
                        <Download size={16} /> Template
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={uploadSelectedTemplate}
                          className="inline-flex items-center gap-1 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!isClassSelected || isEditLocked}
                        >
                          <Upload size={16} /> Upload
                        </button>
                        <button
                          onClick={closeUploadPopup}
                          className="rounded bg-red-900 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {showSyncModal ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6" onClick={() => setShowSyncModal(false)}>
                <div
                  className="w-full max-w-lg rounded-xl border border-border bg-white shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="border-b border-border px-4 py-3">
                    <h3 className="text-base font-semibold text-text">Sync Meeting Attendees</h3>
                    <p className="mt-1 text-[12px] text-text2">
                      Online class participants detected from the latest meeting session.
                    </p>
                  </div>
                  <div className="max-h-72 overflow-y-auto px-4 py-3">
                    {syncSelections.map((entry) => (
                      <label
                        key={entry.id}
                        className="mb-2 flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 hover:bg-page-bg"
                      >
                        <input
                          type="checkbox"
                          checked={entry.selected}
                          onChange={(event) =>
                            setSyncSelections((prev) =>
                              prev.map((row) =>
                                row.id === entry.id ? { ...row, selected: event.target.checked } : row
                              )
                            )
                          }
                        />
                        <div>
                          <p className="text-[13px] font-semibold text-text">{entry.name}</p>
                          <p className="text-[11px] text-text2">{entry.usn}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setShowSyncModal(false)}
                      className="rounded-lg border border-border px-4 py-2 text-[13px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={applySyncMeetingAttendees}
                      className="rounded-lg bg-[#2563EB] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1d4ed8]"
                    >
                      Mark Selected as Present
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {showMergeModal ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6" onClick={() => setShowMergeModal(false)}>
                <div
                  className="w-full max-w-md rounded-xl border border-border bg-white shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="border-b border-border px-4 py-3">
                    <h3 className="text-base font-semibold text-text">Merge / Unmerge Course Sections</h3>
                    <p className="mt-1 text-[12px] text-text2">
                      Combine sections for joint attendance marking in this session.
                    </p>
                  </div>
                  <div className="space-y-2 px-4 py-4">
                    {sections.map((section) => {
                      const checked = mergedSections.includes(section);
                      return (
                        <label
                          key={section}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 hover:bg-page-bg"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              setMergedSections((prev) =>
                                event.target.checked
                                  ? [...prev, section]
                                  : prev.filter((item) => item !== section)
                              );
                            }}
                          />
                          <span className="text-[13px] font-medium text-text">
                            {classInfo.department}-{section} · {classInfo.subject || "Selected course"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setMergedSections([]);
                        applyMergedSections([]);
                      }}
                      className="rounded-lg border border-border px-4 py-2 text-[13px]"
                    >
                      Unmerge All
                    </button>
                    <button
                      type="button"
                      onClick={() => applyMergedSections(mergedSections)}
                      className="rounded-lg bg-[#2563EB] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1d4ed8]"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <section className="overflow-hidden rounded-xl border border-border bg-white">
              {loadingClasses || loadingStudents ? (
                <div className="px-4 py-8 text-center text-[13px] text-text2">Loading assigned class and student list…</div>
              ) : !isClassSelected ? (
                <div className="px-4 py-8 text-center text-[13px] text-text2">
                  No assigned class selected. Choose a semester, course, and section assigned to this faculty user.
                </div>
              ) : students.length === 0 ? (
                <div className="px-4 py-8 text-center text-[13px] text-text2">No students are enrolled in this class.</div>
              ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-[12.5px]">
                  <thead className="bg-[#FFF7ED]">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold text-text">Sl #</th>
                      <th className="px-3 py-3 text-left font-semibold text-text">USN / Candidate Id</th>
                      <th className="px-3 py-3 text-left font-semibold text-text">Student Name</th>
                      <th className="px-3 py-3 text-center font-semibold text-text">
                        Previous Class
                        <div className="text-[10px] font-normal text-text2">({previousClassDate})</div>
                      </th>
                      <th className="px-3 py-3 text-center font-semibold text-text">
                        <div className="flex items-center justify-center gap-2">
                          <span>
                            Period Number - 3
                            <div className="text-[10px] font-normal text-text2">
                              ({selectedTimetable?.slot || ""})
                            </div>
                          </span>
                          <button
                            onClick={flipMarkAll}
                            disabled={!isClassSelected || isEditLocked}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              markAllStatus === STATUS.PRESENT ? "bg-green-500 text-white" : "bg-red-500 text-white"
                            }`}
                          >
                            All {markAllStatus}
                          </button>
                        </div>
                        <div className="mt-1 text-[10px] font-normal text-text2">Mark Present / Absent</div>
                      </th>
                      <th className="px-3 py-3 text-left font-semibold text-text">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => {
                      const row = rows[student.id] || {};
                      const status = row.status || STATUS.PRESENT;
                      const stats = attendanceStatsMap.get(student.id) || { attended: 0, total: 0, percentage: 0 };
                      const isLowAttendance = stats.total > 0 && stats.percentage < 75;

                      return (
                        <tr
                          key={student.id}
                          className={`border-t border-border ${
                            isLowAttendance ? "bg-red-50" : "bg-white"
                          }`}
                        >
                          <td className="px-3 py-3 text-text2">{index + 1}</td>
                          <td className="px-3 py-3 font-medium text-text">{student.usn}</td>
                          <td className="px-3 py-3 text-text">{student.name}</td>

                          <td className="px-3 py-3 text-center align-top">
                            {stats.total > 0 ? (
                              <div className="text-[11px] text-text2">
                                <div># of Periods Marked: {stats.total}</div>
                                <div className={isLowAttendance ? "font-semibold text-red-600" : "text-green-700"}>
                                  {stats.attended}/{stats.total} ({stats.percentage}%)
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-text2">—</span>
                            )}
                          </td>

                          <td className="px-3 py-3 text-center align-top">
                            <div className="mx-auto inline-flex rounded-full border border-gray-300 p-1">
                              <button
                                onClick={() => updateRow(student.id, STATUS.PRESENT)}
                                disabled={!isClassSelected || !isStudentEditEnabled(student.id)}
                                className={`rounded-full px-4 py-1 text-xs font-bold transition ${
                                  status === STATUS.PRESENT ? "bg-green-500 text-white" : "text-gray-600"
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                              >
                                P
                              </button>
                              <button
                                onClick={() => updateRow(student.id, STATUS.ABSENT)}
                                disabled={!isClassSelected || !isStudentEditEnabled(student.id)}
                                className={`rounded-full px-4 py-1 text-xs font-bold transition ${
                                  status === STATUS.ABSENT ? "bg-red-500 text-white" : "text-gray-600"
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                              >
                                A
                              </button>
                            </div>

                            {stats.total > 0 ? (
                              <div className="mt-2 text-xs">
                                <div className={isLowAttendance ? "font-semibold text-red-700" : "text-gray-600"}>
                                  {stats.attended}/{stats.total} ({stats.percentage}%)
                                </div>
                                {isLowAttendance ? <div className="text-[11px] text-red-600">Below 75%</div> : null}
                              </div>
                            ) : null}
                          </td>

                          <td className="px-3 py-3 align-top">
                            <div className="flex min-w-65 flex-col items-start gap-2">
                              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusPillClass(status)}`}>
                                {status === STATUS.PRESENT ? "Present" : "Absent"}
                              </span>
                              <input
                                type="text"
                                value={row.comment || ""}
                                onChange={(event) =>
                                  setRows((prev) => ({
                                    ...prev,
                                    [student.id]: {
                                      ...prev[student.id],
                                      comment: event.target.value,
                                    },
                                  }))
                                }
                                placeholder="Add remarks"
                                className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                                disabled={!isStudentEditEnabled(student.id)}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              )}
            </section>

            <footer className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                onClick={handleSubmit}
                disabled={!isClassSelected || saving || loadingStudents}
                className="rounded-lg px-6 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: BRAND_GRADIENT }}
              >
                {saving ? "Saving…" : isSubmitted ? "Submitted" : "Submit Attendance"}
              </button>

              <button
                onClick={() => {
                  setRows(getInitialRows(students));
                  setMarkAllStatus(defaultMarkAllStatus);
                  setIsSubmitted(false);
                  setCurrentRecordId(null);
                  setSelectedUploadFile(null);
                  setError("");
                  setMessage("Form reset.");
                }}
                className="rounded-lg border border-gray-300 px-6 py-2 text-sm"
              >
                Back
              </button>
            </footer>

            {isSubmitted ? (
              <div className="mt-3 text-xs">
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-800">Attendance status: Submitted</div>
              </div>
            ) : null}
        </div>
      )}
    </main>
  );
}
