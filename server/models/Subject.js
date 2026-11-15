import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: "DataFolder", default: null, index: true },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  department: { type: String, trim: true, default: "", maxlength: 120 },
  semester: { type: Number, min: 1, max: 12, default: null },
  section: { type: String, trim: true, default: "", maxlength: 20 },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, collection: "subjects" });

subjectSchema.index({ code: 1 }, { unique: true });
subjectSchema.index({ department: 1, semester: 1, section: 1 });

export const Subject = mongoose.models.Subject || mongoose.model("Subject", subjectSchema);
