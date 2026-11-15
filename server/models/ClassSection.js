import mongoose from "mongoose";

const classSectionSchema = new mongoose.Schema({
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: "DataFolder", default: null, index: true },
  department: { type: String, required: true, trim: true, maxlength: 120 },
  semester: { type: Number, required: true, min: 1, max: 12 },
  academicYear: { type: String, required: true, trim: true, maxlength: 20 },
  section: { type: String, required: true, trim: true, maxlength: 20 },
  name: { type: String, required: true, trim: true, maxlength: 120 },
}, { timestamps: true, collection: "classsections" });

classSectionSchema.index({ department: 1, semester: 1, section: 1, academicYear: 1 }, { unique: true, name: "department_1_semester_1_section_1_academicYear_1" });
export const ClassSection = mongoose.models.ClassSection || mongoose.model("ClassSection", classSectionSchema);
