import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ClassTimetable() {

  const [selectedDay, setSelectedDay] = useState("Wednesday");
  const [view, setView] = useState("day");

  const timetable = {
    Monday: [
      { time: "09:00-09:50", course: "MCAP233", faculty: "Ms Srujana B" },
      { time: "09:50-10:40", course: "MCAP234", faculty: "Ms Pankaja Benkal" },
      { time: "10:50-11:40", course: "MCAP232", faculty: "Mr Dileep Raja P" },
      { time: "11:40-12:30", course: "MCAP231", faculty: "Dr Bharathi S" },
      { time: "12:30-01:20", course: "Mentoring", faculty: "Mr Dileep Raja P" },
      { time: "02:00-03:35", course: "MCAP236 LAB", faculty: "Multiple" },
    ],
    Tuesday: [
      { time: "09:00-09:50", course: "MCAP234", faculty: "Ms Pankaja Benkal" },
      { time: "09:50-10:40", course: "MCAP233", faculty: "Ms Srujana B" },
      { time: "10:50-11:40", course: "MCAP232", faculty: "Mr Dileep Raja P" },
      { time: "11:40-12:30", course: "MCAP252/253", faculty: "-" },
      { time: "12:30-01:20", course: "MCAP256/257", faculty: "-" },
      { time: "02:00-03:35", course: "MCAP235 LAB", faculty: "Multiple" },
    ],
    Wednesday: [
      { time: "09:00-09:50", course: "MCAP252/253", faculty: "-" },
      { time: "09:50-10:40", course: "MCAP231", faculty: "Dr Bharathi S" },
      { time: "10:50-11:40", course: "MCAP234", faculty: "Ms Pankaja Benkal" },
      { time: "11:40-12:30", course: "MCAP233", faculty: "Ms Srujana B" },
      { time: "12:30-01:20", course: "MCAP256/257", faculty: "-" },
      { time: "02:00-03:35", course: "Placement", faculty: "-" },
    ],
    Thursday: [
      { time: "09:00-09:50", course: "MCAP231", faculty: "Dr Bharathi S" },
      { time: "09:50-10:40", course: "MCAP252/253", faculty: "-" },
      { time: "10:50-11:40", course: "MCAP256/257", faculty: "-" },
      { time: "11:40-12:30", course: "MCAP233", faculty: "Ms Srujana B" },
      { time: "12:30-01:20", course: "MCAP232", faculty: "Mr Dileep Raja P" },
      { time: "02:00-03:35", course: "Placement", faculty: "-" },
    ],
    Friday: [
      { time: "09:00-09:50", course: "MCAP232", faculty: "Mr Dileep Raja P" },
      { time: "09:50-10:40", course: "MCAP231", faculty: "Dr Bharathi S" },
      { time: "10:50-11:40", course: "MCAP256/257", faculty: "-" },
      { time: "11:40-12:30", course: "MCAP252/253", faculty: "-" },
      { time: "12:30-01:20", course: "MCAP234", faculty: "Ms Pankaja Benkal" },
      { time: "02:00-03:35", course: "Yoga", faculty: "-" },
    ],
    Saturday: [
      { time: "09:00-10:40", course: "Club Activities", faculty: "-" },
      { time: "10:50-12:30", course: "Library", faculty: "-" },
      { time: "02:00-03:35", course: "Hackathon", faculty: "-" },
    ],
    Sunday: []
  };

  const days = Object.keys(timetable);

  const timeSlots = [
    "09:00-09:50",
    "09:50-10:40",
    "10:50-11:40",
    "11:40-12:30",
    "12:30-01:20",
    "02:00-03:35",
  ];

  // ✅ PDF FUNCTION
  const downloadWeeklyPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Weekly Timetable", 14, 15);

    const tableBody = timeSlots.map(time => {
      const row = [time];

      days.forEach(day => {
        const slot = timetable[day].find(t => t.time === time);
        row.push(slot ? `${slot.course}\n(${slot.faculty})` : "-");
      });

      return row;
    });

    autoTable(doc, {
      startY: 25,
      head: [["Time", ...days]],
      body: tableBody,
      styles: { fontSize: 7 }
    });

    doc.save("weekly_timetable.pdf");
  };

  return (
    <div className="min-h-screen bg-[#f4efe9] p-6">

      {/* HEADER */}
      <div className="bg-[var(--color-maroon-dark)] text-white p-5 rounded-xl mb-6 flex justify-between">
        <h1 className="text-xl font-bold">Class TimeTable</h1>
      </div>

      {/* TOGGLE */}
      <div className="flex justify-center gap-4 mb-6">
        <button onClick={() => setView("day")}
          className={view === "day"
            ? "bg-[#8b1e14] text-white px-4 py-2 rounded-xl"
            : "bg-[#e4dbd2] px-4 py-2 rounded-xl"}>
          Day View
        </button>

        <button onClick={() => setView("week")}
          className={view === "week"
            ? "bg-[#8b1e14] text-white px-4 py-2 rounded-xl"
            : "bg-[#e4dbd2] px-4 py-2 rounded-xl"}>
          Week View
        </button>
      </div>

      {/* DAY VIEW */}
      {view === "day" && (
        <>
          <div className="flex gap-3 mb-6 flex-wrap">
            {days.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2 border text-sm rounded-xl
                  ${selectedDay === day
                    ? "bg-[#efe7df] border-[#8b1e14]"
                    : "bg-[#8b1e14] text-white border-[#8b1e14]"
                  }`}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="bg-[#efe7df] p-4 rounded-2xl shadow-sm">
            <table className="w-full">
              <thead className="bg-[#e4dbd2]">
                <tr>
                  <th className="p-2">Time</th>
                  <th className="p-2">Course</th>
                  <th className="p-2">Faculty</th>
                </tr>
              </thead>
              <tbody>
                {timetable[selectedDay].map((item, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{item.time}</td>
                    <td className="p-2">{item.course}</td>
                    <td className="p-2">{item.faculty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* WEEK VIEW */}
      {view === "week" && (
        <>
          <div className="bg-[#efe7df] p-4 rounded-2xl shadow-sm overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#e4dbd2]">
                <tr>
                  <th className="p-2">Time</th>
                  {days.map(day => <th key={day}>{day}</th>)}
                </tr>
              </thead>

              <tbody>
                {timeSlots.map(time => (
                  <tr key={time} className="border-b text-center">
                    <td className="p-2 font-medium">{time}</td>

                    {days.map(day => {
                      const slot = timetable[day].find(t => t.time === time);
                      return (
                        <td key={day} className="p-2">
                          {slot ? (
                            <>
                              <div className="font-semibold">{slot.course}</div>
                              <div className="text-[10px] text-gray-500">
                                {slot.faculty}
                              </div>
                            </>
                          ) : "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* DOWNLOAD BUTTON */}
          <div className="flex justify-center mt-6">
            <button
              onClick={downloadWeeklyPDF}
              className="bg-[#8b1e14] text-white px-6 py-2 rounded-xl shadow"
            >
              Download Weekly Timetable
            </button>
          </div>
        </>
      )}

    </div>
  );
}