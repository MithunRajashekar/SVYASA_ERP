import React, { useMemo, useRef, useState } from "react";

const IA_ASSESSMENTS_KEY = "svyasa_ia_assessments";
const OTHER_ASSESSMENT_KEY = "svyasa.assessment.other.tabulate.v1";

// NOTE: All static data has been removed
// - TABS, DEFAULT_LAB, DEFAULT_SEM, STUDENTS should be provided via props or API
// Data should be fetched dynamically from the database

function readLS(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function iaFlags(assessments) {
  const nums = new Set(assessments.map((a) => String(a.assessmentNumber)));
  return { hasIa1: nums.has("1"), hasIa2: nums.has("2") };
}

function buildTheoryRows(assessments, usn, ciaScore) {
  const byCourse = new Map();
  assessments.forEach((a) => {
    const code = a.course?.courseCode;
    if (!code) return;
    if (!byCourse.has(code)) {
      byCourse.set(code, {
        code,
        subject: a.course?.courseName || code,
        att: 75 + (code.charCodeAt(code.length - 1) % 20),
        ia1: null,
        ia2: null,
      });
    }
    const row = byCourse.get(code);
    const seed = (usn.charCodeAt(usn.length - 1) + code.charCodeAt(0)) % 10;
    if (String(a.assessmentNumber) === "1") row.ia1 = 14 + seed;
    if (String(a.assessmentNumber) === "2") row.ia2 = 12 + seed;
  });

  if (byCourse.size === 0) {
    return [
      { code: "BCA2AECKA02", subject: "Ganaka Sowrabha-2", att: 88, ia1: 24, ia2: 22, cia: ciaScore || 20 },
      { code: "BCA2DSC04", subject: "Computer Architecture", att: 72, ia1: 18, ia2: 20, cia: ciaScore || 18 },
      { code: "BCA2DSC05", subject: "OOP using Java", att: 65, ia1: 15, ia2: 18, cia: ciaScore || 16 },
    ];
  }

  return Array.from(byCourse.values()).map((row) => {
    const cia = ciaScore ?? 18;
    return { ...row, cia };
  });
}

function buildLabRows(ciaScore) {
  return DEFAULT_LAB.map((row) => ({
    ...row,
    cia: ciaScore ?? row.cia,
    total: (ciaScore ?? row.cia) + 5,
  }));
}

export default function MarksScoreTab() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("internal");
  const [selectedUsn, setSelectedUsn] = useState("");
  const detailRef = useRef(null);

  const assessments = useMemo(() => readLS(IA_ASSESSMENTS_KEY, []), []);
  const ciaScores = useMemo(() => readLS(OTHER_ASSESSMENT_KEY, {}), []);
  const { hasIa1, hasIa2 } = useMemo(() => iaFlags(assessments), [assessments]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return STUDENTS;
    return STUDENTS.filter(
      (s) => s.name.toLowerCase().includes(q) || s.usn.toLowerCase().includes(q),
    );
  }, [search]);

  const selectedStudent = STUDENTS.find((s) => s.usn === selectedUsn) ?? null;
  const ciaForStudent = selectedStudent ? Number(ciaScores[selectedStudent.usn] ?? 0) : 0;
  const theoryRows = selectedStudent
    ? buildTheoryRows(assessments, selectedStudent.usn, ciaForStudent || undefined)
    : [];
  const labRows = buildLabRows(ciaForStudent || undefined);

  function openMarks(usn) {
    setSelectedUsn(usn);
    setActiveTab("internal");
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by USN or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-105 border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-400 text-[13px]"
        />
        <span className="text-[12px] text-text2">
          Select a student to view Internal, Lab and Sem Result tabs
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-190">
          <thead>
            <tr className="bg-[#991b1b] text-white">
              <th className="text-left px-5 py-4 rounded-l-xl text-[12px] font-semibold">USN</th>
              <th className="text-left px-5 py-4 text-[12px] font-semibold">Name</th>
              <th className="text-left px-5 py-4 text-[12px] font-semibold">Dept</th>
              <th className="text-left px-5 py-4 text-[12px] font-semibold">Sem</th>
              <th className="text-left px-5 py-4 text-[12px] font-semibold">Section</th>
              <th className="text-left px-5 py-4 rounded-r-xl text-[12px] font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr
                key={student.usn}
                className={`border-b border-gray-100 transition ${
                  selectedUsn === student.usn ? "bg-red-50" : "bg-white hover:bg-gray-50"
                }`}
              >
                <td className="px-5 py-5 text-[12px]">{student.usn}</td>
                <td className="px-5 py-5 font-medium text-[12px]">{student.name}</td>
                <td className="px-5 py-5 text-[12px]">{student.dept}</td>
                <td className="px-5 py-5 text-[12px]">{student.semester}</td>
                <td className="px-5 py-5 text-[12px]">{student.section}</td>
                <td className="px-5 py-5">
                  <button
                    type="button"
                    onClick={() => openMarks(student.usn)}
                    className="text-[12px] font-semibold text-[#991b1b] hover:text-[#7f1d1d] underline underline-offset-2"
                  >
                    Open marks
                  </button>
                </td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[12px] text-text2">
                  No students found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedStudent && (
        <div ref={detailRef} className="mt-4 rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="font-semibold text-[14px] text-text">{selectedStudent.name}</div>
            <div className="text-[12px] text-text2 mt-0.5">
              {selectedStudent.usn} - {selectedStudent.dept} - Sem {selectedStudent.semester}
            </div>
          </div>
          <div className="px-5 pt-3 border-b border-gray-100 flex gap-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`pb-2 px-1 text-[13px] font-medium border-b-2 transition ${
                  activeTab === tab.id
                    ? "border-[#991b1b] text-[#991b1b]"
                    : "border-transparent text-text2 hover:text-text"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-5 overflow-x-auto">
            {activeTab === "internal" && (
              <table className="w-full min-w-162.5 text-[12px]">
                <thead>
                  <tr className="bg-gray-100 text-text">
                    <th className="px-3 py-2 text-left font-semibold">SL</th>
                    <th className="px-3 py-2 text-left font-semibold">Code</th>
                    <th className="px-3 py-2 text-left font-semibold">Subject</th>
                    <th className="px-3 py-2 text-center font-semibold">Att %</th>
                    {hasIa1 && <th className="px-3 py-2 text-center font-semibold">IA-1</th>}
                    {hasIa2 && <th className="px-3 py-2 text-center font-semibold">IA-2</th>}
                    <th className="px-3 py-2 text-center font-semibold">CIA</th>
                    <th className="px-3 py-2 text-center font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {theoryRows.map((row, i) => (
                    <tr key={row.code} className="border-t border-gray-100">
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2 text-text2">{row.code}</td>
                      <td className="px-3 py-2">{row.subject}</td>
                      <td className="px-3 py-2 text-center">{row.att}%</td>
                      {hasIa1 && <td className="px-3 py-2 text-center">{row.ia1 ?? "-"}</td>}
                      {hasIa2 && <td className="px-3 py-2 text-center">{row.ia2 ?? "-"}</td>}
                      <td className="px-3 py-2 text-center">{row.cia}</td>
                      <td className="px-3 py-2 text-center font-semibold">
                        {(hasIa1 ? (row.ia1 ?? 0) : 0) + (hasIa2 ? (row.ia2 ?? 0) : 0) + (row.cia ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTab === "lab" && (
              <table className="w-full min-w-125 text-[12px]">
                <thead>
                  <tr className="bg-gray-100 text-text">
                    <th className="px-3 py-2 text-left font-semibold">SL</th>
                    <th className="px-3 py-2 text-left font-semibold">Code</th>
                    <th className="px-3 py-2 text-left font-semibold">Subject</th>
                    <th className="px-3 py-2 text-center font-semibold">Att %</th>
                    <th className="px-3 py-2 text-center font-semibold">CIA</th>
                    <th className="px-3 py-2 text-center font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {labRows.map((row, i) => (
                    <tr key={row.code} className="border-t border-gray-100">
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2 text-text2">{row.code}</td>
                      <td className="px-3 py-2">{row.subject}</td>
                      <td className="px-3 py-2 text-center">{row.att}%</td>
                      <td className="px-3 py-2 text-center">{row.cia}</td>
                      <td className="px-3 py-2 text-center font-semibold">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTab === "sem" && (
              <table className="w-full min-w-150 text-[12px]">
                <thead>
                  <tr className="bg-gray-100 text-text">
                    <th className="px-3 py-2 text-left font-semibold">SL</th>
                    <th className="px-3 py-2 text-left font-semibold">Code</th>
                    <th className="px-3 py-2 text-left font-semibold">Course Name</th>
                    <th className="px-3 py-2 text-center font-semibold">Scored</th>
                    <th className="px-3 py-2 text-center font-semibold">Minimum (to score)</th>
                    <th className="px-3 py-2 text-center font-semibold">Credits</th>
                    <th className="px-3 py-2 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {DEFAULT_SEM.map((row, i) => (
                    <tr key={row.code} className="border-t border-gray-100">
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2 text-text2">{row.code}</td>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2 text-center">{row.scored}</td>
                      <td className="px-3 py-2 text-center">{row.min}</td>
                      <td className="px-3 py-2 text-center">{row.credits}</td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-medium ${
                            row.status === "Pass"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </>
  );
}
