import React, { useState } from "react";

export default function AvailableBooks() {
  const [search, setSearch] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);

  const books = [
    {
      id: 1,
      title: "Database Management Systems",
      author: "Korth",
      category: "DBMS",
      status: "Available",
      tags: ["SQL", "Theory"]
    },
    {
      id: 2,
      title: "Artificial Intelligence",
      author: "Russell",
      category: "AI",
      status: "Available",
      tags: ["ML", "AI"]
    }
  ];

  const filtered = books.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f4efe9] p-6">

      {/* HEADER */}
      <div className="bg-[var(--color-maroon-dark)] text-white p-5 rounded-xl mb-6 flex justify-between">
        <h1 className="text-xl font-bold">Available Books</h1>
      </div>

      {/* SEARCH */}
      <div className="bg-[#FAF5EC] p-4 rounded-xl mb-6 shadow">
        <input
          type="text"
          placeholder="Search books..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 rounded border"
        />
      </div>

      {/* BOOKS */}
      <div className="grid md:grid-cols-2 gap-5">
        {filtered.map((book) => (
          <div
            key={book.id}
            onClick={() => setSelectedBook(book)}
            className="bg-white p-5 rounded-xl shadow hover:shadow-lg cursor-pointer"
          >
            <h2 className="font-semibold text-[#1E3A2B]">
              {book.title}
            </h2>
            <p className="text-sm text-gray-500">{book.author}</p>

            <div className="mt-2 flex gap-2 flex-wrap">
              {book.tags.map((tag, i) => (
                <span key={i} className="bg-[#FAF5EC] px-2 py-1 text-xs rounded-full">
                  {tag}
                </span>
              ))}
            </div>

            <p className="text-green-600 mt-2">Available</p>
          </div>
        ))}
      </div>

      {/* ISSUE MODAL */}
      {selectedBook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">

          <div className="bg-white p-6 rounded-xl w-96">
            <h2 className="font-bold text-lg">{selectedBook.title}</h2>

            <p><b>Author:</b> {selectedBook.author}</p>
            <p><b>Category:</b> {selectedBook.category}</p>

            <div className="mt-3 text-sm bg-[#FAF5EC] p-3 rounded">
              • Max 14 days issue <br />
              • Fine: ₹5/day
            </div>

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setSelectedBook(null)}
                className="border px-3 py-1 rounded"
              >
                Close
              </button>

              <button className="bg-[#1E3A2B] text-white px-3 py-1 rounded">
                Issue
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}