import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle, ArrowUpRight, Bell, BookOpen, Briefcase, Building2, CalendarDays,
  BarChart3, Check, ChevronDown, ClipboardCheck, Clock3, FileText, FolderTree,
  GraduationCap, LayoutDashboard, LogOut, Menu, Search, Settings, ShieldCheck, UserCircle,
  Users, X, KeyRound, LockKeyhole, LoaderCircle, FileSpreadsheet,
} from "lucide-react";
import { NAVIGATION, MODULES } from "./modules";
import { api, fmtDate } from "./api";
import ModuleWorkspace from "./ModuleWorkspace";
import AdminConsole from "./AdminConsole";
import AcademicRecords from "./AcademicRecords";
import EventWorkspace from "./EventWorkspace";
import BulkImportCenter from "./BulkImportCenter";
import ReportsWorkspace from "./ReportsWorkspace";
import AdminMentorWorkspace from "./AdminMentorWorkspace";
import MentorWorkspace from "./MentorWorkspace";
import HostelAdminWorkspace from "./HostelAdminWorkspace";
import StudentNocWorkspace from "./StudentNocWorkspace";

const ICONS = { LayoutDashboard, Users, GraduationCap, ClipboardCheck, FolderTree, BookOpen, Briefcase, CalendarDays, BarChart3, Building2, FileText, UserCircle, Settings, FileSpreadsheet };
const ROLE_LABEL = { admin: "Administrator", faculty: "Faculty", student: "Student" };
const ROLE_SUBTITLE = { admin: "University control centre", faculty: "Teaching and academic workspace", student: "Your campus and academic workspace" };

function LoginScreen({ role, initialError = "", onLogin }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError("");
    if (!identifier.trim() || !password) { setError("Enter your user ID and password."); return; }
    setLoading(true);
    try {
      const result = await api("/api/auth/login", { method: "POST", body: { identifier: identifier.trim(), password, role } });
      if (result.user?.role !== role) throw new Error(`This account does not have ${ROLE_LABEL[role]} Portal access.`);
      onLogin(result.user);
    } catch (loginError) { setError(loginError.message); }
    finally { setLoading(false); }
  }
  return <main className="erp-login-page"><div className="erp-login-card"><div className="erp-login-brand"><div className="erp-brand-mark"><GraduationCap size={30} /></div><div className="erp-brand-name">S-VYASA</div><div className="erp-brand-sub">Deemed to be University</div><div className="erp-brand-rule" /><h1>One campus.<br />One connected system.</h1><p>Secure access to university operations, academic services and campus resources.</p><div className="erp-brand-footer">S-VYASA · Student Enterprise Resource Portal</div></div><form className="erp-login-form" onSubmit={submit}><div className="erp-eyebrow">Secure sign in</div><h2>{ROLE_LABEL[role]} Portal</h2><p className="erp-login-intro">Sign in using the account issued by your university administrator.</p>{error && <div className="erp-alert erp-alert-error"><AlertCircle size={16} />{error}</div>}<label className="erp-form-field"><span>{role === "student" ? "Student ID / USN" : role === "faculty" ? "Faculty ID" : "Administrator ID"}</span><input className="erp-input erp-login-input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" placeholder={role === "admin" ? "ERP-ADMIN" : role === "faculty" ? "Enter faculty ID" : "Enter student ID"} autoFocus /></label><label className="erp-form-field"><span>Password</span><div className="erp-password-wrap"><input className="erp-input erp-login-input" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password" /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button></div></label><button className="erp-button erp-login-submit" disabled={loading}>{loading ? <><LoaderCircle size={17} className="erp-spin" /> Signing in…</> : <>Continue securely <ArrowUpRight size={17} /></>}</button><div className="erp-login-foot"><LockKeyhole size={14} /> Protected by university role-based access</div><div className="erp-login-help">Need access? Contact the ERP administrator to create or activate your account.</div></form></div></main>;
}

