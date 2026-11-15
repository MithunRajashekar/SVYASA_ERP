import { useState } from "react";

export default function HostelPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [openDay, setOpenDay] = useState(null);

  const [showReceipt, setShowReceipt] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const [complaints, setComplaints] = useState([
    { title: "Fan not working", desc: "Ceiling fan broken", status: "Open" }
  ]);

  const [newComplaint, setNewComplaint] = useState({
    title: "",
    desc: ""
  });

  const [announcements, setAnnouncements] = useState([
    { id: 1, title: "Water Maintenance", msg: "No water from 10am–2pm", date: "Apr 5" },
    { id: 2, title: "Inspection", msg: "Room inspection on Friday", date: "Apr 7" }
  ]);

  const messMenu = [
    {
      day: "Monday",
      breakfast: "Idli & Chutney",
      brunch: "Fruit Bowl",
      lunch: "Rice, Sambar",
      snacks: "Tea & Biscuits",
      dinner: "Chapati & Curry"
    },
    {
      day: "Tuesday",
      breakfast: "Dosa",
      brunch: "Sandwich",
      lunch: "Biryani",
      snacks: "Samosa",
      dinner: "Fried Rice"
    },
    {
      day: "Wednesday",
      breakfast: "Upma",
      brunch: "Juice",
      lunch: "Curd Rice",
      snacks: "Pakoda",
      dinner: "Paratha"
    },
    {
      day: "Thursday",
      breakfast: "Pongal",
      brunch: "Boiled Corn",
      lunch: "Veg Meals",
      snacks: "Cutlet",
      dinner: "Noodles"
    },
    {
      day: "Friday",
      breakfast: "Poori",
      brunch: "Milkshake",
      lunch: "Pulav",
      snacks: "Chips",
      dinner: "Chapati"
    }
  ];

  const filteredComplaints = complaints.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const badgeColor = (status) => {
    if (status === "Open") return "bg-red-100 text-red-600";
    if (status === "In Progress") return "bg-yellow-100 text-yellow-600";
    return "bg-green-100 text-green-600";
  };

  const addComplaint = () => {
    if (!newComplaint.title) return;
    setComplaints([...complaints, { ...newComplaint, status: "Open" }]);
    setNewComplaint({ title: "", desc: "" });
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-[#f4efe9] p-6">

      {/* HEADER */}
      <div className="bg-[var(--color-maroon-dark)] font-bold text-white px-6 py-4 rounded-xl shadow-md mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold">Hostel </h1>
          {/* <p className="text-xs opacity-80">ID: STU123 • Room 204 | Wing B</p> */}
        </div>

      </div>

      {/* NAV */}
      <div className="flex gap-4 mb-6">
        {["dashboard", "complaints", "mess", "fees"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl capitalize transition duration-300 ${
              activeTab === tab
                ? "bg-[#8b1e1e] text-white"
                : "bg-white shadow-md hover:shadow-xl"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {activeTab === "dashboard" && (
        <div className="grid md:grid-cols-2 gap-6">

          <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-xl transition">
            <h2 className="font-semibold mb-3 text-[#1a3a2a]">Hostel Details</h2>
            <p>Hostel: Not assigned</p>
            <p>Warden: Not provided</p>
            <p>Contact: Not provided</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-md hover:shadow-xl transition">
            <h2 className="font-semibold mb-4 text-[#1a3a2a]">Roommates</h2>
            <p className="text-sm text-gray-500">Roommate information has not been added for this account.</p>
          </div>

          <div className="col-span-2 bg-white p-5 rounded-xl shadow-md">
            <h2 className="font-semibold mb-3 text-[#1a3a2a]">Announcements</h2>
            {announcements.map(a => (
              <div key={a.id} className="flex justify-between mb-2">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm text-gray-500">{a.msg}</p>
                </div>
                <button
                  onClick={() =>
                    setAnnouncements(prev => prev.filter(x => x.id !== a.id))
                  }
                  className="text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="col-span-2 bg-white p-5 rounded-xl shadow-md">
            <h2 className="font-semibold mb-3 text-[#1a3a2a]">Entry / Exit Logs</h2>
            <p>Apr 6: 8:00 AM → 7:30 PM</p>
            <p>Apr 5: 9:00 AM → 6:00 PM</p>
          </div>
        </div>
      )}

      {/* COMPLAINTS */}
      {activeTab === "complaints" && (
        <div className="bg-white p-5 rounded-xl shadow-md">
          <div className="flex justify-between mb-4">
            <input
              placeholder="Search complaints..."
              className="border p-2 rounded-lg w-1/2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-[#1a3a2a] text-white px-4 py-2 rounded-lg"
            >
              Add Complaint
            </button>
          </div>

          {showForm && (
            <div className="mb-4 p-4 border rounded-lg">
              <input
                placeholder="Title"
                className="block mb-2 w-full border p-2 rounded"
                value={newComplaint.title}
                onChange={(e) =>
                  setNewComplaint({ ...newComplaint, title: e.target.value })
                }
              />
              <textarea
                placeholder="Description"
                className="block mb-2 w-full border p-2 rounded"
                value={newComplaint.desc}
                onChange={(e) =>
                  setNewComplaint({ ...newComplaint, desc: e.target.value })
                }
              />
              <button
                onClick={addComplaint}
                className="bg-[#8b1e1e] text-white px-4 py-2 rounded"
              >
                Submit
              </button>
            </div>
          )}

          {filteredComplaints.map((c, i) => (
            <div key={i} className="p-4 border rounded-xl mb-3 hover:shadow-lg transition">
              <div className="flex justify-between">
                <h3 className="font-semibold">{c.title}</h3>
                <span className={`px-2 py-1 text-xs rounded ${badgeColor(c.status)}`}>
                  {c.status}
                </span>
              </div>
              <p className="text-sm">{c.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* MESS */}
      {activeTab === "mess" && (
        <div className="grid md:grid-cols-2 gap-4">
          {messMenu.map((m, i) => (
            <div
              key={i}
              className={`bg-white p-4 rounded-xl shadow-md cursor-pointer transition duration-300 ${
                openDay === i ? "shadow-xl border-l-4 border-[#8b1e1e]" : ""
              }`}
              onClick={() => setOpenDay(openDay === i ? null : i)}
            >
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">{m.day}</h3>
                <span className="text-sm text-gray-500">
                  {openDay === i ? "▲" : "▼"}
                </span>
              </div>

              {openDay === i && (
                <div className="mt-3 text-sm space-y-1">
                  <p><b>Breakfast:</b> {m.breakfast}</p>
                  <p><b>Brunch:</b> {m.brunch}</p>
                  <p><b>Lunch:</b> {m.lunch}</p>
                  <p><b>Snacks:</b> {m.snacks}</p>
                  <p><b>Dinner:</b> {m.dinner}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FEES */}
      {activeTab === "fees" && (
        <div className="bg-white p-5 rounded-xl shadow-md">
          <h2 className="font-semibold mb-4 text-[#1a3a2a]">Fees Overview</h2>

          <p>Total: ₹50,000</p>
          <p>Paid: ₹30,000</p>
          <p>Due: ₹20,000</p>

          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setShowPayment(true)}
              className="bg-[#1a3a2a] text-white px-4 py-2 rounded-lg"
            >
              Pay Now
            </button>

            <button
              onClick={() => setShowReceipt(true)}
              className="bg-[#8b1e1e] text-white px-4 py-2 rounded-lg"
            >
              Download Receipt
            </button>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <h2 className="font-bold mb-2">Payment Successful</h2>
            <button
              onClick={() => setShowPayment(false)}
              className="mt-3 bg-[#1a3a2a] text-white px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {showReceipt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="font-bold mb-2">Receipt</h2>
            <p>Student: Deeksha</p>
            <p>Amount Paid: ₹30,000</p>
            <button
              onClick={() => setShowReceipt(false)}
              className="mt-3 bg-[#8b1e1e] text-white px-4 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}