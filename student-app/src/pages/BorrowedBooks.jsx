import React, { useState } from "react";

export default function BorrowedBooks() {
  const [returnBook, setReturnBook] = useState(null);

  const today = new Date();

  const books = [
    {
      id: 1,
      title: "Operating System Concepts",
      author: "Silberschatz",
      category: "OS",
      due: "2026-04-05"
    },
    {
      id: 2,
      title: "Computer Networks",
      author: "Tanenbaum",
      category: "CN",
      due: "2026-04-01"
    }
  ];

  const getFine = (dueDate) => {
    const due = new Date(dueDate);
    const diff = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff * 5 : 0;
  };

  return (
    <div className="min-h-screen bg-[#f4efe9] p-6">

      {/* HEADER */}
      <div className="bg-[var(--color-maroon-dark)] text-white p-5 rounded-xl mb-6 flex justify-between">
        <h1 className="text-xl font-bold">Borrowed Books</h1>
      </div>

      {/* BOOK LIST */}
      <div className="grid md:grid-cols-2 gap-5">
        {books.map((book) => {
          const fine = getFine(book.due);

          return (
            <div key={book.id} className="bg-white p-5 rounded-xl shadow">

              <h2 className="font-semibold text-[#1E3A2B]">
                {book.title}
              </h2>

              <p className="text-sm text-gray-500">{book.author}</p>

              <p className="mt-2 text-sm">Due: {book.due}</p>

              {fine > 0 && (
                <p className="text-red-600 text-sm">
                  Fine: ₹{fine}
                </p>
              )}

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setReturnBook(book)}
                  className="bg-[#8B2513] text-white px-4 py-1 rounded"
                >
                  Return
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* RETURN MODAL */}
      {returnBook && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center">

          <div className="bg-white p-6 rounded-xl w-96">

            <h2 className="font-bold text-lg mb-2">
              {returnBook.title}
            </h2>

            <p><b>Author:</b> {returnBook.author}</p>
            <p><b>Category:</b> {returnBook.category}</p>
            <p><b>Due:</b> {returnBook.due}</p>

            <div className="mt-3 text-sm bg-[#FAF5EC] p-3 rounded">
              • Max 14 days issue <br />
              • Fine: ₹5/day
            </div>

            {getFine(returnBook.due) > 0 && (
              <p className="text-red-600 mt-2">
                Fine: ₹{getFine(returnBook.due)}
              </p>
            )}

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setReturnBook(null)}
                className="border px-3 py-1 rounded"
              >
                Close
              </button>

              <button className="bg-[#8B2513] text-white px-4 py-1 rounded">
                Return
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}