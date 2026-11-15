import { useState } from "react";
import { useNavigate } from "react-router-dom";
// ─── Drop svyasa_campus.png inside your src/ folder ──────────────────────────
import campusBg from "../assets/images/bg.png";
import logo from "../assets/images/logo.png";
// ─────────────────────────────────────────────────────────────────────────────

// ── S-VYASA Brand Palette ─────────────────────────────────────────────────────
// Burnt Red   #8B2513  — primary CTA, active tab, links
// Deep Red    #6B1A0D  — hover / pressed
// Terra Cotta #C0452A  — button gradient accent
// Gold        #C9A84C  — borders, dividers, trim
// Gold Light  #E2C67A  — headline highlight
// Dark Green  #1E3A2B  — left panel base tint / overlay
// Cream       #FAF5EC  — input background
// Ivory       #F5EDD8  — tab bar background
// Warm White  #FFFDF7  — right panel background
// ─────────────────────────────────────────────────────────────────────────────

const IconId = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0M9 14a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2"/>
  </svg>
);

const IconLock = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
  </svg>
);

const IconEyeOpen = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
  </svg>
);

const IconEyeOff = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
  </svg>
);

const Mandala = () => (
  <svg
    viewBox="0 0 200 200"
    xmlns="http://www.w3.org/2000/svg"
    className="absolute inset-0 w-full h-full opacity-[0.08]"
    style={{ animation: "spin 90s linear infinite" }}
  >
    <circle cx="100" cy="100" r="95" fill="none" stroke="white" strokeWidth="0.7"/>
    <circle cx="100" cy="100" r="74" fill="none" stroke="white" strokeWidth="0.5"/>
    <circle cx="100" cy="100" r="52" fill="none" stroke="white" strokeWidth="0.5"/>
    <circle cx="100" cy="100" r="30" fill="none" stroke="white" strokeWidth="0.4"/>
    {[0,45,90,135,180,225,270,315].map((deg) => (
      <ellipse key={deg} cx="100" cy="63" rx="6" ry="30"
        fill="white" fillOpacity="0.55"
        transform={`rotate(${deg} 100 100)`}/>
    ))}
    <polygon
      points="100,14 116,76 178,76 128,112 148,174 100,138 52,174 72,112 22,76 84,76"
      fill="none" stroke="white" strokeWidth="0.5"/>
  </svg>
);

const TABS = [
  {
    id: "student",
    label: "Student",
    idLabel: "Student ID",
    placeholder: "Enter Student ID",
  },
];

