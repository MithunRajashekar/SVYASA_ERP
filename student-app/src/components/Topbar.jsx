import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRef, useEffect } from "react";

export default function Topbar({ user }) {
  const [open, setOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false); // ✅ added
  const navigate = useNavigate();
  const dropdownRef = useRef();
  const notificationRef = useRef(); // ✅ added

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }

      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false); // ✅ close notification popup
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      className="h-16 flex mt-1 items-center justify-between px-6 shadow-sm relative"
      style={{
        background: "linear-gradient(90deg,#FFFDF7 60%,#F5EDD8 100%)",
        borderBottom: "1px solid rgba(201,168,76,0.25)"
      }}
    >

      {/* Left Section */}
      <div>
        <h2
          className="text-lg font-semibold"
          style={{ fontFamily: "'Cinzel', serif", color: "#1C1C1C" }}
        >
          Student ERP
        </h2>

        <p
          className="text-xs tracking-wide"
          style={{ color: "#8A8173" }}
        >
          S-VYASA University • Academic Year 2025–26
        </p>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4 relative">

        {/* PROFILE DROPDOWN */}
        <div className="relative" ref={dropdownRef}>

          {/* Avatar */}
          <div
            onClick={() => setOpen(!open)}
            className="w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200"
            style={{
              background: "linear-gradient(135deg,#C9A84C,#8B2513)",
              color: "white",
              fontWeight: "bold",
              boxShadow: "0 4px 15px rgba(139,37,19,0.4)"
            }}
          >
            {user?.name?.charAt(0)?.toUpperCase() || "S"}
          </div>

          {/* Dropdown */}
          {open && (
            <div
              className="absolute right-0 mt-3 w-64 rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn"
              style={{
                background: "#FFFDF7",
                border: "1px solid rgba(201,168,76,0.25)"
              }}
            >

              {/* Top Profile Section */}
              <div
                className="p-4"
                style={{
                  background: "linear-gradient(135deg,#8B2513,#C0452A)",
                  color: "white"
                }}
              >
                <p className="text-sm font-semibold text-center">
                  {user?.name || "Student"}
                </p>
                <p className="text-xs opacity-80 text-center">
                  {user?.userId}
                </p>
                <p className="text-xs opacity-80 text-center">
                  {user?.course} • {user?.semester} Semester
                </p>
              </div>

              {/* Options */}
              <div className="p-3 space-y-2 flex flex-col">


                <button
                  className="w-full text-left text-sm px-2 py-2 rounded-md transition flex justify-center"
                  style={{ color: "#8B2513" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F5EDD8"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  onClick={handleLogout}
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          )}
        </div>

         {/* 🔔 NOTIFICATION ICON */}
        <div className="relative" ref={notificationRef}>
          <div
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105"
            style={{
              background: "#F5EDD8",
              color: "#8B2513",
              fontSize: "26px"
            }}
          >
            🔔
          </div>

          {/* 🔔 FLOATING NOTIFICATION BOX */}
          {showNotifications && (
            <div
              className="absolute right-0 mt-3 w-64 rounded-xl shadow-xl z-50 p-4 animate-fadeIn"
              style={{
                background: "#FFFDF7",
                border: "1px solid rgba(201,168,76,0.25)"
              }}
            >
              {/* HEADER */}
              <div className="flex justify-between items-center mb-2">
                <p className="font-semibold text-sm">Notifications</p>

                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-xs px-2 py-1 rounded hover:bg-gray-100"
                >
                  ✖
                </button>
              </div>

              {/* CONTENT */}
              <div className="text-sm text-gray-500 text-center py-4">
                No notifications
              </div>
            </div>
          )}
        </div>


      </div>

      {/* ✨ ANIMATION */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .animate-fadeIn {
            animation: fadeIn 0.25s ease-in-out;
          }
        `}
      </style>

    </div>
  );
}