import { useMemo, useState } from "react";
import { mockInternalMarks, mockStudentsWithDetails } from "./mentoring/mentoringData.js";
import EditDetailsModal from "./mentoring/EditDetailsModal.jsx";
import StudentSmrModal from "./mentoring/StudentSmrModal.jsx";
import QuickUpdateModal from "./mentoring/QuickUpdateModal.jsx";
import MeetingModal from "./mentoring/MeetingModal.jsx";
import CertificateUploadModal from "./mentoring/CertificateUploadModal.jsx";

const DEPT_OPTIONS = ["All", "BCA", "BCM", "BBA", "BSC", "BTECH", "MCA", "MSC", "MBA"];
const SEM_OPTIONS = ["All", "1", "2", "3", "4", "5", "6", "7", "8"];
const SEC_OPTIONS = ["All", "A", "B", "C", "D"];

const TABLE_HEADINGS = [
  "SL", "USN", "Mentee Name", "Degree", "Dept", "Semester", "Section",
  "Balance (₹)", "Pending Approvals", "Meeting Time & Date", "Admission Status",
  "Registration Date", "View SMR", "Meeting Info", "Edit Details", "Quick Update",
  "Meeting History", "Download Progress Report", "Download Attendance Report",
  "View/Edit Offer Letter", "Upload Certificate",
];

