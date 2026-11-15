  import { useEffect, useState } from "react";
  import jsPDF from "jspdf";
  import autoTable from "jspdf-autotable";

  export default function AttendancePage() {
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [month, setMonth] = useState("");
    const [courses, setCourses] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);

  const months = [...new Set(attendanceData.map((d) => d.month))];

  const days = Array.from({ length: 31 }, (_, i) => i + 1);


    const getStatus = (day) => {
    const record = attendanceData.find(
      (item) =>
        item.course === selectedCourse &&
        item.month === month &&
        Number(item.date) === Number(day)
    );

    return record ? record.status : "";
  };

    const getPercentage = (courseCode) => {
    const subject = courses.find(
      (item) => item.subject_code === courseCode
    );

    return subject ? subject.percentage : 0;
  };

    useEffect(() => {
    const fetchAttendance = async () => {
      const user = JSON.parse(localStorage.getItem("user"));

      if (!user) return;

      const response = await fetch(
        `/api/student/attendance/${encodeURIComponent(user.student_id)}`,
        { credentials: "include" }
      );

      const data = await response.json();


      if (data.success) {
        setCourses(data.attendance);

        const history = [];

        data.attendance.forEach((subject) => {
          subject.history.forEach((record) => {
            history.push({
              course: subject.subject_code,
              date: new Date(record.date).getDate(),
              month: new Date(record.date).toLocaleString("default", {
                month: "long",
              }),
              status: record.status,
            });
          });
        });

        setAttendanceData(history);
        if (history.length > 0) {
    setMonth(history[0].month);
  }
      }
    };

    fetchAttendance();
  }, []);

    // ✅ UPDATED PDF FUNCTION (NO NAME / USN)
    const downloadPDF = () => {
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text("Overall Attendance Report", 14, 20);

    const tableData = courses.map((course) => [
    course.subject_code,
    course.subject_name,
    `${course.percentage}%`,
  ]);

      autoTable(doc, {
        startY: 30,
        head: [["Course ID", "Course Name", "Attendance %"]],
        body: tableData,
      });

      doc.save("attendance_report.pdf");
    };

    return (
      <div className="min-h-screen bg-[#f4efe9] p-6 flex flex-col justify-between">

    
        <div className="bg-[var(--color-maroon-dark)] text-white p-5 rounded-xl mb-6 flex justify-between">
          <h1 className="text-xl font-bold">Attendance</h1>
          <div className="flex justify-between items-center">

            {/* ✅ DOWNLOAD BUTTON */}
            <button
              onClick={downloadPDF}
              className="bg-white text-[#8b1e14] px-4 py-2 rounded-lg text-sm font-semibold shadow"
            >
              Download PDF
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-[#efe7df] rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#e4dbd2]">
              <tr>
                <th className="p-3 text-left">Course ID</th>
                <th className="p-3 text-left">Course Name</th>
                <th className="p-3 text-left">Attendance %</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {courses.map(course => {
                const percent = course.percentage;

                return (
                  <tr key={course.subject_code} className="border-b hover:bg-white/40">
                    <td className="p-3">{course.subject_code}</td>
                    <td className="p-3 font-medium">{course.subject_name}</td>

                    <td className="p-3">
                      <div className="w-full bg-gray-300 h-3 rounded-full overflow-hidden">
                        <div
                          className="bg-[#8b1e14] h-3 flex items-center justify-center text-white text-xs font-semibold"
                          style={{ width: `${percent}%` }}
                        >
                          {percent > 15 ? `${percent}%` : ""}
                        </div>
                      </div>
                      {percent <= 15 && (
                        <span className="text-xs font-semibold">{percent}%</span>
                      )}
                    </td>

                    <td className="p-3">
                      <button
                        onClick={() => {
  setSelectedCourse(course.subject_code);

  const subjectHistory = attendanceData.filter(
    (item) => item.course === course.subject_code
  );

  if (subjectHistory.length > 0) {
    setMonth(subjectHistory[0].month);
  } else {
    setMonth("");
  }
}}
                        className="bg-[#8b1e14] text-white px-3 py-1 rounded-lg text-xs"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* GRAPH */}
        <div className="mt-8 bg-[#efe7df] rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-[#3a2f2f]">
            Overall Attendance Comparison
          </h3>

          <div className="flex items-end justify-around h-64 border-l border-b pl-4 pb-4">
            {courses.map((course) => {
              const percent = course.percentage;

              return (
                <div key={course.subject_code} className="flex flex-col items-center gap-2">
                  <div className="h-52 w-14 bg-gray-200 rounded flex items-end">
                    <div
                      className="w-full bg-[#8b1e14] text-white text-xs text-center"
                      style={{ height: `${percent}%` }}
                    >
                      {percent > 15 ? `${percent}%` : ""}
                    </div>
                  </div>

                  {percent <= 15 && (
                    <span className="text-xs font-semibold">{percent}%</span>
                  )}

                  <span className="text-xs">{course.subject_code}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* MODAL */}
        {selectedCourse && (
          <div
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
            onClick={() => setSelectedCourse(null)}
          >
            <div
              className="bg-white rounded-2xl p-6 w-[600px] shadow-lg relative"
              onClick={(e) => e.stopPropagation()}
            >

              <button
                onClick={() => setSelectedCourse(null)}
                className="absolute top-2 right-2 text-gray-500 text-lg"
              >
                ✕
              </button>

              <div className="flex justify-between items-center mb-4 pr-8">
                <h3 className="font-semibold text-lg">
                  {
    courses.find(
      (c) => c.subject_code === selectedCourse
    )?.subject_name
  }
                </h3>

                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="px-3 py-1 border rounded-lg"
                >
                  {months.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-7 gap-3">
    {days.map((day) => {
      const status = getStatus(day);

      return (
        <div
          key={day}
          className={`h-20 rounded-lg border flex flex-col justify-center items-center transition
            ${
              status === "Present"
                ? "bg-green-500 text-white border-green-500"
                : status === "Absent"
                ? "bg-red-500 text-white border-red-500"
                : "bg-white border-gray-300"
            }`}
        >
          <p className="font-semibold">{day}</p>

          {status === "Present" && (
            <p className="text-xs font-bold">P</p>
          )}

          {status === "Absent" && (
            <p className="text-xs font-bold">A</p>
          )}
        </div>
      );
    })}
  </div>

            </div>
          </div>
        )}
      </div>
    );
  }