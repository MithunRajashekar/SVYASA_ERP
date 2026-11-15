import React, { useState } from "react";

export default function Placement() {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const jobs = [
    {
      company: "Infosys",
      role: "Software Engineer",
      location: "Bangalore",
      package: "6 LPA",
      mode: "On-campus",
      skills: ["DSA", "OOP", "Aptitude"],
    },
    {
      company: "TCS",
      role: "System Engineer",
      location: "Hyderabad",
      package: "5 LPA",
      mode: "Hybrid",
      skills: ["SQL", "Web", "Communication"],
    },
    {
      company: "Wipro",
      role: "Project Engineer",
      location: "Pune",
      package: "4.5 LPA",
      mode: "Off-campus",
      skills: ["Testing", "Java"],
    },
  ];

  const filtered = jobs.filter(
    (job) =>
      job.company.toLowerCase().includes(search.toLowerCase()) ||
      job.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f4efe9] p-6">

      {/* HEADER */}
      <div className="bg-[var(--color-maroon-dark)] text-white p-5 rounded-xl mb-6 flex justify-between">

        <h2 className="text-2xl font-bold">Job Opportunities</h2>
      </div>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search jobs..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 rounded border mb-6"
      />

      {/* STATS */}
      <div className="flex gap-4 mb-6">
        <div className="bg-white p-3 rounded shadow">Total: {jobs.length}</div>
        <div className="bg-white p-3 rounded shadow">
          On-campus: {jobs.filter((j) => j.mode === "On-campus").length}
        </div>
      </div>

      {/* LIST */}
      <div className="grid md:grid-cols-2 gap-5">
        {filtered.map((job, i) => (
          <div
            key={i}
            onClick={() => setSelected(job)}
            className="bg-[#efe7df] p-5 rounded-xl shadow hover:shadow-lg cursor-pointer"
          >
            <h2 className="font-semibold text-[#1E3A2B]">{job.company}</h2>
            <p>{job.role}</p>
            <p className="text-sm text-gray-500">{job.location}</p>
            <span className="text-[#8B2513] text-sm">{job.package}</span>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-xl w-96">

            <h2 className="font-bold">{selected.company}</h2>
            <p>{selected.role}</p>

            <div className="mt-3 text-sm bg-[#FAF5EC] p-3 rounded">
              • Location: {selected.location} <br />
              • Mode: {selected.mode} <br />
              • Skills: {selected.skills.join(", ")}
            </div>

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setSelected(null)}
                className="border px-3 py-1 rounded"
              >
                Close
              </button>

              <button className="bg-[#8B2513] text-white px-3 py-1 rounded">
                Apply
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}