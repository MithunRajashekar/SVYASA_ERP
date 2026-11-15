import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/images/logo.png";

// eslint-disable-next-line no-unused-vars
export default function Sidebar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [openMenu, setOpenMenu] = useState(null);

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
    },

    {
      name: "Attendance",
      path: "/dashboard/attendance",
      subMenu: [
        {
          name: "View Attendance",
          path: "/dashboard/attendance",
        },
      ],
    },

    {
      name: "Timetable",
      path: "/dashboard/timetable",
      subMenu: [
        {
          name: "Class Timetable",
          path: "/dashboard/class-timetable",
        },
        {
          name: "Exam Timetable",
          path: "/dashboard/timetable/exam",
        },
      ],
    },

    {
      name: "Academic Calendar",
      path: "/dashboard/calendar",
    },

    {
      name: "Academic Workspace",
      path: "/dashboard/examination",
    },

    {
      name: "Internal Marks",
      path: "/dashboard/internal-marks",
    },

    {
      name: "Semester Results",
      path: "/dashboard/semester-results",
    },

    {
      name: "Placement",
      path: "/dashboard/placement",
      subMenu: [
        {
          name: "All Jobs",
          path: "/dashboard/placement",
        },
        {
          name: "Internship",
          path: "/dashboard/internship",
        },
        {
          name: "Soft Skills",
          path: "/dashboard/Soft-skills",
        },
      ],
    },

    {
      name: "Library",
      path: "/dashboard/library",
      subMenu: [
        {
          name: "Books",
          path: "/dashboard/library",
        },
        {
          name: "Available Books",
          path: "/dashboard/library-available",
        },
        {
          name: "Borrowed Books",
          path: "/dashboard/borrowed-books",
        },
      ],
    },

    {
      name: "Fees",
      path: "/dashboard/fees",
    },

    {
      name: "Hostel",
      path: "/dashboard/hostel",
    },

    {
      name: "Mentors",
      path: "/dashboard/mentor",
    },
  ];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  return (
    <aside
      className="w-64 h-screen flex flex-col shadow-lg"
      style={{
        backgroundColor: "var(--color-sidebar-bg)",
        color: "var(--color-sidebar-text)",
        borderRight: "1px solid var(--color-sidebar-border)",
      }}
    >
      {/* ---------- Logo ---------- */}

      <div className="px-6 py-7 border-b border-white/10">

        <div className="flex flex-col items-center">

          <img
            src={logo}
            alt="S-VYASA"
            className="h-16 w-16 rounded-xl object-contain"
          />

          <h1
            className="mt-3 text-xl tracking-widest"
            style={{
              fontFamily: "'Cinzel', serif",
              color: "var(--color-sidebar-text)",
            }}
          >
            S-VYASA
          </h1>

          <div
            className="mt-3 h-[2px] w-12 rounded-full"
            style={{
              backgroundColor: "var(--color-brand-2)",
            }}
          />
        </div>

      </div>

      {/* ---------- Navigation ---------- */}

      <div className="flex-1 overflow-y-auto px-4 py-4 custom-scroll">
























{menuItems.map((item, index) => {
  const isActive =
    location.pathname === item.path ||
    (item.subMenu &&
      item.subMenu.some((sub) => location.pathname === sub.path));

  return (
    <div key={index} className="mb-2">

      {/* Main Menu Item */}

      <button
        type="button"
        onClick={() => {
          if (item.subMenu) {
            setOpenMenu(openMenu === index ? null : index);
          } else {
            navigate(item.path);
          }
        }}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200"
        style={{
          backgroundColor: isActive
            ? "var(--color-sidebar-active)"
            : "transparent",
          color: isActive
            ? "#ffffff"
            : "var(--color-sidebar-text)",
        }}
        onMouseEnter={(e) => {
          if (!isActive)
            e.currentTarget.style.backgroundColor =
              "var(--color-sidebar-hover)";
        }}
        onMouseLeave={(e) => {
          if (!isActive)
            e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <span className="font-medium text-[15px]">
          {item.name}
        </span>

        {item.subMenu && (
          <span
            className="transition-transform duration-300 text-lg"
            style={{
              transform:
                openMenu === index
                  ? "rotate(90deg)"
                  : "rotate(0deg)",
            }}
          >
            ▸
          </span>
        )}
      </button>

      {/* Sub Menu */}

      {item.subMenu && openMenu === index && (
        <div
          className="mt-2 ml-3 pl-3 space-y-1"
          style={{
            borderLeft: "1px solid var(--color-sidebar-border)",
          }}
        >
          {item.subMenu.map((subItem, subIndex) => {
            const isSubActive =
              location.pathname === subItem.path;

            return (
              <button
                key={subIndex}
                type="button"
                onClick={() => navigate(subItem.path)}
                className="w-full text-left px-3 py-2 rounded-lg transition-all duration-200 text-sm"
                style={{
                  backgroundColor: isSubActive
                    ? "var(--color-brand-2)"
                    : "transparent",
                  color: isSubActive
                    ? "#ffffff"
                    : "var(--color-sidebar-muted)",
                }}
                onMouseEnter={(e) => {
                  if (!isSubActive)
                    e.currentTarget.style.backgroundColor =
                      "var(--color-sidebar-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!isSubActive)
                    e.currentTarget.style.backgroundColor =
                      "transparent";
                }}
              >
                {subItem.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
})}

      </div>

      {/* ---------- Logout ---------- */}

      <div
        className="p-4"
        style={{
          borderTop: "1px solid var(--color-sidebar-border)",
        }}
      >
        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-3 rounded-xl font-semibold transition-all duration-200"
          style={{
            color: "var(--color-sidebar-text)",
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor =
              "var(--color-sidebar-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor =
              "transparent";
          }}
        >
          Logout
        </button>
      </div>

      {/* ---------- Styles ---------- */}

      <style>{`

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .custom-scroll {
          scroll-behavior: smooth;
        }

        .custom-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scroll::-webkit-scrollbar-thumb {
          background: var(--color-sidebar-active);
          border-radius: 10px;
        }

        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--color-brand-2);
        }

      `}</style>

    </aside>
  );
}