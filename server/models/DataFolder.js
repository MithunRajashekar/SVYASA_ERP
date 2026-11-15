import mongoose from "mongoose";

// Logical folders are metadata records. MongoDB stores the actual ERP records
// in their normal collections; folderId links each record to its auto-filed path.
const dataFolderSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true, maxlength: 512 },
  module: { type: String, required: true, trim: true, maxlength: 80, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  path: { type: String, required: true, trim: true, maxlength: 1000, index: true },
  parentFolderId: { type: mongoose.Schema.Types.ObjectId, ref: "DataFolder", default: null },
}, { timestamps: true, collection: "datafolders" });

dataFolderSchema.index({ module: 1, parentFolderId: 1, name: 1 });

export const DataFolder = mongoose.models.DataFolder || mongoose.model("DataFolder", dataFolderSchema);
