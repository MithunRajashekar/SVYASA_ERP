import mongoose from "mongoose";

const mentorAssignmentSchema = new mongoose.Schema({
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: "DataFolder", default: null, index: true },
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  academicYear: { type: String, required: true, trim: true, maxlength: 20 },
  status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  notes: { type: String, trim: true, default: "", maxlength: 500 },
}, { timestamps: true, collection: "mentorassignments" });

mentorAssignmentSchema.index({ studentId: 1, academicYear: 1 }, { unique: true });
mentorAssignmentSchema.index({ mentorId: 1, status: 1, academicYear: 1 });

export const MentorAssignment = mongoose.models.MentorAssignment || mongoose.model("MentorAssignment", mentorAssignmentSchema);
