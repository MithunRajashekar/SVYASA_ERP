import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: "DataFolder", default: null, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, default: "", maxlength: 3000 },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, default: null },
  startTime: { type: String, trim: true, default: "09:00", maxlength: 5 },
  endTime: { type: String, trim: true, default: "17:00", maxlength: 5 },
  location: { type: String, trim: true, default: "", maxlength: 200 },
  department: { type: String, trim: true, default: "", maxlength: 120 },
  category: { type: String, trim: true, default: "Academic", maxlength: 60 },
  eventType: { type: String, enum: ["In-House", "External"], default: "In-House" },
  students: { type: Number, min: 0, max: 100000, default: 0 },
  faculty: { type: Number, min: 0, max: 100000, default: 0 },
  objective: { type: String, trim: true, default: "", maxlength: 3000 },
  brief: { type: String, trim: true, default: "", maxlength: 5000 },
  resourceName: { type: String, trim: true, default: "", maxlength: 120 },
  resourceDetails: { type: String, trim: true, default: "", maxlength: 1000 },
  creatorName: { type: String, trim: true, default: "", maxlength: 120 },
  creatorDesignation: { type: String, trim: true, default: "", maxlength: 120 },
  permissionStatus: { type: String, enum: ["Pending", "Granted", "Rejected"], default: "Pending", index: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  approvedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
}, { timestamps: true, collection: "events" });

eventSchema.index({ startsAt: 1, permissionStatus: 1 });
export const Event = mongoose.models.Event || mongoose.model("Event", eventSchema);