export default function SVyasaLogin() {
  const [activeTab, setActiveTab] = useState("student");
  const [userId,    setUserId]    = useState("");
  const [password,  setPassword]  = useState("");
  const [remember,  setRemember]  = useState(false);
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [toast,     setToast]     = useState(null);
  const navigate = useNavigate();
  
  const tab = TABS.find(t => t.id === activeTab);

  const fireToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const switchTab = (id) => { setActiveTab(id); setUserId(""); setPassword(""); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId.trim() || !password) {
      fireToast("Enter your student ID and password.", "error");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ student_id: userId.trim(), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || data.message || "Invalid student ID or password.");
      localStorage.removeItem("token");
      localStorage.setItem("user", JSON.stringify(data.student));
      fireToast("Login successful!");
      navigate("/dashboard");
    } catch (error) {
      fireToast(error.message || "Unable to sign in.", "error");
    } finally {
      setLoading(false);
    }
  };

  /* shared inline style helpers */
  const inputBase = {
    border: "1.5px solid #E2D9C8", background: "#FAF5EC",
    color: "#1C1C1C", fontFamily: "system-ui, -apple-system, \"Segoe UI\", sans-serif",
  };

  return (
    <div className="flex" style={{ fontFamily:"system-ui, -apple-system, \"Segoe UI\", sans-serif" }}>

      {/* ── Google Fonts + keyframes ── */}
      <style>{`
        
        @keyframes fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(36px)} to{opacity:1;transform:translateX(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes spinBtn { to{transform:rotate(360deg)} }
        @keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(16px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        .inp:focus { border-color:#C9A84C !important; box-shadow:0 0 0 3px rgba(201,168,76,0.16) !important; background:white !important; }
        input::placeholder { color:#C2B9AA; }
      `}</style>

      {/* ════ LEFT PANEL ════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex flex-[1.1] relative flex-col items-center justify-center overflow-hidden"
        style={{ minHeight:"100vh" }}
      >
        {/* ① Campus photo — full bleed */}
        <img
          src={campusBg}
          alt="S-VYASA campus"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ opacity: 0.28 }}
        />

        {/* ② Dark-green gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg,rgba(18,40,27,0.82) 0%,rgba(8,18,12,0.92) 100%)",
          }}
        />

        {/* ③ Warm gold accent glow (bottom-right — echoes the campus signage) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 48% 38% at 74% 74%,rgba(201,168,76,0.15) 0%,transparent 65%)",
          }}
        />

        {/* ④ Rotating Mandala */}
        <div className="absolute inset-0 overflow-hidden">
          <Mandala />
        </div>

        {/* ⑤ Corner ornaments */}
        <svg className="absolute top-4 left-4 w-12 h-12 opacity-25" viewBox="0 0 56 56">
          <path d="M0,0 L26,0 L26,3 L3,3 L3,26 L0,26 Z" fill="#C9A84C"/>
          <path d="M6,6 L22,6 L22,9 L9,9 L9,22 L6,22 Z" fill="#C9A84C"/>
        </svg>
        <svg className="absolute bottom-4 right-4 w-12 h-12 opacity-25"
          viewBox="0 0 56 56" style={{ transform:"rotate(180deg)" }}>
          <path d="M0,0 L26,0 L26,3 L3,3 L3,26 L0,26 Z" fill="#C9A84C"/>
          <path d="M6,6 L22,6 L22,9 L9,9 L9,22 L6,22 Z" fill="#C9A84C"/>
        </svg>

        {/* ⑥ Brand block */}
        <div
          className="relative z-10 text-center px-10"
          style={{ animation:"fadeUp 0.75s ease both" }}
        >
          {/* Logo ring */}
          <div
            className="w-[76px] h-[76px] rounded-full flex items-center justify-center mx-auto mb-5"
            // style={{
            //   background:"linear-gradient(135deg,#C9A84C 0%,#8B2513 100%)",
            //   boxShadow:"0 0 0 9px rgba(201,168,76,0.12),0 10px 40px rgba(0,0,0,0.6)",
            // }}
          >
           <div
  style={{
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    overflow: "hidden",
  }}
>
  <img
    src={logo}   // ← change this
    alt="profile"
    style={{
      width: "100%",
      height: "100%",
      objectFit: "cover",
    }}
  />
