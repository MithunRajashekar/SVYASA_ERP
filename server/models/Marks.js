import mongoose from "mongoose";

const marksSchema = new mongoose.Schema({
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: "DataFolder", default: null, index: true },
  student_id: { type: String, required: true, trim: true, uppercase: true },
  subject_code: { type: String, required: true, trim: true, uppercase: true },
  cia1: { type: Number, default: null, min: 0, max: 100 },
  cia2: { type: Number, default: null, min: 0, max: 100 },
  cia3: { type: Number, default: null, min: 0, max: 100 },
  // CIA 4 and CIA 5 are retained only for legacy-record compatibility. New
  // entry screens and calculations use exactly three CIAs and two Internals.
  cia4: { type: Number, default: null, min: 0, max: 100, select: false },
  cia5: { type: Number, default: null, min: 0, max: 100, select: false },
  internal1: { type: Number, default: null, min: 0, max: 100 },
  internal2: { type: Number, default: null, min: 0, max: 100 },
  ciaTotal: { type: Number, default: null },
  ciaAverage: { type: Number, default: null },
  ciaCount: { type: Number, default: 0 },
  internalTotal: { type: Number, default: null },
  internalAverage: { type: Number, default: null },
  internalCount: { type: Number, default: 0 },
  total: { type: Number, default: null },
  average: { type: Number, default: null },
  assessmentCount: { type: Number, default: 0 },
}, { timestamps: true, collection: "marks" });

marksSchema.index({ student_id: 1, subject_code: 1 }, { unique: true });
export const Marks = mongoose.models.Marks || mongoose.model("Marks", marksSchema);
