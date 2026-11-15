import mongoose from "mongoose";

const facultyAssignmentSchema = new mongoose.Schema({
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: "DataFolder", default: null, index: true },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "ClassSection", required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  slot: { type: String, trim: true, default: "", maxlength: 40 },
}, { timestamps: true, collection: "facultyassignments" });

facultyAssignmentSchema.index({ facultyId: 1, classId: 1, subjectId: 1 }, { unique: true });
export const FacultyAssignment = mongoose.models.FacultyAssignment || mongoose.model("FacultyAssignment", facultyAssignmentSchema);
