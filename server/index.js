import "./config/env.js";
import express from "express";
import cors from "cors";
import { cookieParser } from "./middleware/cookies.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import { rateLimit } from "./middleware/rateLimit.js";
import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { connectDb } from "./db.js";
import { bootstrapFirstAdministrator } from "./bootstrap.js";
import { assertRuntimeConfig, authenticate, requireRole, safeUser } from "./middleware/auth.js";
import { User } from "./models/User.js";
import { authRouter } from "./routes/auth.js";
import { studentRouter } from "./routes/student.js";
import { facultyRouter } from "./routes/faculty.js";
import { classesRouter } from "./routes/classes.js";
import { attendanceRouter } from "./routes/attendance.js";
import { marksRouter } from "./routes/marks.js";
import { eventsRouter } from "./routes/events.js";
import { adminRouter } from "./routes/admin.js";
import { workspaceRouter } from "./routes/workspace.js";
import { portalRouter } from "./routes/portal.js";
import { importsRouter } from "./routes/imports.js";
import { mentorRouter } from "./routes/mentor.js";
import { reportsRouter } from "./routes/reports.js";

const allowedOrigins = new Set(
  (process.env.FRONTEND_ORIGINS || [5173, 5174, 5175].flatMap((port) => [`http://localhost:${port}`, `http://127.0.0.1:${port}`]).join(","))
    .split(",").map((origin) => origin.trim()).filter(Boolean)
);

function isPrivateIpv4(hostname) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 10 || parts[0] === 127 ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31);
}

function isAllowedOrigin(origin) {
  if (allowedOrigins.has(origin)) return true;
  if (process.env.NODE_ENV === "production") return false;
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:") return false;
    const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || isPrivateIpv4(host);
  } catch {
    return false;
  }
}

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.use((req, res, next) => {
    const origin = req.get("origin");
    if (origin && !isAllowedOrigin(origin)) {
      return res.status(403).json({ error: "Request origin is not allowed." });
    }
    return next();
  });
  app.use(cors({
    origin(origin, callback) {
      return callback(null, !origin || isAllowedOrigin(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-ERP-Portal-Role"],
    maxAge: 600,
  }));
  app.use(express.json({ limit: "8mb", strict: true }));
  app.use(express.urlencoded({ extended: false, limit: "50kb" }));
  app.use(cookieParser);
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, message: "Too many requests. Try again later." }));

  app.get("/api/health", (_req, res) => res.json({
    ok: true,
    service: "svyasa-erp-api",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  }));

  app.use("/api/auth", authRouter);
  app.use("/api/student", studentRouter);
  app.use("/api", authenticate, facultyRouter);
  app.use("/api", authenticate, classesRouter);
  app.use("/api", authenticate, attendanceRouter);
  app.use("/api", authenticate, marksRouter);
  app.use("/api", eventsRouter);
  app.use("/api", adminRouter);
  app.use("/api", workspaceRouter);
  app.use("/api", portalRouter);
  app.use("/api", importsRouter);
  app.use("/api", mentorRouter);
  app.use("/api", reportsRouter);

  app.get("/api/faculty-data", authenticate, requireRole("faculty", "admin"), async (req, res) => {
    if (req.user.role === "faculty") return res.json({ users: [req.user] });
    const faculty = await User.find({ role: "faculty", isActive: true }).sort({ name: 1 }).lean();
    return res.json({ users: faculty.map(safeUser) });
  });

  app.use((_req, res) => res.status(404).json({ error: "Route not found." }));
  app.use((error, _req, res, _next) => {
    const status = error.status || (error.name === "ValidationError" || error.name === "CastError" ? 400 : error.code === 11000 ? 409 : 500);
    if (status >= 500) console.error("API error:", error.message);
    if (status === 409) return res.status(409).json({ error: "A record with the same unique value already exists." });
    if (status === 400 && error.name === "ValidationError") return res.status(400).json({ error: "Validation failed.", details: Object.values(error.errors || {}).map((item) => item.message) });
    return res.status(status).json({ error: status >= 500 ? "An unexpected server error occurred." : error.message || "Request failed." });
  });

  return app;
}

export async function startServer() {
  assertRuntimeConfig();
  await connectDb();
  const bootstrapCredentials = await bootstrapFirstAdministrator();
  if (bootstrapCredentials) {
    console.log("\nFIRST-RUN ADMINISTRATOR CREATED");
    console.log(`Login ID: ${bootstrapCredentials.userId}`);
    console.log(`Temporary password: ${bootstrapCredentials.temporaryPassword}`);
    console.log("Save this password now. After signing in, change it with POST /api/auth/change-password.\n");
  }
  const port = Number(process.env.PORT || 4000);
  const app = createApp();
  return app.listen(port, () => console.log(`S-VYASA ERP API listening on port ${port}`));
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  startServer().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
