import { Router } from "express";
import { Event } from "../models/Event.js";
import { authenticate, requireRole, isObjectId, sendValidationError } from "../middleware/auth.js";
import { ensureDataFolder } from "../utils/autoFolders.js";

export const eventsRouter = Router();

const text = (value, max = 200) => String(value ?? "").trim().slice(0, max);
const numericCount = (value) => {
  const n = Number(value ?? 0);
  return Number.isInteger(n) && n >= 0 && n <= 100000 ? n : null;
};

const scopedFilter = (req) => {
  const filter = {};
  if (req.user.role === "student") filter.permissionStatus = "Granted";
  else if (req.user.role === "faculty") {
    filter.$or = [{ permissionStatus: "Granted" }, { createdBy: req.user.id }];
  }
  if (req.query.mine === "true" && req.user.role === "faculty") filter.createdBy = req.user.id;
  if (req.query.from || req.query.to) {
    filter.startsAt = {};
    if (req.query.from && !Number.isNaN(Date.parse(req.query.from))) filter.startsAt.$gte = new Date(req.query.from);
    if (req.query.to && !Number.isNaN(Date.parse(req.query.to))) filter.startsAt.$lte = new Date(req.query.to);
  }
  return filter;
};

eventsRouter.get("/events", authenticate, async (req, res) => {
  const events = await Event.find(scopedFilter(req)).sort({ startsAt: 1 }).lean();
  res.json({ success: true, events });
});

eventsRouter.post("/events", authenticate, requireRole("faculty", "admin"), async (req, res) => {
  const body = req.body || {};
  const startsAt = new Date(body.startsAt || body.startDate || body.date);
  const endsAt = body.endsAt || body.endDate ? new Date(body.endsAt || body.endDate) : null;
  const students = numericCount(body.students);
  const faculty = numericCount(body.faculty);
  if (!text(body.title, 160) || Number.isNaN(startsAt.getTime()) || (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt < startsAt))) {
    return sendValidationError(res, "A title and valid start/end dates are required.");
  }
  if (students === null || faculty === null) return sendValidationError(res, "Beneficiary counts must be whole numbers between 0 and 100000.");
  const department = req.user.role === "faculty" ? (req.user.department || "Faculty") : (text(body.department, 120) || "University");
  const category = text(body.category, 60) || "Academic";
  const folderId = await ensureDataFolder("Events", [String(startsAt.getFullYear()), department, category]);
  const event = await Event.create({
    folderId,
    title: text(body.title, 160),
    description: text(body.description, 3000),
    startsAt,
    endsAt,
    startTime: text(body.startTime, 5) || "09:00",
    endTime: text(body.endTime, 5) || "17:00",
    location: text(body.location, 200),
    department,
    category,
    eventType: body.eventType === "External" ? "External" : "In-House",
    students,
    faculty,
    objective: text(body.objective, 3000),
    brief: text(body.brief, 5000),
    resourceName: text(body.resourceName, 120),
    resourceDetails: text(body.resourceDetails, 1000),
    creatorName: text(body.creatorName, 120),
    creatorDesignation: text(body.creatorDesignation, 120),
    permissionStatus: req.user.role === "admin" ? "Granted" : "Pending",
    createdBy: req.user.id,
  });
  res.status(201).json({ success: true, event });
});

eventsRouter.post("/events/:id/approval", authenticate, requireRole("admin"), async (req, res) => {
  if (!isObjectId(req.params.id)) return sendValidationError(res, "Event ID is invalid.");
  const status = req.body?.status;
  if (!new Set(["Granted", "Rejected"]).has(status)) return sendValidationError(res, "Approval status must be Granted or Rejected.");
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found." });
  if (event.permissionStatus !== "Pending") return res.status(409).json({ error: "Only pending events can be reviewed." });
  event.permissionStatus = status;
  event.approvedBy = req.user.id;
  event.approvedAt = new Date();
  await event.save();
  res.json({ success: true, event });
});

eventsRouter.put("/events/:id", authenticate, requireRole("faculty", "admin"), async (req, res) => {
  if (!isObjectId(req.params.id)) return sendValidationError(res, "Event ID is invalid.");
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found." });
  if (req.user.role !== "admin" && (String(event.createdBy) !== req.user.id || event.permissionStatus !== "Pending")) {
    return res.status(403).json({ error: "You can edit only your own pending events." });
  }
  const body = req.body || {};
  const allowed = {
    title: (v) => text(v, 160), description: (v) => text(v, 3000), location: (v) => text(v, 200),
    department: (v) => text(v, 120), category: (v) => text(v, 60), eventType: (v) => v === "External" ? "External" : "In-House",
    startTime: (v) => text(v, 5), endTime: (v) => text(v, 5), objective: (v) => text(v, 3000),
    brief: (v) => text(v, 5000), resourceName: (v) => text(v, 120), resourceDetails: (v) => text(v, 1000),
    creatorName: (v) => text(v, 120), creatorDesignation: (v) => text(v, 120),
  };
  for (const [key, clean] of Object.entries(allowed)) if (Object.hasOwn(body, key)) event[key] = clean(body[key]);
  for (const key of ["startsAt", "startDate"]) if (Object.hasOwn(body, key)) {
    const value = new Date(body[key]);
    if (Number.isNaN(value.getTime())) return sendValidationError(res, "Start date is invalid.");
    event.startsAt = value;
  }
  for (const key of ["endsAt", "endDate"]) if (Object.hasOwn(body, key)) {
    const value = body[key] ? new Date(body[key]) : null;
    if (value && Number.isNaN(value.getTime())) return sendValidationError(res, "End date is invalid.");
    event.endsAt = value;
  }
  for (const key of ["students", "faculty"]) if (Object.hasOwn(body, key)) {
    const count = numericCount(body[key]);
    if (count === null) return sendValidationError(res, `${key} count is invalid.`);
    event[key] = count;
  }
  if (event.endsAt && event.endsAt < event.startsAt) return sendValidationError(res, "End date cannot precede start date.");
  event.folderId = await ensureDataFolder("Events", [String(new Date(event.startsAt).getFullYear()), event.department || "University", event.category || "Academic"]);
  await event.save();
  res.json({ success: true, event });
});

eventsRouter.delete("/events/:id", authenticate, requireRole("faculty", "admin"), async (req, res) => {
  if (!isObjectId(req.params.id)) return sendValidationError(res, "Event ID is invalid.");
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ error: "Event not found." });
  if (req.user.role !== "admin" && (String(event.createdBy) !== req.user.id || event.permissionStatus !== "Pending")) {
    return res.status(403).json({ error: "You can delete only your own pending events." });
  }
  await event.deleteOne();
  res.json({ success: true });
});
