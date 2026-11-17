import mongoose from "mongoose";

const studentCertificateSchema = new mongoose.Schema({
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: "DataFolder", default: null, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  mentorAssignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "MentorAssignment", default: null, index: true },
  academicYear: { type: String, trim: true, default: "", maxlength: 20 },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  category: { type: String, enum: ["academic", "achievement", "workshop", "internship", "participation", "sports", "cultural", "other"], default: "other" },
  issuer: { type: String, trim: true, default: "", maxlength: 180 },
  issueDate: { type: Date, default: null },
  description: { type: String, trim: true, default: "", maxlength: 2000 },
  originalName: { type: String, required: true, trim: true, maxlength: 180 },
  mimeType: { type: String, enum: ["application/pdf", "image/jpeg", "image/png"], required: true },
  size: { type: Number, required: true, min: 1, max: 5 * 1024 * 1024 },
  content: { type: Buffer, required: true, select: false },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  uploadedByRole: { type: String, enum: ["student", "faculty", "admin"], required: true },
  reviewStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedByRole: { type: String, enum: ["faculty", "admin"], default: null },
  reviewedAt: { type: Date, default: null },
  reviewRemarks: { type: String, trim: true, default: "", maxlength: 1000 },
}, { timestamps: true, collection: "studentcertificates" });

studentCertificateSchema.index({ studentId: 1, issueDate: -1, createdAt: -1 });
studentCertificateSchema.index({ mentorId: 1, reviewStatus: 1, createdAt: -1 });

export const StudentCertificate = mongoose.models.StudentCertificate || mongoose.model("StudentCertificate", studentCertificateSchema);
