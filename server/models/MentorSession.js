import mongoose from "mongoose";

const actionItemSchema = new mongoose.Schema({
  task: { type: String, required: true, trim: true, maxlength: 500 },
  dueDate: { type: Date, default: null },
  status: { type: String, enum: ["open", "in-progress", "completed", "cancelled"], default: "open" },
  completedAt: { type: Date, default: null },
}, { _id: true });

const mentorSessionSchema = new mongoose.Schema({
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: "DataFolder", default: null, index: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  mentorAssignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "MentorAssignment", required: true, index: true },
  academicYear: { type: String, required: true, trim: true, maxlength: 20, index: true },
  agenda: { type: String, required: true, trim: true, maxlength: 1500 },
  sessionAt: { type: Date, required: true, index: true },
  durationMinutes: { type: Number, min: 5, max: 480, default: 30 },
  mode: { type: String, enum: ["in-person", "online", "phone"], default: "in-person" },
  locationOrLink: { type: String, trim: true, default: "", maxlength: 500 },
  status: { type: String, enum: ["scheduled", "completed", "cancelled"], default: "scheduled", index: true },
  mentorNotes: { type: String, trim: true, default: "", maxlength: 5000 },
  studentSummary: { type: String, trim: true, default: "", maxlength: 2000 },
  actionItems: { type: [actionItemSchema], default: [] },
  followUpDate: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, collection: "mentorsessions", minimize: false });

mentorSessionSchema.index({ mentorId: 1, studentId: 1, sessionAt: -1 });
mentorSessionSchema.index({ studentId: 1, sessionAt: -1 });

export const MentorSession = mongoose.models.MentorSession || mongoose.model("MentorSession", mentorSessionSchema);