function Dashboard({ user, role, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); try { const response = await api("/api/portal/summary"); setStats(response.stats || {}); setError(""); } catch (e) { setError(e.message); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const cards = role === "admin" ? [
    ["Active students", stats?.students, Users], ["Active faculty", stats?.faculty, GraduationCap], ["Classes", stats?.classes, Building2], ["Subjects", stats?.subjects, BookOpen], ["Pending reviews", Number(stats?.eventsPending || 0) + Number(stats?.approvalsPending || 0), ClipboardCheck], ["Generated folders", stats?.folders, FolderTree],
  ] : role === "faculty" ? [
    ["My allocations", stats?.classes, Users], ["Attendance entries", stats?.attendance, ClipboardCheck], ["Lesson plans", stats?.lessonPlans, BookOpen], ["Assessments", stats?.assessments, FileText], ["Pending submissions", stats?.pendingSubmissions, Clock3], ["My events", stats?.events, CalendarDays],
  ] : [
    ["Attendance records", stats?.attendanceEntries, ClipboardCheck], ["CIA mark sheets", stats?.markSheets, BarChart3], ["Assignments", stats?.assignments, FileText], ["Notices", stats?.notices, Bell], ["Placement opportunities", stats?.placements, Briefcase],
  ];
  const quickLinks = role === "admin" ? [["Create accounts", "users"], ["Bulk import Excel", "imports"], ["Configure classes", "academics"], ["Review requests", "approvals"]] : role === "faculty" ? [["Mark attendance", "attendance"], ["Bulk import Excel", "imports"], ["Enter CIA & Internal marks", "marks"], ["Create lesson plan", "lesson-plans"]] : [["Check attendance", "attendance"], ["View CIA & Internal marks", "marks"], ["View timetable", "class-timetable"], ["Browse placements", "placements"]];
  return <section className="erp-page erp-dashboard"><div className="erp-welcome"><div><div className="erp-eyebrow">{ROLE_SUBTITLE[role]}</div><h1>Welcome back, {user.name?.split(" ")[0] || ROLE_LABEL[role]}</h1><p>{role === "student" ? `${user.program || "Student"}${user.semester ? ` · Semester ${user.semester}` : ""}${user.section ? ` · Section ${user.section}` : ""}` : role === "faculty" ? `${user.department || "University"} · Faculty workspace` : "Your university operations at a glance."}</p></div><div className="erp-welcome-date">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div></div>
    {error && <div className="erp-alert erp-alert-error"><AlertCircle size={16} />{error}</div>}
    <div className="erp-kpi-grid">{cards.map(([label, value, Icon]) => <div className="erp-kpi" key={label}><div className="erp-kpi-icon"><Icon size={18} /></div><div className="erp-kpi-value">{loading ? "—" : (value ?? 0)}</div><div className="erp-kpi-label">{label}</div></div>)}</div>
    <div className="erp-dashboard-grid"><div className="erp-card"><div className="erp-card-head"><div><div className="erp-eyebrow">Quick access</div><h2>Frequently used</h2></div><button className="erp-text-button" onClick={load}>Refresh overview</button></div><div className="erp-quick-grid">{quickLinks.map(([label, id]) => <button className="erp-quick-link" key={id} onClick={() => onNavigate(id)}><span>{label}</span><ArrowUpRight size={16} /></button>)}</div></div><div className="erp-card erp-principles"><div className="erp-card-head"><div><div className="erp-eyebrow">System integrity</div><h2>One source of truth</h2></div><ShieldCheck size={21} /></div><p>All three portals use the same secure API and MongoDB database. Each action is checked against your role and account permissions.</p><div className="erp-principle"><Check size={15} /> Centralised academic records</div><div className="erp-principle"><Check size={15} /> Automatic record filing</div><div className="erp-principle"><Check size={15} /> Role-based access control</div></div></div>
  </section>;
}

function MyClasses({ user }) {
  const [classes, setClasses] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { let mounted = true; api(`/api/faculty/${user.id}/classes`).then((result) => { if (mounted) setClasses(result.classes || []); }).catch((e) => mounted && setError(e.message)).finally(() => mounted && setLoading(false)); return () => { mounted = false; }; }, [user.id]);
  return <section className="erp-page"><div className="erp-page-head"><div><div className="erp-eyebrow">Teaching</div><h1>My Classes</h1><p>Only classes and subjects allocated to your faculty account are shown here.</p></div></div>{error && <div className="erp-alert erp-alert-error">{error}</div>}<div className="erp-card">{loading ? <div className="erp-loading"><LoaderCircle className="erp-spin" /> Loading allocations…</div> : classes.length === 0 ? <div className="erp-empty"><Users size={24} /><strong>No class allocations yet</strong><span>Ask the administrator to assign your subjects and classes.</span></div> : <div className="erp-class-grid">{classes.map((item) => <article className="erp-class-card" key={item.assignmentId}><div className="erp-class-icon"><GraduationCap size={20} /></div><div className="erp-eyebrow">{item.subjectCode}</div><h3>{item.className}</h3><p>{item.subject}</p><div className="erp-record-meta"><span>{item.department}</span><span>Semester {item.semester}</span><span>Section {item.section}</span></div><small>{item.academicYear}</small></article>)}</div>}</div></section>;
}

