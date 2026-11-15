import mongoose from "mongoose";

const attendanceDocumentSchema = new mongoose.Schema({
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: "DataFolder", default: null, index: true },
  attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: "Attendance", required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "ClassSection", required: true, index: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  uploadedByRole: { type: String, enum: ["student", "faculty", "admin"], required: true },
  documentType: { type: String, enum: ["sick-certificate", "od-letter"], required: true },
  originalName: { type: String, required: true, trim: true, maxlength: 180 },
  mimeType: { type: String, enum: ["application/pdf", "image/jpeg", "image/png"], required: true },
  size: { type: Number, required: true, min: 1, max: 5 * 1024 * 1024 },
  content: { type: Buffer, required: true, select: false },
  note: { type: String, trim: true, default: "", maxlength: 500 },
  reviewStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedByRole: { type: String, enum: ["faculty", "admin"], default: null },
  reviewedAt: { type: Date, default: null },
  reviewRemarks: { type: String, trim: true, default: "", maxlength: 500 },
}, { timestamps: true, collection: "attendancedocuments" });

attendanceDocumentSchema.index({ attendanceId: 1, createdAt: -1 });
attendanceDocumentSchema.index({ studentId: 1, reviewStatus: 1, createdAt: -1 });

export const AttendanceDocument = mongoose.models.AttendanceDocument || mongoose.model("AttendanceDocument", attendanceDocumentSchema);