</div>
          </div>

          <h1
            className="text-[2.7rem] font-bold leading-none tracking-[0.16em]"
            style={{
              fontFamily:"'Cinzel',serif",
              color:"#E2C67A",
              textShadow:"0 2px 22px rgba(201,168,76,0.35)",
            }}
          >
            S-VYASA
          </h1>
          <p
            className="text-[0.57rem] mt-1 uppercase tracking-[0.38em]"
            style={{ fontFamily:"'Cinzel',serif", color:"rgba(201,168,76,0.5)" }}
          >
            Deemed to be University
          </p>

          <div
            className="w-14 h-[2px] mx-auto my-4 rounded-full"
            style={{ background:"linear-gradient(90deg,transparent,#C9A84C,transparent)" }}
          />

          <p
            className="text-[0.8rem] leading-[1.9] font-light max-w-[250px] mx-auto"
            style={{ color:"rgba(255,255,255,0.38)", letterSpacing:"0.05em" }}
          >
            Swami Vivekananda Yoga<br/>
            Anusandhana Samsthana<br/>
            Student Enterprise Resource Portal
          </p>

          <div className="flex justify-center gap-8 mt-6">
            {[["5000+","Students"],["300+","Faculty"],["40+","Programs"]].map(([n,l])=>(
              <div key={l} className="text-center">
                <div
                  className="text-lg font-bold"
                  style={{ fontFamily:"'Cinzel',serif", color:"#E2C67A" }}
                >{n}</div>
                <div
                  className="text-[0.58rem] uppercase tracking-widest mt-0.5"
                  style={{ color:"rgba(255,255,255,0.28)" }}
                >{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ⑦ Roof silhouette (references the building shape) */}
        <svg
          className="absolute bottom-0 w-full opacity-[0.08]"
          viewBox="0 0 400 70" preserveAspectRatio="none"
        >
          <path d="M0,70 L0,46 L80,19 L160,39 L200,11 L240,39 L320,15 L400,43 L400,70 Z"
            fill="#C9A84C"/>
        </svg>
      </div>

      {/* ════ RIGHT PANEL ═══════════════════════════════════════════════════════ */}
      <div
        className="flex-1 lg:flex-[0.9] flex flex-col items-center justify-center px-6 py-10 relative"
        style={{ background:"#FFFDF7", animation:"slideIn 0.65s cubic-bezier(0.22,1,0.36,1) both" }}
      >
        {/* Gold accent bar */}
        <div
          className="absolute top-0 left-0 w-[3px] h-full hidden lg:block"
          style={{ background:"linear-gradient(180deg,#C9A84C,#8B2513,#C9A84C)" }}
        />

        <div className="w-full max-w-[340px]">

          {/* Mobile header */}
          <div className="flex lg:hidden items-center gap-3 mb-7 justify-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background:"linear-gradient(135deg,#C9A84C,#8B2513)" }}
            >
              <svg viewBox="0 0 64 64" width="22" height="22" fill="white">
                <circle cx="32" cy="21" r="10"/>
                <path d="M16 43Q32 29 48 43Q40 55 32 51Q24 55 16 43Z"/>
              </svg>
            </div>
            <span
              className="text-xl font-bold tracking-widest"
              style={{ fontFamily:"'Cinzel',serif", color:"#8B2513" }}
            >S-VYASA</span>
          </div>

<h2
  className="text-[2rem] font-semibold mb-2"
  style={{ fontFamily:"'Cinzel',serif", color:"#1C1C1C" }}
>
  Student Login
</h2>

<p
  className="text-[0.9rem] mb-6"
  style={{ color:"#6B6B6B", letterSpacing:"0.04em" }}
>
  Sign in to access your ERP dashboard
</p>

{/* ── Form ── */}
<form onSubmit={handleSubmit} className="space-y-[18px]">

  {/* ID */}
  <div>
    <label
      className="block text-[0.75rem] font-bold uppercase tracking-[0.12em] mb-2"
      style={{ color:"#1C1C1C" }}
    >
      Student ID
    </label>

    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"#A0968A" }}>
        <IconId/>
      </span>

      <input
        type="text"
        value={userId}
        onChange={e => setUserId(e.target.value)}
        placeholder="Enter your student ID"
        className="inp w-full pl-10 pr-4 py-[14px] rounded-xl text-[0.95rem] outline-none transition-all duration-200"
        style={inputBase}
      />
    </div>
  </div>

  {/* Password */}
  <div>
    <label
      className="block text-[0.75rem] font-bold uppercase tracking-[0.12em] mb-2"
      style={{ color:"#1C1C1C" }}
    >
      Password
    </label>

    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:"#A0968A" }}>
        <IconLock/>
      </span>

      <input
        type={showPw ? "text" : "password"}
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Enter your password"
        className="inp w-full pl-10 pr-10 py-[14px] rounded-xl text-[0.95rem] outline-none transition-all duration-200"
        style={inputBase}
      />

      <button
        type="button"
        onClick={() => setShowPw(!showPw)}
        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-150"
        style={{ color:"#A0968A", background:"none", border:"none", cursor:"pointer" }}
        onMouseEnter={e => e.currentTarget.style.color="#8B2513"}
        onMouseLeave={e => e.currentTarget.style.color="#A0968A"}
      >
        {showPw ? <IconEyeOff/> : <IconEyeOpen/>}
      </button>
    </div>
  </div>

  {/* Remember / Forgot */}
  <div className="flex items-center justify-between pt-1">
    <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color:"#6B6B6B" }}>
      <input
        type="checkbox"
        checked={remember}
        onChange={e => setRemember(e.target.checked)}
        style={{ accentColor:"#8B2513", width:16, height:16 }}
      />
      Remember me
    </label>

    <button
      type="button"
      onClick={() => fireToast("Password reset link sent to your registered email.")}
      style={{
        color:"#8B2513",
        background:"none",
        border:"none",
        cursor:"pointer",
        fontFamily:"system-ui, -apple-system, \"Segoe UI\", sans-serif",
        fontSize:"0.8rem",
        fontWeight:700,
      }}
      onMouseEnter={e => e.currentTarget.style.color="#C0452A"}
      onMouseLeave={e => e.currentTarget.style.color="#8B2513"}
    >
      Forgot password?
    </button>
  </div>

  {/* Submit */}
  <button
    type="submit"
    disabled={loading}
    className="w-full py-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-200"
    style={{
      fontFamily:"'Cinzel',serif",
      fontSize:"0.95rem",
      fontWeight:600,
      letterSpacing:"0.15em",
      background:"linear-gradient(135deg,#7A1C1C 0%,#A52A2A 100%)",
      color:"white",
      border:"none",
      cursor: loading ? "not-allowed" : "pointer",
      boxShadow:"0 6px 22px rgba(139,37,19,0.45)",
      opacity: loading ? 0.8 : 1,
    }}
    onMouseEnter={e => {
      if(!loading){
        e.currentTarget.style.transform="translateY(-2px)";
        e.currentTarget.style.boxShadow="0 8px 28px rgba(139,37,19,0.55)";
      }
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform="translateY(0)";
      e.currentTarget.style.boxShadow="0 6px 22px rgba(139,37,19,0.45)";
    }}
  >
    {loading
      ? <>
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
            <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Signing in…
        </>
      : "Sign In to ERP"
    }
  </button>

  {/* Gold shimmer */}
  <div
    className="h-[2px] rounded-full opacity-60"
    style={{ background:"linear-gradient(90deg,transparent,#C9A84C,transparent)" }}
  />

