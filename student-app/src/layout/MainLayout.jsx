import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import ChatbotPanel from "../components/ChatbotPanel";

export default function MainLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  });
  const [checkingSession, setCheckingSession] = useState(true);
  const [openChat, setOpenChat] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.user?.role !== "student") throw new Error("Session expired");
        return payload.user;
      })
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        localStorage.setItem("user", JSON.stringify(currentUser));
        localStorage.removeItem("token");
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
      })
      .finally(() => { if (active) setCheckingSession(false); });
    return () => { active = false; };
  }, [navigate]);

  if (checkingSession) return <div className="min-h-screen flex items-center justify-center">Checking session…</div>;
  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F2EE]">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col relative">
        <Topbar user={user} />
        <div className="flex-1 overflow-y-auto p-2"><Outlet /></div>
        {!openChat && <button onClick={() => setOpenChat(true)} className="absolute bottom-5 right-5 bg-[#8b1e14] text-white px-4 py-2 rounded-lg shadow-lg z-40">Chat 🤖</button>}
        {openChat && <div className="absolute top-0 right-0 h-full w-[320px] z-50 shadow-2xl"><ChatbotPanel onClose={() => setOpenChat(false)} /></div>}
      </div>
    </div>
  );
}
