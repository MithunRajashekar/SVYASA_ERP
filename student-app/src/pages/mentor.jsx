import { useState } from "react";

export default function MentorDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [openModal, setOpenModal] = useState(null); // "remarks" | "chat" | null

  // ---------------- MEETINGS ----------------
  const [meetings] = useState([
    { date: "2026-04-01", time: "10:00 AM", topic: "Project Review", status: "Scheduled" },
    { date: "2026-03-28", time: "2:00 PM", topic: "Career Guidance", status: "Completed" },
    { date: "2026-03-20", time: "11:00 AM", topic: "Internship Help", status: "Missed" },
  ]);

  // ---------------- ISSUES ----------------
  const [issues, setIssues] = useState([
    { title: "Assignment Doubt", description: "Need clarification", date: "2026-04-02", status: "In Progress" },
    { title: "Attendance Issue", description: "Marked absent wrongly", date: "2026-03-25", status: "Resolved" },
  ]);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueForm, setIssueForm] = useState({ title: "", description: "" });

  // ---------------- ASSIGNMENTS ----------------
  const [assignments, setAssignments] = useState([
    {
      title: "Mini Project",
      description: "Build a React dashboard",
      dueDate: "2026-04-15",
      status: "Assigned",
    },
    {
      title: "Internship Report",
      description: "Submit final internship report",
      dueDate: "2026-04-20",
      status: "Assigned",
    },
  ]);

  // ---------------- MENTOR REMARKS ----------------
  const [mentorReviews] = useState([
    {
      date: "2026-04-05",
      mentor: "Not assigned",
      feedback:
        "The student has shown excellent progress in project development and maintains consistent communication. Needs to focus more on documentation.",
      rating: "4.5/5",
    },
  ]);

  // ---------------- CHAT STATES ----------------
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "mentor",
      text: "Hello, how can I help you?",
      image: null,
      replyTo: null,
    },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);

  // ---------------- HANDLERS ----------------
  const handleIssueSubmit = () => {
    if (!issueForm.title || !issueForm.description) return;

    setIssues([
      ...issues,
      {
        ...issueForm,
        date: new Date().toISOString().split("T")[0],
        status: "In Progress",
      },
    ]);

    setIssueForm({ title: "", description: "" });
    setShowIssueForm(false);
  };

  const handleSubmitAssignment = (index) => {
    const updated = [...assignments];
    updated[index].status = "Submitted";
    setAssignments(updated);
  };

  // ---------------- CHAT HANDLERS ----------------
  const sendMessage = () => {
    if (!newMessage && !imagePreview) return;

    if (editingId !== null) {
      setMessages(
        messages.map((msg) =>
          msg.id === editingId
            ? { ...msg, text: newMessage, image: imagePreview }
            : msg
        )
      );
      setEditingId(null);
    } else {
      setMessages([
        ...messages,
        {
          id: Date.now(),
          sender: "student",
          text: newMessage,
          image: imagePreview,
          replyTo: replyTo,
        },
      ]);
    }

    setNewMessage("");
    setImagePreview(null);
    setReplyTo(null);
    setActiveMessageId(null);
  };

  const deleteMessage = (id) => {
    setMessages(messages.filter((msg) => msg.id !== id));
  };

  const editMessage = (msg) => {
    setNewMessage(msg.text);
    setImagePreview(msg.image);
    setEditingId(msg.id);
  };

  // eslint-disable-next-line no-unused-vars
  const replyToMessage = (msg) => {
    setReplyTo(msg);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="bg-[var(--color-maroon-dark)] text-white p-5 rounded-xl mb-6 flex justify-between">
        <h1 className="text-lg font-semibold">Mentor Module</h1>
      </div>

      {/* CHAT BUTTON BELOW HEADER */}
      <div className="relative">
        <button
          onClick={() => setOpenModal("chat")}
          className="absolute right-0 -top-4 p-3 bg-red-700 hover:bg-red-800 text-white w-22 h-12 rounded-full shadow-md flex items-center justify-center transition-all duration-300"
          title="Chat with Mentor"
        >
          Chat with Mentor 💬
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-4">
        {["overview", "issues", "assignments"].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 rounded capitalize ${
              activeTab === tab
                ? "bg-red-700 text-white"
                : "bg-[#f1ece3] border"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Mentor Information */}
          <div className="bg-[#f1ece3] p-4 rounded-lg border shadow-sm">
            <h2 className="font-semibold mb-3">Mentor Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <p><span className="font-semibold">Name:</span> Not assigned</p>
              <p><span className="font-semibold">Department:</span> Not provided</p>
              <p><span className="font-semibold">Email:</span> Not provided</p>
              <p><span className="font-semibold">Contact:</span> Not provided</p>
              <p><span className="font-semibold">Office Hours:</span> Not provided</p>
              <p><span className="font-semibold">Designation:</span> Not provided</p>
            </div>
          </div>

          {/* Mentor Remarks */}
          <div
            className="bg-[#f1ece3] p-4 rounded-lg border shadow-sm hover:shadow-md cursor-pointer transition-all"
            onClick={() => setOpenModal("remarks")}
          >
            <h2 className="font-semibold text-red-700 mb-2">Mentor Remarks</h2>
            <p className="text-sm text-gray-700">
              {mentorReviews[0]?.feedback}
            </p>
          </div>

          {/* Meetings Table */}
          <div className="bg-[#f1ece3] p-4 rounded-lg border shadow-sm">
            <h2 className="font-semibold mb-3">Mentor Meetings</h2>
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="py-2">Date</th>
                  <th>Time</th>
                  <th>Topic</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {meetings.map((m, i) => (
                  <tr key={i} className="border-b hover:bg-red-50 transition">
                    <td className="py-2">{m.date}</td>
                    <td>{m.time}</td>
                    <td className="font-medium">{m.topic}</td>
                    <td>{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ISSUES TAB */}
      {activeTab === "issues" && (
        <div className="bg-[#f1ece3] p-4 rounded-lg border shadow-sm space-y-4">
          <div className="flex justify-between">
            <h2>Issues</h2>
            <button
              className="bg-red-700 text-white px-3 py-1 rounded"
              onClick={() => setShowIssueForm(!showIssueForm)}
            >
              Raise Issue
            </button>
          </div>

          {showIssueForm && (
            <div className="space-y-2 bg-white p-3 rounded border">
              <input
                className="w-full p-2 border rounded"
                placeholder="Title"
                value={issueForm.title}
                onChange={(e) =>
                  setIssueForm({ ...issueForm, title: e.target.value })
                }
              />
              <textarea
                className="w-full p-2 border rounded"
                placeholder="Description"
                value={issueForm.description}
                onChange={(e) =>
                  setIssueForm({
                    ...issueForm,
                    description: e.target.value,
                  })
                }
              />
              <button
                className="bg-green-700 text-white px-3 py-1 rounded"
                onClick={handleIssueSubmit}
              >
                Submit
              </button>
            </div>
          )}

          {issues.map((i, idx) => (
            <div key={idx} className="p-3 border rounded bg-white">
              <h3>{i.title}</h3>
              <p>{i.description}</p>
              <span>{i.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* ASSIGNMENTS TAB */}
      {activeTab === "assignments" && (
        <div className="bg-[#f1ece3] p-4 rounded-lg border shadow-sm space-y-4">
          <h2 className="font-semibold">Assignments Given by Mentor</h2>
          {assignments.map((a, i) => (
            <div
              key={i}
              className="p-4 border rounded-lg bg-white flex justify-between items-center hover:shadow-md transition"
            >
              <div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="text-sm text-gray-600">{a.description}</p>
                <p className="text-xs text-gray-500">Due: {a.dueDate}</p>
                <span>{a.status}</span>
              </div>

              {a.status === "Assigned" && (
                <button
                  className="bg-red-700 text-white px-4 py-1 rounded hover:bg-red-800"
                  onClick={() => handleSubmitAssignment(i)}
                >
                  Submit
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODALS */}
      {openModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-[#f1ece3] w-11/12 md:w-2/3 max-h-[100vh] rounded-xl shadow-lg p-6 overflow-y-auto relative">
            <button
              onClick={() => setOpenModal(null)}
              className="absolute top-3 right-3 bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-800"
            >
              ×
            </button>

            {/* REMARKS MODAL */}
            {openModal === "remarks" && (
              <>
                <h2 className="font-semibold text-lg mb-4 text-red-700">
                  Mentor Remarks
                </h2>
                {mentorReviews.map((review, index) => (
                  <div key={index} className="bg-white p-4 rounded border shadow-sm mb-3">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span className="font-medium">{review.mentor}</span>
                      <span>{review.date}</span>
                    </div>
                    <p className="mt-2 text-gray-700">{review.feedback}</p>
                    <p className="mt-2 text-sm font-semibold text-red-700">
                      Rating: {review.rating}
                    </p>
                  </div>
                ))}
              </>
            )}

            {/* CHAT MODAL */}
            {openModal === "chat" && (
              <>
                <h2 className="font-semibold text-lg mb-4 text-red-700">
                  Chat with Mentor
                </h2>

                <div className="h-64 overflow-y-auto border rounded p-3 space-y-2 bg-white">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() =>
                        msg.sender === "student"
                          ? setActiveMessageId(
                              activeMessageId === msg.id ? null : msg.id
                            )
                          : null
                      }
                      className={`p-3 rounded-2xl max-w-[75%] cursor-pointer ${
                        msg.sender === "student"
                          ? "bg-red-100 text-red-800 ml-auto"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {msg.replyTo && (
                        <div className="text-xs border-l-4 border-red-300 bg-red-50 pl-2 mb-1 rounded">
                          <p className="font-semibold capitalize">
                            {msg.replyTo.sender}
                          </p>
                          <p className="truncate">{msg.replyTo.text}</p>
                        </div>
                      )}
                      {msg.text && <p>{msg.text}</p>}
                      {msg.image && (
                        <img
                          src={msg.image}
                          alt="Uploaded"
                          className="mt-2 rounded-lg max-h-40"
                        />
                      )}

                      {activeMessageId === msg.id &&
                        msg.sender === "student" && (
                          <div className="flex gap-2 mt-2 justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReplyTo(msg);
                              }}
                              className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded"
                            >
                              Reply
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                editMessage(msg);
                              }}
                              className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMessage(msg.id);
                              }}
                              className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                    </div>
                  ))}
                </div>

                {replyTo && (
                  <div className="mt-2 bg-red-50 border-l-4 border-red-300 p-2 rounded relative">
                    <p className="text-xs text-gray-600">
                      Replying to {replyTo.sender}
                    </p>
                    <p className="text-sm truncate">{replyTo.text}</p>
                    <button
                      onClick={() => setReplyTo(null)}
                      className="absolute top-1 right-1 text-xs bg-red-700 text-white rounded-full w-5 h-5"
                    >
                      ×
                    </button>
                  </div>
                )}

                {imagePreview && (
                  <div className="mt-2 relative w-fit">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-20 rounded border"
                    />
                    <button
                      onClick={() => setImagePreview(null)}
                      className="absolute -top-2 -right-2 bg-red-700 text-white rounded-full w-5 h-5 text-xs"
                    >
                      ×
                    </button>
                  </div>
                )}

                <div className="flex mt-4 gap-2 items-center">
                  <label className="bg-red-700 text-white w-10 h-10 flex items-center justify-center rounded-full cursor-pointer hover:bg-red-800 text-lg font-bold">
                    +
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>

                  <input
                    className="flex-1 p-2 border rounded-full focus:ring-2 focus:ring-red-300 outline-none"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={
                      editingId ? "Edit your message..." : "Type a message..."
                    }
                  />

                  <button
                    className="bg-red-700 text-white px-4 py-2 rounded-full hover:bg-red-800"
                    onClick={sendMessage}
                  >
                    {editingId ? "Update" : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}