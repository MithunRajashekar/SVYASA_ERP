import { useMemo, useState } from "react";
import StudentCard from "./StudentCard.jsx";
import StudentProfileModal from "./StudentProfileModal.jsx";
import BotWidget from "./BotWidget.jsx";

// NOTE: All mock/static data has been removed
// - MOCK_MENTORS should be fetched from API: GET /api/faculty?role=mentor
// - MOCK_STUDENTS should be fetched from API: GET /api/students/mentoring

const MOCK_MENTORS = [];
const MOCK_STUDENTS = [];

function downloadTextFile(filename, content, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCsv(rows) {
  const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

export default function Mentoring() {
  const [students, setStudents] = useState(MOCK_STUDENTS);
  const [query, setQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileMode, setProfileMode] = useState("smr"); // "smr" | "assignTask" | "edit"
  const [profileReadOnly, setProfileReadOnly] = useState(false);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      return s.registerNo.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
    });
  }, [query, students]);

  function openStudent(studentId, mode, readOnly = false) {
    setSelectedStudentId(studentId);
    setProfileMode(mode);
    setProfileReadOnly(readOnly);
    setProfileOpen(true);
  }

  function updateStudent(studentId, updater) {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? (typeof updater === "function" ? updater(s) : updater) : s))
    );
  }

  function handleDownloadAttendanceCsv() {
    const rows = [
      ["Register No", "Name", "Degree", "Section", "Semester", "Attendance %", "Mentor"],
      ...students.map((s) => [
        s.registerNo,
        s.name,
        s.degree,
        s.section,
        s.semester,
        s.academics.attendancePct,
        s.mentor,
      ]),
    ];
    downloadTextFile("attendance-report.csv", toCsv(rows), "text/csv");
  }

  function handleDownloadCoCurricularMock() {
    const rows = [
      ["Register No", "Name", "Activities"],
      ...students.map((s) => [s.registerNo, s.name, (s.activities ?? []).join("; ")]),
    ];
    downloadTextFile("co-curricular-activities.csv", toCsv(rows), "text/csv");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[16px] font-bold text-text">Mentoring</div>
            <div className="text-[12px] text-text2">Search students, view SMR, assign tasks and generate hall ticket.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadAttendanceCsv}
              className="rounded-lg border border-border bg-white px-3 py-2 text-[12.5px] font-semibold text-text hover:bg-page-bg"
            >
              Download Attendance Report
            </button>
            <button
              type="button"
              onClick={handleDownloadCoCurricularMock}
              className="rounded-lg border border-border bg-white px-3 py-2 text-[12.5px] font-semibold text-text hover:bg-page-bg"
            >
              Download Co-curricular Report
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by Register Number or Name"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-[13px] text-text outline-none focus:border-[#D3A1A7]"
          />
          <div className="text-[12px] text-text2">Showing {filteredStudents.length} student(s)</div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filteredStudents.map((s) => (
          <StudentCard
            key={s.id}
            student={s}
            onViewSmr={() => openStudent(s.id, "smr", true)}
            onAssignTask={() => openStudent(s.id, "assignTask")}
          />
        ))}
      </div>

      {profileOpen && selectedStudent ? (
        <StudentProfileModal
          student={selectedStudent}
          mentors={MOCK_MENTORS}
          initialMode={profileMode}
          readOnly={profileReadOnly}
          onClose={() => setProfileOpen(false)}
          onUpdateStudent={(updater) => updateStudent(selectedStudent.id, updater)}
        />
      ) : null}

      <BotWidget students={students} onAssignTask={(studentId, task) => updateStudent(studentId, (s) => ({ ...s, tasks: [...(s.tasks ?? []), task] }))} />
    </div>
  );
}

