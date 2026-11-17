import mongoose from "mongoose";

const hostelRoomSchema = new mongoose.Schema({
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: "DataFolder", default: null, index: true },
  hostelName: { type: String, required: true, trim: true, maxlength: 120 },
  block: { type: String, trim: true, default: "", maxlength: 60 },
  floor: { type: String, trim: true, default: "", maxlength: 30 },
  roomNumber: { type: String, required: true, trim: true, maxlength: 30 },
  roomType: { type: String, enum: ["single", "double", "triple", "dormitory", "other"], default: "double" },
  capacity: { type: Number, required: true, min: 1, max: 100 },
  isActive: { type: Boolean, default: true, index: true },
  notes: { type: String, trim: true, default: "", maxlength: 500 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true, collection: "hostelrooms" });

hostelRoomSchema.index({ hostelName: 1, block: 1, roomNumber: 1 }, { unique: true });

export const HostelRoom = mongoose.models.HostelRoom || mongoose.model("HostelRoom", hostelRoomSchema);
