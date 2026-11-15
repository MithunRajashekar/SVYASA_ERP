import { useState } from "react";

export default function AcademicHub() {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [submitted, setSubmitted] = useState({});
  const [joinedQuiz, setJoinedQuiz] = useState({});

  const subjects = [
    {
      id: 1,
      name: "Artificial Intelligence",
      code: "MCA201",
      faculty: "Dr. Sharma",
      items: [
        {
          id: "ai1",
          type: "assignment",
          title: "AI Assignment 1",
          description: "Implement BFS and DFS",
          date: "2026-04-12",
        },
        {
          id: "ai2",
          type: "quiz",
          title: "AI Quiz 1",
          description: "Basics of AI",
          date: "2026-04-13",
        },
        {
          id: "ai3",
          type: "resource",
          title: "AI PPT",
          description: "Introduction slides",
          link: "#",
        },
      ],
    },
    {
      id: 2,
      name: "Machine Learning",
      code: "MCA202",
      faculty: "Prof. Reddy",
      items: [
        {
          id: "ml1",
          type: "assignment",
          title: "Regression Assignment",
          description: "Linear Regression Model",
          date: "2026-04-15",
        },
        {
          id: "ml2",
          type: "quiz",
          title: "ML Quiz",
          description: "Supervised Learning",
          date: "2026-04-16",
        },
      ],
    },
    {
      id: 3,
      name: "Research Methodology",
      code: "MCA203",
      faculty: "Dr. Mehta",
      items: [
        {
          id: "rm1",
          type: "resource",
          title: "IEEE Paper Format",
          description: "Reference format",
          link: "#",
        },
        {
          id: "rm2",
          type: "assignment",
          title: "Research Proposal",
          description: "Submit your proposal",
          date: "2026-04-18",
        },
      ],
    },
    {
      id: 4,
      name: "Power BI",
      code: "MCA204",
      faculty: "Mr. Kumar",
      items: [
        {
          id: "bi1",
          type: "assignment",
          title: "Dashboard Project",
          description: "Create interactive dashboard",
          date: "2026-04-20",
        },
        {
          id: "bi2",
          type: "resource",
          title: "Power BI Tutorial",
          description: "Learning material",
          link: "#",
        },
      ],
    },
  ];

  return (
    <div className="p-6">
      {/* HEADER */}
        <div className="bg-[var(--color-maroon-dark)] text-white p-5 rounded-xl mb-6 flex justify-between">

        <h1 className="text-xl font-bold">Academic Workspace</h1>
      </div>

      {/* STUDENT INFO */}
      <div className="bg-[#FAF5EC] p-4 rounded-xl shadow mb-6 grid md:grid-cols-4 gap-4 text-sm">
        <div>
          <b>Name:</b> Mahesh Y
        </div>
        <div>
          <b>Reg No:</b> 2222509130
        </div>
        <div>
          <b>Program:</b> MCA
        </div>
        <div>
          <b>Exam:</b> Regular Exam
        </div>
        <div>
          <b>Level:</b> PG
        </div>
        <div>
          <b>Semester:</b> 2
        </div>
        <div>
          <b>Year:</b> 2025-2027
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[#efe7df] p-4 rounded-lg border">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b">
              <th className="p-3">Subject</th>
              <th className="p-3">Code</th>
              <th className="p-3">Faculty</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((sub) => (
              <tr
                key={sub.id}
                className="border-b hover:bg-white transition"
              >
                <td className="p-3">{sub.name}</td>
                <td className="p-3">{sub.code}</td>
                <td className="p-3">{sub.faculty}</td>
                <td className="p-3 text-center">
                  <button
                    className="bg-red-700 text-white px-3 py-1 rounded"
                    onClick={() => setSelectedSubject(sub)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CENTERED MODAL */}
      {selectedSubject && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="w-full md:w-[450px] bg-white p-5 rounded-2xl shadow-lg max-h-[90vh] overflow-y-auto">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">
                {selectedSubject.name}
              </h2>
              <button
                onClick={() => setSelectedSubject(null)}
                className="text-red-700 text-lg"
              >
                ✕
              </button>
            </div>

            {/* CONTENT */}
            <div className="space-y-4">
              {selectedSubject.items.map((item) => (
                <div
                  key={item.id}
                  className="border p-4 rounded-lg bg-[#f1ece3]"
                >
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-gray-600">
                    {item.description}
                  </p>

                  {item.date && (
                    <p className="text-xs text-gray-400 mt-1">
                      Due: {item.date}
                    </p>
                  )}

                  <div className="mt-3">
                    {/* ASSIGNMENT */}
                    {item.type === "assignment" && (
                      <button
                        className={`px-3 py-1 rounded text-sm ${
                          submitted[item.id]
                            ? "bg-green-600 text-white"
                            : "bg-red-700 text-white"
                        }`}
                        onClick={() =>
                          setSubmitted({
                            ...submitted,
                            [item.id]: true,
                          })
                        }
                      >
                        {submitted[item.id]
                          ? "Submitted"
                          : "Submit Assignment"}
                      </button>
                    )}

                    {/* QUIZ */}
                    {item.type === "quiz" && (
                      <button
                        className={`px-3 py-1 rounded text-sm ${
                          joinedQuiz[item.id]
                            ? "bg-green-600 text-white"
                            : "bg-red-700 text-white"
                        }`}
                        onClick={() =>
                          setJoinedQuiz({
                            ...joinedQuiz,
                            [item.id]: true,
                          })
                        }
                      >
                        {joinedQuiz[item.id]
                          ? "Joined"
                          : "Join Quiz"}
                      </button>
                    )}

                    {/* RESOURCE */}
                    {item.type === "resource" && (
                      <a
                        href={item.link}
                        className="text-blue-600 underline text-sm"
                      >
                        Open Resource
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}