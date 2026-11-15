import { useState, useEffect } from "react";
import { Droplet, User, GraduationCap, Edit } from "lucide-react";

export default function ProfilePage() {

  const [student, setStudent] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [subjects, setSubjects] = useState([]);

useEffect(() => {
    const fetchProfile = async () => {
        const user = JSON.parse(localStorage.getItem("user"));


        if (!user) return;

        const response = await fetch(
            `/api/student/profile/${encodeURIComponent(user.student_id)}`,
            { credentials: "include" }
        );

        const data = await response.json();


        if (data.success) {
            setStudent(data.student);
        }

        const subjectResponse = await fetch(
  `/api/student/subjects/${encodeURIComponent(user.student_id)}`,
  { credentials: "include" }
);

const subjectData = await subjectResponse.json();

if (subjectData.success) {
  setSubjects(subjectData.subjects);
}
    };

    fetchProfile();
}, []);

  const handleRequest = () => {
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 2000); // auto close
  };

  return (
    <div className="min-h-screen bg-[#f4efe9] p-6">

    {/* HEADER CARD */}
<div
  className="bg-[var(--color-maroon-dark)] text-white rounded-3xl shadow-xl
  p-6 flex flex-col md:flex-row md:items-center md:justify-between
  gap-6 hover:shadow-2xl transition-all duration-300"
>
  {/* Left Section */}
  <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6 w-full">

    {/* Profile Image */}
    <div className="relative group">
      <img
        src="/student-avatar.svg"
        alt="profile"
        className="w-32 h-32 rounded-2xl object-cover border-4 border-[#d4a64a]
        group-hover:scale-105 transition duration-300"
      />

      <button
        className="absolute bottom-2 right-2 bg-white text-[#8b1e14]
        p-2 rounded-full shadow-lg hover:bg-[#d4a64a] hover:text-white transition"
      >
        <Edit size={16} />
      </button>
    </div>

    {/* Student Details */}
    <div className="flex-1 text-center sm:text-left">

      <h2 className="text-3xl font-bold tracking-wide">
        {student?.name || "Loading..."}
      </h2>

      <div className="mt-3 space-y-2 text-base">

        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <span className="font-semibold text-gray-200">Student ID:</span>
          <span className="text-white">{student?.student_id}</span>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <span className="font-semibold text-gray-200">Semester:</span>
          <span className=" text-gray-200 px-1 py-1 rounded-full text-sm font-bold">
            {student?.semester} sem
          </span>
        </div>

      </div>
    </div>
  </div>

  {/* Right Section */}
  <div className="flex justify-center md:justify-end">
    <button
      onClick={handleRequest}
      className="bg-white text-[#8b1e14]
      px-4 py-1 rounded-xl font-semibold shadow-lg
      hover:bg-[#d4a64a] hover:text-white
      hover:scale-105 transition-all duration-300"
    >
      Request Update
    </button>
  </div>
</div>

      {/* GRID */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">

        {/* PERSONAL INFO */}
        <div className="bg-[#efe7df] rounded-3xl p-5 shadow-sm hover:shadow-md transition">
          <h3 className="font-semibold text-[#3a2f2f] mb-4 flex items-center gap-2">
            <User size={18} /> Personal Information
          </h3>

          <div className="space-y-3 text-sm">
            <Info label="Date of Birth" value={student?.dateOfBirth || "Not provided"} />
            <Info
    label="Email"
    value={student?.email}
/>
            <Info
    label="Phone"
    value={student?.phone}
/>
            <Info label="Address" value={student?.address || "Not provided"} />
            <Info label="Emergency Contact" value={student?.emergencyContact || "Not provided"} />
          </div>
        </div>

        {/* ACADEMIC */}
        <div className="bg-[#efe7df] rounded-3xl p-5 shadow-sm hover:shadow-md transition">
          <h3 className="font-semibold text-[#3a2f2f] mb-4 flex items-center gap-2">
            <GraduationCap size={18} /> Academic Details
          </h3>

          <div className="space-y-3 text-sm">
            <Info label="Program" value={student?.program || "Not provided"} />
            <Info label="Roll Number" value={student?.student_id || "Not provided"} />
            <Info label="Admission Year" value={student?.admissionYear || "Not provided"} />
            <Info label="Semester" value={student?.semester ? `${student.semester}th Semester` : "Not provided"} />

            {/* CGPA */}
            <div className="mt-4">
              <p className="text-gray-600 mb-1">CGPA</p>
              <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                <div className="bg-[#c89b5e] h-3 rounded-full w-[70%] transition-all duration-700"></div>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span>{student?.cgpa ?? "Not provided"}</span>
                <span>10.0</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* TABLE */}
      <div className="bg-[#efe7df] rounded-3xl p-5 shadow-sm mt-6 hover:shadow-md transition">

        <h3 className="font-semibold mb-4 text-[#3a2f2f]">
          Academic Overview
        </h3>

        <table className="w-full text-sm">

          <thead className="bg-[#e4dbd2]">
            <tr>
              <th className="p-3 text-left">Subject Code</th>
              <th className="p-3 text-left">Subject Name</th>
              <th className="p-3 text-left">Attendance</th>
              <th className="p-3 text-left">Marks</th>
            </tr>
          </thead>

          <tbody>
  {subjects.length === 0 ? (
    <tr>
      <td colSpan="4" className="text-center p-4 text-gray-500">
        No subjects available for this semester.
      </td>
    </tr>
  ) : (
    subjects.map((subject) => (
      <TableRow
        key={subject.subject_code}
        code={subject.subject_code}
        name={subject.subject_name}
        attendance="Not Updated Yet"
        marks="Not Published Yet"
      />
    ))
  )}
</tbody>

        </table>
      </div>

      {/* POPUP */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-lg text-center animate-scale">

            <h3 className="text-lg font-semibold text-[#3a2f2f] mb-3">
              ✅ Request Sent Successfully
            </h3>

          </div>
        </div>
      )}

    </div>
  );
}

/* COMPONENTS */

function Info({ label, value, icon }) {
  return (
    <div className="flex justify-between hover:bg-white/40 p-2 rounded-lg transition">
      <span className="flex items-center gap-2 text-gray-600">
        {icon}
        {label}
      </span>
      <span className="font-medium text-[#3a2f2f]">{value}</span>
    </div>
  );
}

function TableRow({ code, name, attendance, marks }) {
  return (
    <tr className="border-b hover:bg-white/40 transition">
      <td className="p-3 font-medium">{code}</td>
      <td className="p-3">{name}</td>

      <td className="p-3">
        {attendance === "Not Updated Yet" ? (
          <span className="text-orange-600 font-medium">
            Not Updated Yet
          </span>
        ) : (
          attendance
        )}
      </td>

      <td className="p-3">
        {marks === "Not Published Yet" ? (
          <span className="text-blue-600 font-medium">
            Not Published Yet
          </span>
        ) : (
          marks
        )}
      </td>
    </tr>
  );
}