
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  apiFetch,
  fetchFacultyClasses,
  getSessionUser,
} from "../../lib/attendanceApi.js";

const CIA_FIELDS = ["cia1", "cia2", "cia3"];
const INTERNAL_FIELDS = ["internal1", "internal2"];
const FIELDS = [...CIA_FIELDS, ...INTERNAL_FIELDS];

const emptyMarks = () =>
  Object.fromEntries(FIELDS.map((field) => [field, ""]));

export default function MarksScoreTab() {
  const auth = getSessionUser();

  const [assignments, setAssignments] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const active = assignments.find(
    (item) => item.assignmentId === selectedId
  );

  useEffect(() => {
    let cancelled = false;

    async function loadAssignments() {
      if (
        !auth?.userId ||
        !["faculty", "admin"].includes(auth.role)
      ) {
        setError("Select a faculty identity first.");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const result = await fetchFacultyClasses(auth.userId);

        if (!cancelled) {
          setAssignments(result.classes || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load assignments.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [auth?.userId, auth?.role]);

  const loadMarks = useCallback(async (assignment) => {
    if (!assignment) {
      setStudents([]);
      setScores({});
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const result = await apiFetch(
        `/api/marks?classId=${encodeURIComponent(
          assignment.classId
        )}&subjectId=${encodeURIComponent(assignment.subjectId)}`
      );

      setStudents(result.students || []);

      const nextScores = {};

      for (const student of result.students || []) {
        const saved = student.marks || {};

        nextScores[student.id] = Object.fromEntries(
          FIELDS.map((field) => [
            field,
            saved[field] ?? "",
          ])
        );
      }

      setScores(nextScores);
    } catch (err) {
      setStudents([]);
      setScores({});
      setError(err.message || "Could not load marks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMarks(active);
  }, [active, loadMarks]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return students;

    return students.filter((student) =>
      `${student.name} ${student.usn} ${student.code}`
        .toLowerCase()
        .includes(query)
    );
  }, [students, search]);

  function updateScore(studentId, field, value) {
    if (
      value !== "" &&
      (!Number.isFinite(Number(value)) ||
        Number(value) < 0 ||
        Number(value) > 100)
    ) {
      return;
    }

    setScores((current) => ({
      ...current,
      [studentId]: {
        ...(current[studentId] || emptyMarks()),
        [field]: value,
      },
    }));
  }

  async function saveMarks() {
    if (!active || students.length === 0) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const result = await apiFetch("/api/marks", {
        method: "POST",
        body: JSON.stringify({
          classId: active.classId,
          subjectId: active.subjectId,
          records: students.map((student) => ({
            studentId: student.id,
            ...(scores[student.id] || emptyMarks()),
          })),
        }),
      });

      setNotice(result.message || "Marks saved.");

      // Reload the saved values from the backend.
      await loadMarks(active);
    } catch (err) {
      setError(err.message || "Could not save marks.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">
          CIA & Internal Marks
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter three CIA scores and two Internal scores. Separate averages are saved to MongoDB
          for the student portal to retrieve.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium">
          Assigned class and subject
          <select
            className="mt-2 w-full rounded-lg border p-3"
            value={selectedId}
            onChange={(event) =>
              setSelectedId(event.target.value)
            }
          >
            <option value="">Choose class / subject</option>

            {assignments.map((item) => (
              <option
                key={item.assignmentId}
                value={item.assignmentId}
              >
                {item.department} · Sem {item.semester} ·
                {" "}{item.section} · {item.subjectCode}
                {" — "}{item.subject}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          Search students
          <input
            className="mt-2 w-full rounded-lg border p-3"
            placeholder="Search name or USN"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">
          {error}
        </p>
      )}

      {notice && (
        <p role="status" className="rounded-lg bg-green-50 p-3 text-green-800">
          {notice}
        </p>
      )}

      {loading && <p>Loading...</p>}

      {active && !loading && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
            <div>
              <strong>{active.subject}</strong>
              <p className="text-sm text-gray-500">
                {active.subjectCode} · Semester {active.semester}
                {" · "}{active.section}
              </p>
            </div>

            <button
              type="button"
              onClick={saveMarks}
              disabled={saving || students.length === 0}
              className="rounded-lg bg-red-800 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save CIA & Internal marks"}
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-212.5 text-left text-sm">
              <thead className="bg-red-800 text-white">
                <tr>
                  <th className="p-3">USN</th>
                  <th className="p-3">Student</th>
                  {CIA_FIELDS.map((field, index) => <th className="p-3" key={field}>CIA {index + 1}</th>)}
                  <th className="p-3">CIA Average</th>
                  {INTERNAL_FIELDS.map((field, index) => <th className="p-3" key={field}>Internal {index + 1}</th>)}
                  <th className="p-3">Internal Average</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student) => {
                  const row =
                    scores[student.id] || emptyMarks();

                  const calculateAverage = (fields) => {
                    const entered = fields.map((field) => row[field]).filter((value) => value !== "" && value !== null && value !== undefined);
                    return entered.length ? (entered.reduce((sum, value) => sum + Number(value), 0) / entered.length).toFixed(2) : null;
                  };
                  const ciaAverage = calculateAverage(CIA_FIELDS);
                  const internalAverage = calculateAverage(INTERNAL_FIELDS);

                  return (
                    <tr
                      key={student.id}
                      className="border-t hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap p-3">
                        {student.usn || student.code}
                      </td>

                      <td className="p-3">{student.name}</td>

                      {CIA_FIELDS.map((field) => <td className="p-2" key={field}><input aria-label={`${student.name} ${field}`} type="number" min="0" max="100" step="0.5" className="w-20 rounded border p-2" value={row[field]} onChange={(event) => updateScore(student.id, field, event.target.value)} /></td>)}
                      <td className="p-3 font-semibold">{ciaAverage ?? "—"}</td>
                      {INTERNAL_FIELDS.map((field) => <td className="p-2" key={field}><input aria-label={`${student.name} ${field}`} type="number" min="0" max="100" step="0.5" className="w-20 rounded border p-2" value={row[field]} onChange={(event) => updateScore(student.id, field, event.target.value)} /></td>)}
                      <td className="p-3 font-semibold">{internalAverage ?? "—"}</td>
                    </tr>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-6 text-center text-gray-500"
                    >
                      No students found for this selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
