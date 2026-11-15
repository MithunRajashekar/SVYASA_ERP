import React, { useState } from "react";

export default function LibraryHistory() {
  const [search, setSearch] = useState("");

  const history = [
    {
      id: 1,
      title: "Database Management Systems",
      author: "Korth",
      issued: "2026-03-01",
      returned: "2026-03-10",
      fine: 0
    },
    {
      id: 2,
      title: "Operating System Concepts",
      author: "Silberschatz",
      issued: "2026-03-01",
      returned: "2026-03-18",
      fine: 20
    },
    {
      id: 3,
      title: "Computer Networks",
      author: "Tanenbaum",
      issued: "2026-02-15",
      returned: "2026-02-28",
      fine: 0
    }
  ];

  // 🔍 SEARCH FILTER
  const filtered = history.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f4efe9] p-6">

      {/* HEADER */}
      <div className="bg-[var(--color-maroon-dark)] text-white p-5 rounded-xl mb-6 flex justify-between">
        <h1 className="text-xl font-bold">Library History</h1>
      </div>

      {/* SEARCH */}
      <div className="bg-[#FAF5EC] p-4 rounded-xl mb-6 shadow">
        <input
          type="text"
          placeholder="Search history..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 rounded border focus:ring-2 focus:ring-[#8B2513]"
        />
      </div>

      {/* HISTORY LIST */}
      <div className="grid md:grid-cols-2 gap-5">
        {filtered.map((book) => (
          <div
            key={book.id}
            className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition"
          >
            <h2 className="font-semibold text-[#1E3A2B]">
              {book.title}
            </h2>

            <p className="text-sm text-gray-500">
              {book.author}
            </p>

            <div className="mt-3 text-sm space-y-1">
              <p><b>Issued:</b> {book.issued}</p>
              <p><b>Returned:</b> {book.returned}</p>

              {/* STATUS */}
              <p>
                <b>Status:</b>{" "}
                <span
                  className={`font-semibold ${
                    book.fine > 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {book.fine > 0 ? "Late Return" : "On Time"}
                </span>
              </p>

              {/* FINE */}
              {book.fine > 0 && (
                <p className="text-red-600">
                  Fine Paid: ₹{book.fine}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* EMPTY STATE */}
      {filtered.length === 0 && (
        <p className="text-center text-gray-400 mt-6">
          No history found
        </p>
      )}
    </div>
  );
}