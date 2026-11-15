import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ExamTimetable() {

  const [type, setType] = useState("internal");

  const internalExams = [
    { date: "10 Apr 2026", subject: "Advanced Web Technologies", code: "MCAP231", time: "10:00 AM - 11:30 AM" },
    { date: "12 Apr 2026", subject: "Software Engineering", code: "MCAP232", time: "10:00 AM - 11:30 AM" },
    { date: "15 Apr 2026", subject: "Software Testing", code: "MCAP233", time: "10:00 AM - 11:30 AM" },
  ];

  const semesterExams = [
    { date: "05 Jul 2026", subject: "Advanced Web Technologies", code: "MCAP231", time: "09:30 AM - 12:30 PM" },
    { date: "08 Jul 2026", subject: "Software Engineering", code: "MCAP232", time: "09:30 AM - 12:30 PM" },
    { date: "11 Jul 2026", subject: "Software Testing", code: "MCAP233", time: "09:30 AM - 12:30 PM" },
    { date: "14 Jul 2026", subject: "Machine Learning", code: "MCAP234", time: "09:30 AM - 12:30 PM" },
  ];

  const data = type === "internal" ? internalExams : semesterExams;

  // ✅ DOWNLOAD FUNCTION
  const downloadPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(
      type === "internal"
        ? "Internal Exam Timetable"
        : "Semester Exam Timetable",
      14,
      15
    );

    const tableData = data.map(exam => [
      exam.date,
      exam.subject,
      exam.code,
      exam.time,
    ]);

    autoTable(doc, {
      startY: 25,
      head: [["Date", "Subject", "Code", "Time"]],
      body: tableData,
    });

    doc.save(
      type === "internal"
        ? "internal_exam_timetable.pdf"
        : "semester_exam_timetable.pdf"
    );
  };

  return (
    <div className="min-h-screen bg-[#f4efe9] p-6 flex flex-col">

      {/* HEADER */}
      <div className="bg-[var(--color-maroon-dark)] text-white p-5 rounded-xl mb-6 flex justify-between">
        <h1 className="text-xl font-bold">Exam TimeTable</h1>
         {/* <div className="flex justify-center mt-8"> */}
        <button
          onClick={downloadPDF}
          className="bg-white text-[#8b1e14]  px-4 py-2 rounded-xl shadow"
        >
          Download Exam Timetable
        </button>
      </div>

      {/* TOGGLE */}
      <div className="flex justify-center gap-4 mb-6">

        <button
          onClick={() => setType("internal")}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition
            ${type === "internal"
              ? "bg-[#8b1e14] text-white"
              : "bg-[#e4dbd2] text-[#3a2f2f]"
            }`}
        >
          Internal Exams
        </button>

        <button
          onClick={() => setType("semester")}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition
            ${type === "semester"
              ? "bg-[#8b1e14] text-white"
              : "bg-[#e4dbd2] text-[#3a2f2f]"
            }`}
        >
          Semester Exams
        </button>

      </div>

      {/* TABLE */}
      <div className="bg-[#efe7df] rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">

          <thead className="bg-[#e4dbd2]">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Subject</th>
              <th className="p-3 text-left">Code</th>
              <th className="p-3 text-left">Time</th>
            </tr>
          </thead>

          <tbody>
            {data.map((exam, index) => (
              <tr key={index} className="border-b hover:bg-white/40 transition">
                <td className="p-3">{exam.date}</td>
                <td className="p-3 font-medium">{exam.subject}</td>
                <td className="p-3">{exam.code}</td>
                <td className="p-3 font-semibold text-[#8b1e14]">
                  {exam.time}
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>

    </div>
  );
}