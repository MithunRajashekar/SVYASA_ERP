import crypto from "node:crypto";
import { clearCookie, setCookie } from "./cookies.js";
import { User } from "../models/User.js";

export const AUTH_COOKIE_NAME = "erp_session";
export const AUTH_COOKIE_NAMES = Object.freeze({
  admin: "svyasa_admin_session",
  faculty: "svyasa_faculty_session",
  student: "svyasa_student_session",
});

export function assertRuntimeConfig() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing. Add it to the project-root .env file.");
  }
  if (!/^mongodb(?:\+srv)?:\/\//i.test(process.env.DATABASE_URL)) {
    throw new Error("DATABASE_URL must use mongodb:// or mongodb+srv://.");
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET is missing or too short. Use a random secret of at least 32 characters.");
  }
}

function durationSeconds(value = "1h") {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(1, value);
  const match = String(value).match(/^(\d+)(s|m|h|d)?$/i);
  if (!match) return 3600;
  const amount = Number(match[1]);
  const unit = (match[2] || "s").toLowerCase();
  return amount * ({ s: 1, m: 60, h: 3600, d: 86400 }[unit] || 1);
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

export function signSession(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    sub: String(user._id),
    iss: "svyasa-erp",
    aud: "svyasa-erp-users",
    iat: now,
    exp: now + durationSeconds(process.env.JWT_EXPIRES_IN || "1h"),
  }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createHmac("sha256", process.env.JWT_SECRET).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

function verifySession(token) {
  if (typeof token !== "string" || token.length > 4096) throw new Error("Malformed token.");
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) throw new Error("Malformed token.");
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  if (!header || header.alg !== "HS256" || header.typ !== "JWT") throw new Error("Unsupported token algorithm.");
  const expected = crypto.createHmac("sha256", process.env.JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest();
  const supplied = Buffer.from(parts[2], "base64url");
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) throw new Error("Invalid signature.");
  const now = Math.floor(Date.now() / 1000);
  if (!payload || typeof payload !== "object" || !payload.sub || payload.iss !== "svyasa-erp" || payload.aud !== "svyasa-erp-users" || !Number.isFinite(payload.iat) || !Number.isFinite(payload.exp) || payload.exp <= payload.iat || payload.exp - payload.iat > 7 * 86400 || now >= payload.exp || (payload.nbf !== undefined && (!Number.isFinite(payload.nbf) || now < payload.nbf))) {
    throw new Error("Token is invalid or expired.");
  }
  return payload;
}

export async function authenticate(req, res, next) {
  try {
    const header = req.get("authorization") || "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    const portalRole = req.get("x-erp-portal-role");
    const selectedCookie = AUTH_COOKIE_NAMES[portalRole] ? req.cookies?.[AUTH_COOKIE_NAMES[portalRole]] : null;
    const roleCookie = Object.values(AUTH_COOKIE_NAMES).map((name) => req.cookies?.[name]).find(Boolean);
    const token = bearer || (AUTH_COOKIE_NAMES[portalRole] ? selectedCookie : (roleCookie || req.cookies?.[AUTH_COOKIE_NAME]));
    if (!token) return res.status(401).json({ error: "Authentication required." });

    let claims;
    try {
      claims = verifySession(token);
    } catch {
      return res.status(401).json({ error: "Session is invalid or expired. Please sign in again." });
    }

    if (!claims?.sub) return res.status(401).json({ error: "Session is invalid." });
    const user = await User.findById(claims.sub).select("-passwordHash").lean();
    if (!user || !user.isActive) return res.status(401).json({ error: "Account is unavailable." });
    if (portalRole && AUTH_COOKIE_NAMES[portalRole] && user.role !== portalRole) {
      return res.status(403).json({ error: "This account does not belong to the selected portal." });
    }

    req.user = {
      id: String(user._id),
      code: user.code,
      student_id: user.student_id || user.code,
      usn: user.usn || "",
      name: user.name,
      email: user.email || "",
      role: user.role,
      department: user.department || "",
      program: user.program || "",
      semester: user.semester ?? null,
      section: user.section || "",
      isActive: user.isActive !== false,
      createdAt: user.createdAt || null,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required." });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "You do not have permission to perform this action." });
    next();
  };
}

export function setSessionCookie(res, token, role = "") {
  const cookieName = AUTH_COOKIE_NAMES[role] || AUTH_COOKIE_NAME;
  setCookie(res, cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: durationSeconds(process.env.JWT_EXPIRES_IN || "1h"),
  });
}

export function clearSessionCookie(res, role = "") {
  const names = AUTH_COOKIE_NAMES[role] ? [AUTH_COOKIE_NAMES[role]] : [...Object.values(AUTH_COOKIE_NAMES), AUTH_COOKIE_NAME];
  for (const cookieName of names) {
    clearCookie(res, cookieName, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
    });
  }
}

export function isObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ""));
}

export function sendValidationError(res, message, details) {
  return res.status(400).json({ error: message, ...(details ? { details } : {}) });
}

export function safeUser(user) {
  const id = String(user._id || user.id);
  return {
    id,
    userId: id,
    code: user.code,
    student_id: user.student_id || (user.role === "student" ? user.code : ""),
    name: user.name,
    role: user.role,
    usn: user.usn || "",
    email: user.email || "",
    phone: user.phone || "",
    department: user.department || "",
    semester: user.semester ?? null,
    section: user.section || "",
    program: user.program || "",
    personalDetails: user.personalDetails ? { ...user.personalDetails } : {},
    isActive: user.isActive !== false,
    createdAt: user.createdAt || null,
  };
}
