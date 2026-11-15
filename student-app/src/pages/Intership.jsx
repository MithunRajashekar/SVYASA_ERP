import React, { useMemo, useState } from "react";

export default function Internships() {
  const [search, setSearch] = useState("");
  const [durationFilter, setDurationFilter] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saved, setSaved] = useState([]);
  const [applied, setApplied] = useState([]);
  const [actionMessage, setActionMessage] = useState("");

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = [
    {
      id: 1,
      company: "Zoho",
      role: "Frontend Intern",
      duration: "6 Months",
      months: 6,
      stipend: "Rs 15,000",
      stipendValue: 15000,
      mode: "Onsite",
      skills: ["React", "JS"],
      openings: 12,
    },
    {
      id: 2,
      company: "Wipro",
      role: "Testing Intern",
      duration: "3 Months",
      months: 3,
      stipend: "Rs 10,000",
      stipendValue: 10000,
      mode: "Hybrid",
      skills: ["Testing", "QA"],
      openings: 20,
    },
    {
      id: 3,
      company: "Deloitte",
      role: "Data Analyst Intern",
      duration: "4 Months",
      months: 4,
      stipend: "Rs 18,000",
      stipendValue: 18000,
      mode: "Remote",
      skills: ["Excel", "SQL", "Power BI"],
      openings: 8,
    },
    {
      id: 4,
      company: "HCL",
      role: "Cloud Support Intern",
      duration: "6 Months",
      months: 6,
      stipend: "Rs 14,000",
      stipendValue: 14000,
      mode: "Onsite",
      skills: ["Linux", "Networking", "Cloud Basics"],
      openings: 10,
    },
  ];

  const filtered = data.filter((item) => {
    const query = search.toLowerCase();
    const matchesSearch =
      item.company.toLowerCase().includes(query) ||
      item.role.toLowerCase().includes(query) ||
      item.mode.toLowerCase().includes(query);
    const matchesDuration =
      durationFilter === "all" || String(item.months) === durationFilter;
    const matchesSaved = !showSavedOnly || saved.includes(item.id);
    return matchesSearch && matchesDuration && matchesSaved;
  });

  const displayed = [...filtered].sort((a, b) => {
    if (sortBy === "stipend-high") {
      return b.stipendValue - a.stipendValue;
    }
    if (sortBy === "stipend-low") {
      return a.stipendValue - b.stipendValue;
    }
    if (sortBy === "openings") {
      return b.openings - a.openings;
    }
    return 0;
  });

  const stats = useMemo(
    () => ({
      total: data.length,
      remote: data.filter((x) => x.mode === "Remote").length,
      avgStipend:
        data.reduce((sum, x) => sum + x.stipendValue, 0) / data.length,
      savedCount: saved.length,
    }),
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    [data, saved.length]
  );

  const toggleSave = (id) => {
    setSaved((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      setActionMessage(next.includes(id) ? "Internship saved" : "Removed from saved list");
      return next;
    });
  };

  const applyInternship = (id, company) => {
    if (applied.includes(id)) {
      setActionMessage(`Already applied to ${company}`);
      return;
    }
    setApplied((prev) => [...prev, id]);
    setActionMessage(`Application submitted for ${company}`);
  };

  return (
    <div className="min-h-screen bg-[#f4efe9] p-6">
      <div className="bg-[var(--color-maroon-dark)] text-white p-5 rounded-xl mb-6 flex justify-between">
        <h1 className="text-xl font-bold">Internships</h1>
        <p className="text-sm text-white/90 mt-1">
          Discover internship roles and track your applications.
        </p>
      </div>

      <div className="bg-[#FAF5EC] p-4 rounded-xl shadow mb-6 grid md:grid-cols-4 gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company, role, mode..."
          className="p-3 rounded border"
        />

        <select
          value={durationFilter}
          onChange={(e) => setDurationFilter(e.target.value)}
          className="p-3 rounded border"
        >
          <option value="all">Duration: All</option>
          <option value="3">3 Months</option>
          <option value="4">4 Months</option>
          <option value="6">6 Months</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="p-3 rounded border"
        >
          <option value="default">Sort: Default</option>
          <option value="stipend-high">Stipend: High to Low</option>
          <option value="stipend-low">Stipend: Low to High</option>
          <option value="openings">Openings: High to Low</option>
        </select>

        <button
          type="button"
          onClick={() => {
            setSearch("");
            setDurationFilter("all");
            setSortBy("default");
            setShowSavedOnly(false);
          }}
          className="bg-[#8B2513] text-white rounded px-3 py-2"
        >
          Reset Filters
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={showSavedOnly}
            onChange={(e) => setShowSavedOnly(e.target.checked)}
          />
          Show Saved Only
        </label>
        <span className="text-sm text-gray-600">Applied: {applied.length}</span>
      </div>

      {actionMessage && (
        <div className="mb-4 rounded bg-green-50 border border-green-200 text-green-700 p-3 text-sm">
          {actionMessage}
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-3 rounded shadow">Total: {stats.total}</div>
        <div className="bg-white p-3 rounded shadow">Remote: {stats.remote}</div>
        <div className="bg-white p-3 rounded shadow">
          Avg Stipend: Rs {stats.avgStipend.toFixed(0)}
        </div>
        <div className="bg-white p-3 rounded shadow">Saved: {stats.savedCount}</div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {displayed.map((i) => (
          <div
            key={i.id}
            className="bg-white p-5 rounded-xl shadow hover:shadow-lg"
          >
            <h2 className="font-semibold text-[#1E3A2B]">{i.company}</h2>
            <p>{i.role}</p>
            <p className="text-sm text-gray-500">{i.duration}</p>
            <p className="text-[#8B2513]">{i.stipend}</p>
            <p className="text-sm text-gray-500">Mode: {i.mode}</p>
            <p className="text-sm text-gray-500">Openings: {i.openings}</p>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setSelected(i)}
                className="border px-3 py-1 rounded"
              >
                View Details
              </button>
              <button
                onClick={() => toggleSave(i.id)}
                className="border px-3 py-1 rounded"
              >
                {saved.includes(i.id) ? "Saved" : "Save"}
              </button>
              <button
                onClick={() => applyInternship(i.id, i.company)}
                disabled={applied.includes(i.id)}
                className="bg-[#8B2513] text-white px-3 py-1 rounded disabled:opacity-60"
              >
                {applied.includes(i.id) ? "Applied" : "Quick Apply"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {displayed.length === 0 && (
        <div className="mt-6 bg-white rounded-xl shadow p-4 text-center text-gray-600">
          No internships match your filters.
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-xl w-96">
            <h2 className="font-bold">{selected.company}</h2>
            <p>{selected.role}</p>

            <div className="mt-3 text-sm bg-[#FAF5EC] p-3 rounded">
              Duration: {selected.duration} <br />
              Stipend: {selected.stipend} <br />
              Mode: {selected.mode} <br />
              Openings: {selected.openings} <br />
              Skills: {selected.skills.join(", ")}
            </div>

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setSelected(null)}
                className="border px-3 py-1 rounded"
              >
                Close
              </button>
              <button
                onClick={() => applyInternship(selected.id, selected.company)}
                disabled={applied.includes(selected.id)}
                className="bg-[#8B2513] text-white px-3 py-1 rounded disabled:opacity-60"
              >
                {applied.includes(selected.id) ? "Applied" : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}