function ProfileSettings({ user, onLogout }) {
  const [currentPassword, setCurrentPassword] = useState(""); const [newPassword, setNewPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState(""); const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [saving, setSaving] = useState(false);
  async function changePassword(event) { event.preventDefault(); setError(""); setSuccess(""); if (newPassword !== confirmPassword) { setError("The new passwords do not match."); return; } if (newPassword.length < 10) { setError("Use a password with at least 10 characters."); return; } setSaving(true); try { await api("/api/auth/change-password", { method: "POST", body: { currentPassword, newPassword } }); setSuccess("Password changed. Sign in again with your new password."); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); } catch (e) { setError(e.message); } finally { setSaving(false); } }
  return <section className="erp-page"><div className="erp-page-head"><div><div className="erp-eyebrow">Account</div><h1>My Profile & Security</h1><p>Review your account information and update your password.</p></div></div><div className="erp-profile-grid"><div className="erp-card"><div className="erp-profile-header"><div className="erp-avatar">{user.name?.slice(0, 1).toUpperCase()}</div><div><h2>{user.name}</h2><span className={`erp-role role-${user.role}`}>{ROLE_LABEL[user.role]}</span></div></div><div className="erp-profile-details">{[["User ID", user.code], ["Email", user.email], ["Department", user.department], ["Programme", user.program], ["Semester", user.semester], ["Section", user.section]].filter(([, value]) => value !== null && value !== undefined && value !== "").map(([key,value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}</div><button className="erp-button erp-button-light" onClick={onLogout}><LogOut size={16} /> Sign out</button></div><form className="erp-card erp-form-card" onSubmit={changePassword}><div className="erp-card-title"><KeyRound size={18} /><div><h2>Change password</h2><p>Use at least 10 characters. Your current password is required.</p></div></div>{error && <div className="erp-alert erp-alert-error">{error}</div>}{success && <div className="erp-alert erp-alert-success">{success}</div>}<label className="erp-form-field"><span>Current password</span><input className="erp-input" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></label><label className="erp-form-field"><span>New password</span><input className="erp-input" type="password" required minLength={10} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label><label className="erp-form-field"><span>Confirm new password</span><input className="erp-input" type="password" required minLength={10} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></label><button className="erp-button" disabled={saving}>{saving ? "Updating…" : "Update password"}</button></form></div></section>;
}

export default function PortalApp({ role }) {
  if (typeof window !== "undefined") window.__ERP_PORTAL_ROLE__ = role;
  const [user, setUser] = useState(null); const [checking, setChecking] = useState(true); const [loginError, setLoginError] = useState(""); const [activePage, setActivePage] = useState("dashboard"); const [mobileNav, setMobileNav] = useState(false);
  const meta = useMemo(() => ({ admin: { title: "Administration Portal", accent: "admin" }, faculty: { title: "Faculty Portal", accent: "faculty" }, student: { title: "Student Portal", accent: "student" } }[role]), [role]);
  const checkSession = useCallback(async () => {
    setChecking(true);
    try { const result = await api("/api/auth/me"); if (result.user?.role !== role) { await api("/api/auth/logout", { method: "POST" }).catch(() => {}); setUser(null); setLoginError(`This portal is for ${ROLE_LABEL[role].toLowerCase()} accounts. Please sign in with the correct account.`); } else { setUser(result.user); setLoginError(""); } }
    catch { setUser(null); }
    finally { setChecking(false); }
  }, [role]);
  useEffect(() => { checkSession(); }, [checkSession]);
  async function handleLogout() { await api("/api/auth/logout", { method: "POST" }).catch(() => {}); setUser(null); setActivePage("dashboard"); }
  const nav = NAVIGATION[role] || [];
  const activeLabel = activePage === "dashboard" ? "Dashboard" : activePage === "users" ? "User Management" : activePage === "imports" ? "Excel / Bulk Import" : activePage === "academics" ? "Academic Setup" : activePage === "approvals" ? "Approvals & Requests" : activePage === "mentor-admin" ? "Mentoring" : activePage === "hostel-admin" ? "Hostel Room Allotment" : activePage === "mentor" ? "Mentoring" : activePage === "student-noc" ? "Mentoring" : activePage === "reports" ? "Academic Reports" : activePage === "folders" ? "Automatic Data Filing" : activePage === "attendance" ? (role === "student" ? "My Attendance" : "Attendance Management") : activePage === "marks" ? (role === "student" ? "My CIA & Internal Marks" : "CIA & Internal Marks Entry") : activePage === "classes" ? "My Classes" : activePage === "events" ? "Events & Proposals" : activePage === "profile" ? "My Profile" : MODULES[activePage]?.label || activePage;

  if (checking) return <div className="erp-full-loading"><LoaderCircle className="erp-spin" /> Loading secure portal…</div>;
  if (!user) return <LoginScreen role={role} initialError={loginError} onLogin={(account) => { setUser(account); setLoginError(""); setActivePage("dashboard"); }} />;

  return <div className={`erp-app erp-${meta.accent}`}>
    <div className={`erp-sidebar-backdrop ${mobileNav ? "visible" : ""}`} onClick={() => setMobileNav(false)} />
    <aside className={`erp-sidebar ${mobileNav ? "open" : ""}`}>
      <div className="erp-sidebar-brand"><div className="erp-brand-mark"><GraduationCap size={23} /></div><div><strong>S-VYASA</strong><span>University ERP</span></div><button className="erp-mobile-close" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
      <div className="erp-sidebar-identity"><div className="erp-avatar erp-avatar-small">{user.name?.slice(0,1).toUpperCase()}</div><div><strong>{user.name}</strong><span>{ROLE_LABEL[role]}</span></div></div>
      <nav className="erp-navigation">{nav.map((group) => <div className="erp-nav-group" key={group.group}><div className="erp-nav-heading">{group.group}</div>{group.items.map((item) => { const Icon = ICONS[item.icon] || FileText; return <button className={`erp-nav-item ${activePage === item.id ? "active" : ""}`} key={item.id} onClick={() => { setActivePage(item.id); setMobileNav(false); }}><Icon size={17} /><span>{item.label}</span>{activePage === item.id && <span className="erp-nav-active-dot" />}</button>; })}</div>)}</nav>
      <div className="erp-sidebar-bottom"><div className="erp-security-note"><ShieldCheck size={15} /><span>Secure role-based access</span></div><button className="erp-nav-item" onClick={() => { setActivePage("profile"); setMobileNav(false); }}><Settings size={17} /><span>Profile & settings</span></button><button className="erp-nav-item erp-logout" onClick={handleLogout}><LogOut size={17} /><span>Sign out</span></button></div>
    </aside>
    <main className="erp-main"><header className="erp-topbar"><div className="erp-topbar-left"><button className="erp-menu-toggle" onClick={() => setMobileNav(true)}><Menu size={19} /></button><div><div className="erp-breadcrumb">S-VYASA <span>/</span> {meta.title}</div><strong>{activeLabel}</strong></div></div><div className="erp-topbar-right"><span className="erp-topbar-date">{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span><div className="erp-topbar-user"><div className="erp-avatar erp-avatar-top">{user.name?.slice(0,1).toUpperCase()}</div><div><strong>{user.name}</strong><span>{user.code}</span></div><button aria-label="Open profile" onClick={() => setActivePage("profile")}><ChevronDown size={15} /></button></div></div></header>
      <div className="erp-content">
        {activePage === "dashboard" && <Dashboard user={user} role={role} onNavigate={setActivePage} />}
        {activePage === "users" && role === "admin" && <AdminConsole section="users" />}
        {activePage === "imports" && (role === "admin" || role === "faculty") && <BulkImportCenter user={user} />}
        {activePage === "academics" && role === "admin" && <AdminConsole section="academics" />}
        {activePage === "approvals" && role === "admin" && <AdminConsole section="approvals" />}
        {activePage === "mentor-admin" && role === "admin" && <AdminMentorWorkspace />}
        {activePage === "hostel-admin" && role === "admin" && <HostelAdminWorkspace />}
        {activePage === "mentor" && role === "faculty" && <MentorWorkspace user={user} />}
        {activePage === "student-noc" && role === "student" && <StudentNocWorkspace user={user} />}
        {activePage === "reports" && (role === "admin" || role === "faculty") && <ReportsWorkspace user={user} />}
        {activePage === "folders" && role === "admin" && <AdminConsole section="folders" />}
        {activePage === "classes" && role === "faculty" && <MyClasses user={user} />}
        {(activePage === "attendance" || activePage === "marks") && <AcademicRecords module={activePage} user={user} />}
        {activePage === "events" && <EventWorkspace user={user} />}
        {activePage === "profile" && <ProfileSettings user={user} onLogout={handleLogout} />}
        {MODULES[activePage] && <ModuleWorkspace module={activePage} user={user} />}
      </div>
      <footer className="erp-footer"><span>© {new Date().getFullYear()} S-VYASA Deemed to be University</span><span>Student Enterprise Resource Planning System</span></footer>
    </main>
  </div>;
}