</form>

{/* Help */}
<p className="text-center text-[0.75rem] mt-6" style={{ color:"#B0A898" }}>
  Need help?&nbsp;
  {["IT Support","Help Desk"].map(lbl => (
    <button
      key={lbl}
      onClick={() => fireToast(`Opening ${lbl}…`)}
      style={{
        color:"#8B2513",
        background:"none",
        border:"none",
        cursor:"pointer",
        fontFamily:"system-ui, -apple-system, \"Segoe UI\", sans-serif",
        fontSize:"0.75rem",
        fontWeight:700,
      }}
      onMouseEnter={e=>e.currentTarget.style.color="#C0452A"}
      onMouseLeave={e=>e.currentTarget.style.color="#8B2513"}
    >
      {lbl}
    </button>
  )).reduce((a,b)=>[a," · ",b])}
</p>

{/* Activate */}
<div
  className="mt-4 rounded-xl py-3 px-4 text-center text-[0.75rem]"
  style={{
    background:"rgba(201,168,76,0.08)",
    border:"1px solid rgba(201,168,76,0.22)",
    color:"#6B6B6B",
  }}
>
  New student?&nbsp;
  <button
    onClick={() => fireToast("Redirecting to Account Activation…")}
    style={{
      color:"#8B2513",
      background:"none",
      border:"none",
      cursor:"pointer",
      fontFamily:"system-ui, -apple-system, \"Segoe UI\", sans-serif",
      fontSize:"0.75rem",
      fontWeight:700,
    }}
  >
    Activate your account →
  </button>
</div>
        </div>

        {/* Footer */}
        <p className="absolute bottom-3 text-[0.59rem] tracking-wide" style={{ color:"#C8BFB0" }}>
          © 2025 S-VYASA University · All rights reserved
        </p>

        {/* Toast */}
        {toast && (
          <div
            className="absolute bottom-12 left-1/2 px-5 py-2 rounded-lg text-xs text-white whitespace-nowrap z-50"
            style={{
              transform:"translateX(-50%)",
              background: toast.type === "error" ? "#6B1A0D" : "#1E3A2B",
              border:"1px solid rgba(201,168,76,0.3)",
              letterSpacing:"0.04em",
              animation:"toastIn 0.35s cubic-bezier(0.22,1,0.36,1) both",
              fontFamily:"system-ui, -apple-system, \"Segoe UI\", sans-serif",
            }}
          >
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}
