import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema({
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: "DataFolder", default: null, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "ClassSection", required: true },
}, { timestamps: true, collection: "enrollments" });

enrollmentSchema.index({ studentId: 1, classId: 1 }, { unique: true });
export const Enrollment = mongoose.models.Enrollment || mongoose.model("Enrollment", enrollmentSchema);
