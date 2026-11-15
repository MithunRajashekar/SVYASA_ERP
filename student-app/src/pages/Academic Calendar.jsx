import React, { useState, useEffect } from "react";

export default function AcademicCalendar() {
  // eslint-disable-next-line no-unused-vars
  const today = new Date();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  const years = [2024, 2025, 2026, 2027];

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // ✅ NEW: Semester Mapping
  const semesters = {
    "Sem 1": [0, 1, 2, 3, 4, 5],   // Jan - Jun
    "Sem 2": [6, 7, 8, 9, 10, 11]  // Jul - Dec
  };

  const [selectedSemester, setSelectedSemester] = useState("Sem 1");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 🔥 FETCH FROM BACKEND
  useEffect(() => {
    fetch("/api/events", { credentials: "include" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Unable to load academic events.");
        return Array.isArray(data.events) ? data.events : [];
      })
      .then((data) => setEvents(data))
      .catch((err) => console.error("Academic calendar:", err));
  }, []);

  // ✅ FILTER EVENTS
  const currentMonthEvents = events.filter((event) => {
    const eventDate = new Date(event.startsAt);
    return !Number.isNaN(eventDate.getTime()) && eventDate.getMonth() === month && eventDate.getFullYear() === year;
  });

  // CALENDAR LOGIC
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const dates = [];
  for (let i = 0; i < firstDay; i++) dates.push(null);
  for (let d = 1; d <= totalDays; d++) dates.push(d);

  // NAVIGATION
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // ✅ NEW: Handle Semester Change
  const handleSemesterChange = (sem) => {
    setSelectedSemester(sem);
    const firstMonthOfSem = semesters[sem][0];
    setCurrentDate(new Date(year, firstMonthOfSem, 1));
  };

  return (
    <div className="min-h-screen bg-[#FFFDF7] p-6">

      {/* HEADER */}
         <div className="bg-[var(--color-maroon-dark)] text-white p-5 rounded-xl mb-6 flex justify-between">

        <h1 className="text-xl font-bold">Academic Calendar</h1>
      </div>

      {/* CONTROLS */}
      <div className="bg-[#FAF5EC] p-4 rounded-xl mb-6 flex gap-4 shadow">

        {/* ✅ NEW: Semester Dropdown */}
        <select
          value={selectedSemester}
          onChange={(e) => handleSemesterChange(e.target.value)}
          className="p-2 rounded-lg border"
        >
          {Object.keys(semesters).map((sem) => (
            <option key={sem}>{sem}</option>
          ))}
        </select>

        <select
          value={month}
          onChange={(e) =>
            setCurrentDate(new Date(year, Number(e.target.value), 1))
          }
          className="p-2 rounded-lg border"
        >
          {months.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>

        <select
          value={year}
          onChange={(e) =>
            setCurrentDate(new Date(Number(e.target.value), month, 1))
          }
          className="p-2 rounded-lg border"
        >
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="grid md:grid-cols-3 gap-6">

        {/* CALENDAR */}
        <div className="md:col-span-2 bg-white p-4 rounded-xl shadow">

          {/* NAV */}
          <div className="flex justify-between items-center mb-4">
            <button onClick={prevMonth} className="text-xl px-3">‹</button>

            <h2 className="text-lg font-semibold">
              {months[month]} {year}
            </h2>

            <button onClick={nextMonth} className="text-xl px-3">›</button>
          </div>

          {/* DAYS */}
          <div className="grid grid-cols-7 text-center text-sm font-semibold text-gray-700 mb-2">
            {days.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* GRID */}
          <div className="grid grid-cols-7 gap-2 text-center">
            {dates.map((day, i) => {
              const event = currentMonthEvents.find((item) => {
                const eventDate = new Date(item.startsAt);
                return day && !Number.isNaN(eventDate.getTime()) && eventDate.getDate() === day;
              });

              return (
                <div
                  key={i}
                  className={`h-16 flex items-center justify-center rounded-lg border text-sm transition
                  ${event ? "bg-[#8B2513] text-white font-semibold" : "bg-[#FAF5EC]"}
                  ${!day ? "bg-transparent border-none" : "hover:bg-[#e9dccb]"}
                  `}
                >
                  {day && (
                    <div>
                      <div>{day}</div>
                      <div className="text-[10px] truncate max-w-16">{event?.title || ""}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* EVENTS */}
        <div className="bg-white rounded-xl shadow">
          <div className="bg-[#8B2513] text-white p-3 rounded-t-xl">
            Upcoming Events
          </div>

          <div className="p-4 space-y-3 text-sm">
            {currentMonthEvents.length > 0 ? (
              currentMonthEvents.map((e, i) => (
                <div key={e._id || i} className="border-b pb-2 text-gray-700">
                  <div className="font-medium">{e.title}</div>
                  <div className="text-xs text-gray-500">{new Date(e.startsAt).toLocaleDateString()} {e.location ? `· ${e.location}` : ""}</div>
                </div>
              ))
            ) : (
              <div className="text-gray-400">No events this month</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}