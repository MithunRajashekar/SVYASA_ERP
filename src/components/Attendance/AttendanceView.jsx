import { useState, useMemo } from "react";
import { Calendar, Search, X } from "lucide-react";
import { apiStatusToUi } from "../../lib/attendanceApi";

const STATUS = {
  PRESENT: "P",
  ABSENT: "A",
};

function calcStats(attendance, totalRecords) {
  const present = attendance.filter((a) => a.status === "P").length;
  const pct = totalRecords > 0 ? Math.round((present / totalRecords) * 100) : 0;
  return { present, pct, total: totalRecords };
}

function AttCell({ present, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 26,
        height: 26,
        borderRadius: 4,
        border: "1px solid transparent",
        background: present ? "#0f766e" : "#b91c1c",
        color: "#fff",
        fontSize: 11,
        fontWeight: 800,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto",
        transition: "all 0.1s",
        flexShrink: 0,
      }}
    >
      {present ? "✓" : "✕"}
    </button>
  );
}

function PctBadge({ pct }) {
  const [color, bg] = 
    pct >= 75 ? ["#065f46", "#ccfbf1"] : 
    pct >= 50 ? ["#7c2d12", "#ffedd5"] : 
    ["#991b1b", "#fee2e2"];
  return (
    <span
      style={{
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 6,
      }}
    >
      {pct}%
    </span>
  );
}

