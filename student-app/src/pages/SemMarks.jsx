import React, { useState } from "react";

export default function SemMarks() {
  const [semester, setSemester] = useState(1);
  const [search, setSearch] = useState("");

  const student = {
    name: "Arjun Kumar",
    regNo: "SVYASA2024MCA001",
    program: "MCA",
    year: "2025-2026",
    examType: "Regular Exam",
    programLevel: "PG",
  };

  const semData = {
    1: [
      {
        code: "MCA101",
        name: "Mathematics",
        max: 100,
        internal: 30,
        external: 50,
        total: 80,
        grade: "A",
        gp: 9,
      },
      {
        code: "MCA102",
        name: "Programming C",
        max: 100,
        internal: 28,
        external: 45,
        total: 73,
        grade: "A",
        gp: 8,
      },
      {
        code: "MCA103",
        name: "Digital Logic",
        max: 100,
        internal: 25,
        external: 40,
        total: 65,
        grade: "B+",
        gp: 7,
      },
    ],
    2: [
      {
        code: "MCA201",
        name: "OOP",
        max: 100,
        internal: 30,
        external: 48,
        total: 78,
        grade: "A",
        gp: 9,
      },
      {
        code: "MCA202",
        name: "DBMS",
        max: 100,
        internal: 27,
        external: 42,
        total: 69,
        grade: "B+",
        gp: 8,
      },
      {
        code: "MCA203",
        name: "OS",
        max: 100,
        internal: 26,
        external: 40,
        total: 66,
        grade: "B+",
        gp: 7,
      },
    ],
    3: [
      {
        code: "MCA301",
        name: "Data Structures",
        max: 100,
        internal: 30,
        external: 45,
        total: 75,
        grade: "A",
        gp: 9,
      },
      {
        code: "MCA302",
        name: "DBMS Advanced",
        max: 100,
        internal: 28,
        external: 40,
        total: 68,
        grade: "B+",
        gp: 8,
      },
      {
        code: "MCA303",
        name: "Operating Systems",
        max: 100,
        internal: 25,
        external: 35,
        total: 60,
        grade: "B",
        gp: 7,
      },
    ],
    4: [
      {
        code: "MCA401",
        name: "AI",
        max: 100,
        internal: 30,
        external: 48,
        total: 78,
        grade: "A",
        gp: 9,
      },
      {
        code: "MCA402",
        name: "Cloud Computing",
        max: 100,
        internal: 29,
        external: 44,
        total: 73,
        grade: "A",
        gp: 8,
      },
      {
        code: "MCA403",
        name: "Project",
        max: 100,
        internal: 35,
        external: 50,
        total: 85,
        grade: "A+",
        gp: 10,
      },
    ],
  };

  const subjects = semData[semester];

  const filtered = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  const totalMarks = filtered.reduce((sum, s) => sum + s.total, 0);
  const percentage = (totalMarks / (filtered.length * 100)) * 100;
  const sgpa = filtered.reduce((sum, s) => sum + s.gp, 0) / filtered.length;

  return (
    <div className="min-h-screen bg-[#f4efe9] p-6">
      {/* HEADER */}
            <div className="bg-[var(--color-maroon-dark)] text-white p-5 rounded-xl mb-6 flex justify-between">

        <h2 className="text-2xl font-semibold">Semester Exams</h2>
      </div>

      {/* INFO */}
      <div className="bg-[#FAF5EC] p-4 rounded-xl shadow mb-6 grid md:grid-cols-4 gap-4 text-sm">
        <div>
          <b>Name:</b> {student.name}
        </div>
        <div>
          <b>Reg No:</b> {student.regNo}
        </div>
        <div>
          <b>Program:</b> {student.program}
        </div>
        <div>
          <b>Exam:</b> {student.examType}
        </div>
        <div>
          <b>Level:</b> {student.programLevel}
        </div>
        <div>
          <b>Semester:</b> {semester}
        </div>
        <div>
          <b>Year:</b> {student.year}
        </div>
      </div>

      {/* CONTROLS */}
      <div className="bg-[#FAF5EC] p-4 rounded-xl mb-6 flex flex-wrap gap-4 shadow">
        <select
          value={semester}
          onChange={(e) => setSemester(Number(e.target.value))}
          className="p-2 rounded border"
        >
          <option value={1}>Semester 1</option>
          <option value={2}>Semester 2</option>
          <option value={3}>Semester 3</option>
          <option value={4}>Semester 4</option>
        </select>

        <input
          type="text"
          placeholder="Search subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-2 rounded border flex-1"
        />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-[#FAF5EC] text-[#1E3A2B]">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Subject</th>
              <th className="p-3">Max</th>
              <th className="p-3">Internal</th>
              <th className="p-3">External</th>
              <th className="p-3">Total</th>
              <th className="p-3">Grade</th>
              <th className="p-3">GP</th>
              <th className="p-3">Result</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((s, i) => (
              <tr key={i} className="border-t hover:bg-[#FAF5EC]">
                <td className="p-3">{s.code}</td>
                <td className="p-3">{s.name}</td>
                <td className="p-3">{s.max}</td>
                <td className="p-3">{s.internal}</td>
                <td className="p-3">{s.external}</td>
                <td className="p-3 font-semibold">{s.total}</td>
                <td className="p-3">{s.grade}</td>
                <td className="p-3">{s.gp}</td>
                <td className="p-3 text-green-600 font-semibold">Pass</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SUMMARY */}
      <div className="mt-6 bg-white p-4 rounded-xl shadow flex flex-wrap justify-between gap-4">
        <div>
          <b>Total:</b> {totalMarks}
        </div>
        <div>
          <b>Percentage:</b> {percentage.toFixed(2)}%
        </div>
        <div>
          <b>SGPA:</b> {sgpa.toFixed(2)}
        </div>
        <div>
          <b>Result:</b>{" "}
          <span className="text-green-600 font-semibold">PASS</span>
        </div>
      </div>

      {/* PRINT BUTTON */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-[#8B2513] text-white rounded hover:bg-red-900"
        >
          Print
        </button>
      </div>
    </div>
  );
}
