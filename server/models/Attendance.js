import mongoose from "mongoose";

const STATUSES = ["present", "absent", "late"];
const attendanceSchema = new mongoose.Schema({
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: "DataFolder", default: null, index: true },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "ClassSection", required: true },
  date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"] },
  status: { type: String, enum: STATUSES, required: true },
  remarks: { type: String, trim: true, default: "", maxlength: 500 },
}, { timestamps: true, collection: "attendances" });

attendanceSchema.index({ studentId: 1, subjectId: 1, classId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ facultyId: 1, classId: 1, subjectId: 1, date: 1 });

export const ATTENDANCE_STATUSES = STATUSES;
export const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);