export default function AttendanceView({ 
  records = [], 
  students = [], 
  onOpenRecord, 
  onDeleteRecord, 
  onClearAll,
  selectedClass = {} 
}) {
  const [viewFilter, setViewFilter] = useState("monthly");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [showCalendar, setShowCalendar] = useState(false);

  // Extract unique dates from records
  const uniqueDates = useMemo(() => {
    const dates = new Set();
    records.forEach((record) => {
      if (record.attendance && Array.isArray(record.attendance)) {
        record.attendance.forEach((att) => {
          if (record.date) dates.add(record.date);
        });
      }
    });
    return Array.from(dates)
      .sort()
      .map((date) => ({
        id: date,
        label: new Date(date).toLocaleDateString("en-GB", { 
          day: "2-digit", 
          month: "short" 
        }),
        date,
      }));
  }, [records]);

  // Build student attendance history
  const studentAttendanceMap = useMemo(() => {
    const map = {};
    
    students.forEach((student) => {
      map[student.id] = [];
    });

    records.forEach((record) => {
      if (record.attendance && Array.isArray(record.attendance)) {
        record.attendance.forEach((att) => {
          const studentId = att.id;
          if (map[studentId]) {
            map[studentId].push({
              status: att.status || "P",
              date: record.date,
              remarks: att.comment || "",
            });
          }
        });
      }
    });

    return map;
  }, [records, students]);

  // Filter dates based on month
  const visibleDates = useMemo(() => {
    if (viewFilter !== "monthly") return uniqueDates;

    const [year, month] = selectedMonth.split("-");
    return uniqueDates.filter((d) => {
      const date = new Date(d.date);
      return (
        date.getFullYear() === parseInt(year) &&
        date.getMonth() === parseInt(month) - 1
      );
    });
  }, [uniqueDates, viewFilter, selectedMonth]);

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return students;
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.usn.toLowerCase().includes(query)
    );
  }, [searchQuery, students]);

  // Calculate statistics
  const studentStats = useMemo(() => {
    const stats = {};
    filteredStudents.forEach((student) => {
      const attendance = studentAttendanceMap[student.id] || [];
      stats[student.id] = calcStats(attendance, uniqueDates.length);
    });
    return stats;
  }, [filteredStudents, studentAttendanceMap, uniqueDates.length]);

  // Count students below 75%
  const below75 = filteredStudents.filter(
    (s) => studentStats[s.id]?.pct < 75
  ).length;
  const above75 = filteredStudents.length - below75;

  const getFilteredDatesDisplay = () => {
    const grouped = new Map();
    visibleDates.forEach((date) => {
      const month = new Date(date.date).toLocaleDateString("en-GB", {
        month: "long",
      });
      if (!grouped.has(month)) {
        grouped.set(month, []);
      }
      grouped.get(month).push(date);
    });
    return Array.from(grouped.entries()).map(([month, dates]) => ({
      label: month,
      dates,
    }));
  };

  const TH = {
    background: "#f3f4f6",
    fontWeight: 600,
    fontSize: 11,
    color: "#4b5563",
    padding: "5px 3px",
    textAlign: "center",
    borderRight: "1px solid #e5e7eb",
    borderBottom: "2px solid #d1d5db",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    zIndex: 2,
  };

  const TD = {
    padding: "6px 3px",
    textAlign: "center",
    borderRight: "1px solid #f3f4f6",
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "middle",
  };

  if (records.length === 0) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          color: "#6b7280",
          fontSize: 14,
        }}
      >
        <p>No attendance records found. Start marking attendance to view here.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: '"Manrope","Segoe UI",sans-serif',
        background: "#f8f4ee",
        minHeight: "100vh",
        padding: 16,
      }}
    >
      {/* Header Info */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>
            Selected Class:
          </span>
          <span style={{ fontSize: 12, color: "#0f766e", fontWeight: 600 }}>
            {selectedClass.semester ? `Semester ${selectedClass.semester}` : "Class"} -{" "}
            {selectedClass.subject || "Subject"} -{" "}
            {selectedClass.section ? `Section ${selectedClass.section}` : "Section"}
          </span>
        </div>

        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: 12,
            fontSize: 11,
            color: "#6b7280",
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 10,
          }}
        >
          <div style={{ position: "relative", minWidth: 220, flex: "1 1 220px" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9ca3af",
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by Name or USN"
              style={{
                width: "100%",
                padding: "8px 10px 8px 32px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 12,
                background: "#fff",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
              View:
            </label>
            <select
              value={viewFilter}
              onChange={(e) => setViewFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                fontSize: 12,
                fontWeight: 500,
                backgroundColor: "#fff",
                color: "#374151",
                cursor: "pointer",
              }}
            >
              <option value="monthly">Monthly</option>
              <option value="all">All Dates</option>
            </select>
          </div>

          {viewFilter === "monthly" && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                Month:
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  fontSize: 12,
                  backgroundColor: "#fff",
                }}
              />
            </div>
          )}

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              onClick={onClearAll}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                fontSize: 12,
                fontWeight: 600,
                backgroundColor: "#fff",
                color: "#374151",
                cursor: "pointer",
              }}
            >
              Clear View
            </button>
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 20,
            fontSize: 12,
            color: "#6b7280",
            marginTop: 12,
            flexWrap: "wrap",
          }}
        >
          <span>
            <strong style={{ color: "#1f2937" }}>Total Students:</strong> {filteredStudents.length}
          </span>
          <span>
            <strong style={{ color: "#059669" }}>≥75% Attendance:</strong>{" "}
            {above75}
          </span>
          <span>
            <strong style={{ color: "#dc2626" }}>{"<75%"} Attendance:</strong>{" "}
            {below75}
          </span>
          <span>
            <strong style={{ color: "#1f2937" }}>Total Dates:</strong>{" "}
            {uniqueDates.length}
          </span>
        </div>
      </div>

      {/* Date Grouping Display */}
      {visibleDates.length > 0 && (
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
            overflowX: "auto",
            marginBottom: 16,
            borderRadius: "8px 8px 0 0",
          }}
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11 }}>
            {getFilteredDatesDisplay().map((group, idx) => (
              <div
                key={idx}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <span style={{ fontWeight: 600, color: "#374151" }}>
                  {group.label}:
                </span>
                <span style={{ color: "#6b7280" }}>
                  {group.dates.map((d) => d.label).join(", ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div
        style={{
          overflowX: "auto",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
          background: "#fffdf8",
        }}
      >
        <table
          style={{
            borderCollapse: "collapse",
            background: "#fff",
            width: "100%",
            minWidth: 800,
          }}
        >
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ ...TH, textAlign: "left", paddingLeft: 10, width: 50 }}>
                Sl #
              </th>
              <th style={{ ...TH, textAlign: "left", width: 120 }}>
                USN
              </th>
              <th style={{ ...TH, textAlign: "left", width: 180 }}>
                Student Name
              </th>
              {visibleDates.map((date) => (
                <th key={date.id} style={{ ...TH, width: 38 }}>
                  {date.label}
                </th>
              ))}
              <th style={{ ...TH, width: 60 }}>Attended</th>
              <th style={{ ...TH, width: 60 }}>%</th>
              <th style={{ ...TH, width: 60 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, index) => {
              const stats = studentStats[student.id] || { present: 0, pct: 0 };
              const attendance = studentAttendanceMap[student.id] || [];
              const isLowAttendance = stats.pct < 75;

              return (
                <tr
                  key={student.id}
                  style={{
                    background: isLowAttendance ? "#fee2e2" : "#fff",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <td style={{ ...TD, textAlign: "center" }}>{index + 1}</td>
                  <td style={{ ...TD, textAlign: "left", paddingLeft: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>
                      {student.usn}
                    </span>
                  </td>
                  <td style={{ ...TD, textAlign: "left", paddingLeft: 10 }}>
                    <span style={{ fontSize: 12 }}>{student.name}</span>
                  </td>
                  {visibleDates.map((date) => {
                    const att = attendance.find((a) => a.date === date.date);
                    const isPresent = att?.status === "P";
                    return (
                      <td key={date.id} style={{ ...TD }}>
                        <AttCell present={isPresent} onClick={() => {}} />
                      </td>
                    );
                  })}
                  <td style={{ ...TD, fontSize: 12, fontWeight: 600 }}>
                    {stats.present}/{stats.total}
                  </td>
                  <td style={{ ...TD }}>
                    <PctBadge pct={stats.pct} />
                  </td>
                  <td style={{ ...TD }}>
                    <button
                      onClick={() => onOpenRecord && onOpenRecord({ attendance })}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        border: "1px solid #dbeafe",
                        background: "#eff6ff",
                        color: "#0369a1",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
