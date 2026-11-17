import mongoose from "mongoose";

const hostelAllotmentSchema = new mongoose.Schema({
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: "DataFolder", default: null, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "HostelRoom", required: true, index: true },
  bedNumber: { type: Number, required: true, min: 1, max: 100 },
  academicYear: { type: String, required: true, trim: true, maxlength: 20 },
  status: { type: String, enum: ["active", "released"], default: "active", index: true },
  allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  allocatedAt: { type: Date, default: Date.now },
  releasedAt: { type: Date, default: null },
  notes: { type: String, trim: true, default: "", maxlength: 500 },
}, { timestamps: true, collection: "hostelallotments" });

hostelAllotmentSchema.index({ studentId: 1, academicYear: 1 }, { unique: true, partialFilterExpression: { status: "active" } });
hostelAllotmentSchema.index({ roomId: 1, bedNumber: 1 }, { unique: true, partialFilterExpression: { status: "active" } });

export const HostelAllotment = mongoose.models.HostelAllotment || mongoose.model("HostelAllotment", hostelAllotmentSchema);