function InternalMarksModal({ student, onClose }) {
  if (!student) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-80 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl rounded-xl border border-gray-100 bg-white overflow-hidden shadow-xl">
        <div className="bg-[#991b1b] text-white px-5 py-3 flex items-center justify-between">
          <div>
            <div className="font-semibold text-[14px]">{student.name} - Internal Marks</div>
            <div className="text-[11px] text-white/80">{student.usn}</div>
          </div>
          <button type="button" onClick={onClose} className="text-white/90 hover:text-white text-lg">×</button>
        </div>
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-[12px] min-w-190">
            <thead>
              <tr className="bg-gray-100 text-text">
                {["SL", "Code", "Subject", "Att %", "IA-1", "IA-2", "CIA", "Total"].map((h) => (
                  <th key={h} className={`px-3 py-2 font-semibold ${h === "Att %" || h.startsWith("IA") || h === "CIA" || h === "Total" ? "text-center" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockInternalMarks.map((row, index) => (
                <tr key={row.code} className="border-t border-gray-100">
                  <td className="px-3 py-2">{index + 1}</td>
                  <td className="px-3 py-2 text-text2">{row.code}</td>
                  <td className="px-3 py-2">{row.subject}</td>
                  <td className="px-3 py-2 text-center">{row.att}%</td>
                  <td className="px-3 py-2 text-center">{row.ia1}</td>
                  <td className="px-3 py-2 text-center">{row.ia2}</td>
                  <td className="px-3 py-2 text-center">{row.cia}</td>
                  <td className="px-3 py-2 text-center font-semibold">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ChatModal({ student, onClose }) {
  const [messages, setMessages] = useState([
    { id: 1, from: "student", text: "Sir, I need help in DBMS unit test." },
    { id: 2, from: "mentor", text: "Sure, we will review it in today's meeting." },
  ]);
  const [input, setInput] = useState("");

  if (!student) return null;

  const send = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { id: Date.now(), from: "mentor", text: input.trim() }]);
    setInput("");
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-80 flex items-center justify-center p-4">
      <div className="w-full max-w-md h-[70vh] rounded-xl border border-gray-100 bg-white flex flex-col overflow-hidden shadow-xl">
        <div className="bg-[#991b1b] text-white px-4 py-3 flex items-center justify-between">
          <div className="font-medium text-[13px]">{student.name} - Chat</div>
          <button type="button" onClick={onClose} className="text-white/90 hover:text-white">×</button>
        </div>
        <div className="flex-1 overflow-y-auto bg-page-bg p-3 space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[80%] rounded-xl px-3 py-2 text-[12px] ${
                msg.from === "mentor"
                  ? "ml-auto bg-[#991b1b] text-white rounded-br-sm"
                  : "bg-white border border-border text-text rounded-bl-sm"
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-border flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-border px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-red-400"
          />
          <button type="button" onClick={send} className="rounded-full bg-[#991b1b] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#7f1d1d]">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function pillBtn(active) {
  return active
    ? "border-[#991b1b] bg-[#991b1b] text-white"
    : "border-border bg-white text-text hover:bg-gray-50";
}

function actionBtn(variant = "default") {
  const styles = {
    default: "border-border bg-white text-text hover:border-text",
    blue: "border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100",
    emerald: "border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    purple: "border-purple-600 bg-purple-50 text-purple-700 hover:bg-purple-100",
  };
  return `rounded-full border px-3 py-1 text-[11px] font-medium whitespace-nowrap ${styles[variant]}`;
}

export default function MarksMentoringTab() {
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("All");
  const [sem, setSem] = useState("All");
  const [sec, setSec] = useState("All");
  const [remarks, setRemarks] = useState({});
  const [selectedUsn, setSelectedUsn] = useState(null);
  const [selectedSmr, setSelectedSmr] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedEditStudent, setSelectedEditStudent] = useState(null);
  const [selectedQuickUpdateStudent, setSelectedQuickUpdateStudent] = useState(null);
  const [selectedCertificateStudent, setSelectedCertificateStudent] = useState(null);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [viewMode, setViewMode] = useState("student");
  const [studentUpdates, setStudentUpdates] = useState({});
  const [uploadedCertificates, setUploadedCertificates] = useState({});

  const filtered = useMemo(
    () =>
      mockStudentsWithDetails.filter((student) => {
        const query = search.toLowerCase();
        const queryMatch =
          !query ||
          student.name.toLowerCase().includes(query) ||
          student.usn.toLowerCase().includes(query);
        return (
          queryMatch &&
          (dept === "All" || student.dept === dept) &&
          (sem === "All" || student.sem === sem) &&
          (sec === "All" || student.sec === sec)
        );
      }),
    [search, dept, sem, sec],
  );

  const selectedUsnStudent = mockStudentsWithDetails.find((s) => s.usn === selectedUsn) ?? null;
  const mergedSelectedUsnStudent = selectedUsnStudent
    ? { ...selectedUsnStudent, ...studentUpdates[selectedUsnStudent.usn] }
    : null;

  return (
    <>
      {mergedSelectedUsnStudent && (
        <InternalMarksModal student={mergedSelectedUsnStudent} onClose={() => setSelectedUsn(null)} />
      )}
      {selectedSmr && <StudentSmrModal student={selectedSmr} onClose={() => setSelectedSmr(null)} />}
      {selectedChat && <ChatModal student={selectedChat} onClose={() => setSelectedChat(null)} />}
      {showNewMeeting && (
        <MeetingModal onClose={() => setShowNewMeeting(false)} onSubmit={() => setShowNewMeeting(false)} />
      )}
      {selectedCertificateStudent && (
        <CertificateUploadModal
          student={selectedCertificateStudent}
          certificates={uploadedCertificates[selectedCertificateStudent.usn] || {}}
          onUpload={(certificate) => {
            setUploadedCertificates((prev) => ({
              ...prev,
              [selectedCertificateStudent.usn]: [...(prev[selectedCertificateStudent.usn] || []), certificate],
            }));
          }}
          onClose={() => setSelectedCertificateStudent(null)}
        />
      )}
      {selectedEditStudent && (
        <EditDetailsModal
          student={{ ...selectedEditStudent, ...studentUpdates[selectedEditStudent.usn] }}
          onClose={() => setSelectedEditStudent(null)}
          onSave={(payload) => {
            setStudentUpdates((prev) => ({
              ...prev,
              [selectedEditStudent.usn]: { ...prev[selectedEditStudent.usn], ...payload },
            }));
            setSelectedEditStudent(null);
          }}
        />
      )}
      {selectedQuickUpdateStudent && (
        <QuickUpdateModal
          student={{
            ...selectedQuickUpdateStudent,
            ...studentUpdates[selectedQuickUpdateStudent.usn],
            remark:
              remarks[selectedQuickUpdateStudent.usn] ??
              studentUpdates[selectedQuickUpdateStudent.usn]?.remark ??
              selectedQuickUpdateStudent.remark,
          }}
          onClose={() => setSelectedQuickUpdateStudent(null)}
          onSave={(payload) => {
            setStudentUpdates((prev) => ({
              ...prev,
              [selectedQuickUpdateStudent.usn]: { ...prev[selectedQuickUpdateStudent.usn], ...payload },
            }));
            setRemarks((prev) => ({ ...prev, [selectedQuickUpdateStudent.usn]: payload.remarks }));
            setSelectedQuickUpdateStudent(null);
          }}
        />
      )}

      <div className="mb-4 text-[13px]">
        <span className="text-[#991b1b] font-medium">Mentoring</span>
        <span className="text-gray-400 mx-1">/</span>
        <span className="text-text2">Mentee Management</span>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 mb-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setViewMode("student")} className={`rounded-full border px-4 py-2 text-[12px] font-medium transition ${pillBtn(viewMode === "student")}`}>
              Student View
            </button>
            <button type="button" onClick={() => setViewMode("meeting")} className={`rounded-full border px-4 py-2 text-[12px] font-medium transition ${pillBtn(viewMode === "meeting")}`}>
              Meeting View
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowNewMeeting(true)} className="rounded-xl bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-slate-800">
              Meet Me
            </button>
            <button type="button" className="rounded-xl border border-border bg-white px-4 py-2 text-[12px] font-semibold text-text hover:bg-gray-50">
              Download Attendance Report
            </button>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.8fr_1fr_1fr_1fr]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by USN or name"
            className="w-full rounded-full border border-border bg-white px-4 py-2.5 text-[12px] text-text outline-none focus:ring-2 focus:ring-red-400"
          />
          {[DEPT_OPTIONS, SEM_OPTIONS, SEC_OPTIONS].map((opts, idx) => {
            const val = [dept, sem, sec][idx];
            const set = [setDept, setSem, setSec][idx];
            const labels = ["All Depts", "All Sem", "All Sec"];
            return (
              <select
                key={idx}
                value={val}
                onChange={(e) => set(e.target.value)}
                className="rounded-full border border-border bg-white px-4 py-2.5 text-[12px] text-text outline-none"
              >
                {opts.map((option) => (
                  <option key={option} value={option}>
                    {option === "All" ? labels[idx] : idx === 1 ? `Sem ${option}` : option}
                  </option>
                ))}
              </select>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white overflow-x-auto shadow-sm">
        <table className="w-full text-[11px] min-w-300">
          <thead>
            <tr className="bg-[#991b1b] text-white">
              {TABLE_HEADINGS.map((heading) => (
                <th key={heading} className="px-2 py-3 text-left font-semibold whitespace-nowrap">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((student, index) => {
              const merged = { ...student, ...studentUpdates[student.usn] };
              return (
                <tr key={student.usn} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-2 py-2">{index + 1}</td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <button type="button" onClick={() => setSelectedUsn(student.usn)} className="font-medium text-blue-700 hover:underline">
                      {merged.usn}
                    </button>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <button type="button" onClick={() => setSelectedSmr(merged)} className="font-medium text-[#991b1b] hover:underline">
                      {merged.name}
                    </button>
                  </td>
                  <td className="px-2 py-2">{merged.degree || "MCA-DET-CC"}</td>
                  <td className="px-2 py-2">{merged.dept}</td>
                  <td className="px-2 py-2">{merged.sem}</td>
                  <td className="px-2 py-2">{merged.sec}</td>
                  <td className="px-2 py-2">{merged.balance ?? "0.0"}</td>
                  <td className="px-2 py-2">{merged.pending}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{merged.meetingTime || "-"}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{merged.admissionStatus || "Full payment"}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{merged.registrationDate || "-"}</td>
                  <td className="px-2 py-2"><button type="button" onClick={() => setSelectedSmr(merged)} className={actionBtn()}>View SMR</button></td>
                  <td className="px-2 py-2"><button type="button" onClick={() => setSelectedChat(merged)} className={actionBtn()}>Meeting Info</button></td>
                  <td className="px-2 py-2"><button type="button" onClick={() => setSelectedEditStudent(merged)} className={actionBtn("blue")}>Edit Details</button></td>
                  <td className="px-2 py-2"><button type="button" onClick={() => setSelectedQuickUpdateStudent(merged)} className={actionBtn("emerald")}>Quick Update</button></td>
                  <td className="px-2 py-2"><button type="button" className={actionBtn()}>Meeting History</button></td>
                  <td className="px-2 py-2"><button type="button" className={actionBtn()}>Download Progress</button></td>
                  <td className="px-2 py-2"><button type="button" className={actionBtn()}>Download Attendance</button></td>
                  <td className="px-2 py-2"><button type="button" className={actionBtn()}>Offer Letter</button></td>
                  <td className="px-2 py-2">
                    <button type="button" onClick={() => setSelectedCertificateStudent(merged)} className={`${actionBtn("purple")} flex items-center gap-1`}>
                      {uploadedCertificates[merged.usn]?.length > 0 ? `✓ ${uploadedCertificates[merged.usn].length}` : "Upload"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={TABLE_HEADINGS.length} className="px-3 py-8 text-center text-text2">No students found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
