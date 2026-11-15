import mongoose from "mongoose";

const importBatchSchema = new mongoose.Schema({
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  role: { type: String, enum: ["admin", "faculty"], required: true },
  importType: { type: String, required: true, trim: true, maxlength: 40, index: true },
  fileName: { type: String, trim: true, default: "", maxlength: 255 },
  totalRows: { type: Number, required: true, min: 0 },
  created: { type: Number, default: 0, min: 0 },
  updated: { type: Number, default: 0, min: 0 },
  skipped: { type: Number, default: 0, min: 0 },
  failed: { type: Number, default: 0, min: 0 },
  errorSummary: [{ rowNumber: Number, error: { type: String, maxlength: 500 } }],
  context: { type: mongoose.Schema.Types.Mixed, default: {} },
  completedAt: { type: Date, default: Date.now },
}, { timestamps: true, collection: "importbatches" });

importBatchSchema.index({ uploadedBy: 1, createdAt: -1 });
importBatchSchema.index({ importType: 1, createdAt: -1 });

export const ImportBatch = mongoose.models.ImportBatch || mongoose.model("ImportBatch", importBatchSchema);
