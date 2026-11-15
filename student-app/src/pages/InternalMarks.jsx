
import { useState, useEffect, useMemo } from "react";
import logo from "../assets/images/logo.png";


const Marksheet = ({
  subjects,
  showDetails,
  showHeader,
  student,
}) => {
  return (
    <div className="bg-[#efe7df] p-8 text-gray-800 font-sans">
      {showHeader && (
        <div className="text-center mb-6">
          <img
            src={logo}
            alt="S-VYASA Logo"
            className="mx-auto h-24 mb-2"
          />

          <h1 className="text-xl font-bold text-[#1E3A2B]">
            S-VYASA Deemed to be University
          </h1>

          <p className="text-sm">CIA and Internal Assessment Marks</p>

          <div className="grid grid-cols-2 gap-2 text-sm my-4 text-left">
            <p><strong>Name:</strong> {student?.name || "—"}</p>
            <p><strong>Student ID:</strong> {student?.student_id || "—"}</p>
            <p><strong>Department:</strong> {student?.department || "—"}</p>
            <p><strong>Semester:</strong> {student?.semester ?? "—"}</p>
          </div>

          <hr className="mt-3 border-gray-400" />
        </div>
      )}

      <table className="w-full text-sm border border-gray-300">
        <thead>
          <tr className="bg-[#e2ddd6] text-[#1E3A2B]">
            <th className="p-3 border">Code</th>
            <th className="p-3 border">Subject</th>
            <th className="p-3 border">Type</th>

            {showDetails &&
              ["CIA 1", "CIA 2", "CIA 3", "CIA Average", "Internal 1", "Internal 2", "Internal Average"].map(
                (label) => (
                  <th key={label} className="p-3 border text-center">
                    {label}
                  </th>
                )
              )}

          </tr>
        </thead>

        <tbody>
          {subjects.length === 0 ? (
            <tr>
              <td
                colSpan={showDetails ? 10 : 3}
                className="p-6 border text-center text-gray-500"
              >
                No marks available for your account.
              </td>
            </tr>
          ) : (
            subjects.map((subject) => (
              <tr key={subject.subject_code}>
                <td className="p-3 border font-semibold text-[#8B1E14]">
                  {subject.subject_code}
                </td>

                <td className="p-3 border">
                  {subject.subject_name}
                </td>

                <td className="p-3 border text-center">
                  {subject.type || "—"}
                </td>

                {showDetails &&
                  [
                    ["cia1", subject.cia1],
                    ["cia2", subject.cia2],
                    ["cia3", subject.cia3],
                    ["ciaAverage", subject.ciaAverage],
                    ["internal1", subject.internal1],
                    ["internal2", subject.internal2],
                    ["internalAverage", subject.internalAverage],
                  ].map(([field, value]) => (
                    <td key={field} className="p-3 border text-center">
                      {value ?? "—"}
                    </td>
                  ))}

              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default function InternalMarks() {
  const [search, setSearch] = useState("");
  const [marks, setMarks] = useState([]);
  const [student, setStudent] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchMarks() {
      setLoading(true);
      setError("");

      try {
        const storedUser = localStorage.getItem("user");

        if (!storedUser) {
          throw new Error("Please log in to view your internal marks.");
        }

        const user = JSON.parse(storedUser);

        if (!user.student_id) {
          throw new Error("Student ID is missing. Please log in again.");
        }

        setStudent({
          name: user.name,
          student_id: user.student_id,
          department: user.department,
          semester: user.semester,
          academic_year: user.academic_year || user.academicYear || "",
          discipline: user.discipline || user.combination || "",
        });

        const response = await fetch(
          `/api/student/marks/${encodeURIComponent(
            user.student_id
          )}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            credentials: "include",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Unable to retrieve marks (HTTP ${response.status}).`
          );
        }

        const data = await response.json();

        if (!data.success || !Array.isArray(data.marks)) {
          throw new Error(
            data.message || "The server returned an invalid marks response."
          );
        }

        setMarks(data.marks);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to load marks.");
          setMarks([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchMarks();

    return () => controller.abort();
  }, []);

  // Search only filters the data already fetched from the backend.
  const filteredMarks = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return marks;

    return marks.filter((subject) =>
      `${subject.subject_name || ""} ${subject.subject_code || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [marks, search]);

  const handleDownloadPDF = () => {
    const originalTitle = document.title;

    document.title = `${
      student?.name?.replace(/\s+/g, "_") || "Student"
    }_Internal_Marks`;

    window.print();

    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  return (
    <div className="bg-[#f3f0ea] min-h-screen p-6">
      <div className="bg-[var(--color-maroon-dark)] text-white p-5 rounded-xl mb-6">
        <h2 className="text-2xl font-semibold">CIA and Internal Marks</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-6 bg-[#efe7df] p-4 rounded-lg shadow">
        <p>
          <strong>Student Reg No:</strong>{" "}
          {student?.student_id || "—"}
        </p>

        <p>
          <strong>Student Name:</strong>{" "}
          {student?.name || "—"}
        </p>

        <p>
          <strong>Program Name:</strong>{" "}
          {student?.department || "—"}
        </p>

        <p>
          <strong>Discipline / Combination:</strong>{" "}
          {student?.discipline || "—"}
        </p>

        <p>
          <strong>Semester:</strong>{" "}
          {student?.semester ?? "—"}
        </p>

        <p>
          <strong>Academic Year:</strong>{" "}
          {student?.academic_year || "—"}
        </p>
      </div>

      <div className="flex gap-3 mb-4 no-print">
        <input
          type="text"
          placeholder="Search subject..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm"
        />
      </div>

      {loading && (
        <p className="p-4 text-center text-gray-600">
          Loading marks from the server...
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800"
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <Marksheet
            subjects={filteredMarks}
            showDetails={showDetails}
            showHeader={false}
            student={student}
          />

          <div id="print-area" className="hidden print:block">
            <Marksheet
              subjects={filteredMarks}
              showDetails={showDetails}
              showHeader={true}
              student={student}
            />
          </div>

          <div className="text-center mt-4 no-print">
            <button
              type="button"
              onClick={() => setShowDetails((value) => !value)}
              className="px-6 py-2 text-[#efe7df] rounded-md shadow-md bg-gradient-to-r from-[#7A1C12] to-[#8B1E14] hover:from-[#6A160E] hover:to-[#7A1C12]"
            >
              {showDetails
                ? "Hide Detailed Marks"
                : "View Detailed Marks"}
            </button>
          </div>

          <div className="flex justify-center gap-4 mt-4 no-print">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="px-6 py-2 text-[#efe7df] rounded-md shadow-md bg-gradient-to-r from-[#7A1C12] to-[#8B1E14] hover:from-[#6A160E] hover:to-[#7A1C12]"
            >
              Download
            </button>
          </div>
        </>
      )}

      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 no-print">
          <div className="bg-[#efe7df] w-[90%] max-w-4xl rounded-lg shadow-lg">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">PDF Preview</h3>

              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="text-red-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-auto max-h-[70vh]">
              <div className="min-w-[700px] max-w-full mx-auto shadow">
                <Marksheet
                  subjects={filteredMarks}
                  showDetails={showDetails}
                  showHeader={true}
                  student={student}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 p-4 border-t">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                className="px-4 py-2 text-white rounded-md bg-gradient-to-r from-[#7A1C12] to-[#8B1E14]"
              >
                Continue Download
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          body * {
            visibility: hidden;
          }

          #print-area,
          #print-area * {
            visibility: visible;
          }

          #print-area {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
