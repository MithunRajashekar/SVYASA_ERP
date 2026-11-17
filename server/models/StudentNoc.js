import mongoose from "mongoose";

const studentNocSchema = new mongoose.Schema({
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: "DataFolder", default: null, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  mentorAssignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "MentorAssignment", required: true },
  academicYear: { type: String, required: true, trim: true, maxlength: 20 },
  purpose: { type: String, required: true, trim: true, maxlength: 180 },
  details: { type: String, trim: true, default: "", maxlength: 3000 },
  status: { type: String, enum: ["pending", "issued", "rejected", "withdrawn"], default: "pending", index: true },
  requestedAt: { type: Date, default: Date.now },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedByRole: { type: String, enum: ["faculty", "admin"], default: null },
  reviewedAt: { type: Date, default: null },
  reviewRemarks: { type: String, trim: true, default: "", maxlength: 1000 },
  nocNumber: { type: String, trim: true, uppercase: true, maxlength: 40 },
  issuedAt: { type: Date, default: null },
}, { timestamps: true, collection: "studentnocs" });

studentNocSchema.index({ studentId: 1, createdAt: -1 });
studentNocSchema.index({ mentorId: 1, status: 1, createdAt: -1 });
studentNocSchema.index({ nocNumber: 1 }, { unique: true, sparse: true });

export const StudentNoc = mongoose.models.StudentNoc || mongoose.model("StudentNoc", studentNocSchema);
