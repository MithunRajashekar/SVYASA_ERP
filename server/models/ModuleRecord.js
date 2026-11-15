import mongoose from "mongoose";

const MODULE_KEYS = [
  "class-timetable", "exam-timetable", "lesson-plans", "assessment", "assignments",
  "assignment-submissions", "mentoring", "mentoring-requests", "academic-calendar", "notices",
  "fees", "fee-queries", "library-books", "library-requests", "hostel-requests", "placements",
  "placement-applications", "internships", "internship-applications", "soft-skills",
  "soft-skill-enrollments", "student-requests",
];

const moduleRecordSchema = new mongoose.Schema({
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: "DataFolder", default: null, index: true },
  module: { type: String, enum: MODULE_KEYS, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, trim: true, default: "", maxlength: 6000 },
  status: { type: String, enum: ["Draft", "Submitted", "Pending", "Published", "Approved", "Rejected", "Open", "Active", "Completed", "Closed", "Paid", "Overdue", "Reviewed"], default: "Draft", index: true },
  visibility: { type: String, enum: ["private", "department", "class", "university"], default: "private", index: true },
  department: { type: String, trim: true, default: "", maxlength: 120, index: true },
  program: { type: String, trim: true, default: "", maxlength: 120 },
  semester: { type: Number, min: 1, max: 12, default: null },
  section: { type: String, trim: true, default: "", maxlength: 20 },
  academicYear: { type: String, trim: true, default: "", maxlength: 20 },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "ClassSection", default: null, index: true },
  subjectCode: { type: String, trim: true, uppercase: true, default: "", maxlength: 40 },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  dueAt: { type: Date, default: null },
  fields: { type: mongoose.Schema.Types.Mixed, default: {} },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true, collection: "modulerecords", minimize: false });

moduleRecordSchema.index({ module: 1, status: 1, department: 1, semester: 1, section: 1 });
moduleRecordSchema.index({ module: 1, ownerId: 1, createdAt: -1 });
moduleRecordSchema.index({ module: 1, targetUserId: 1, createdAt: -1 });

export const MODULE_RECORD_KEYS = MODULE_KEYS;
export const ModuleRecord = mongoose.models.ModuleRecord || mongoose.model("ModuleRecord", moduleRecordSchema);
