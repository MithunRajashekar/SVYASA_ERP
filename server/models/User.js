import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: "DataFolder", default: null, index: true },
  code: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 64 },
  student_id: { type: String, trim: true, uppercase: true, maxlength: 64, default: "" },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  role: { type: String, enum: ["admin", "faculty", "student"], required: true, index: true },
  usn: { type: String, trim: true, uppercase: true, default: "", maxlength: 64 },
  email: { type: String, trim: true, lowercase: true, default: "", maxlength: 254 },
  phone: { type: String, trim: true, default: "", maxlength: 30 },
  department: { type: String, trim: true, default: "", maxlength: 120 },
  semester: { type: Number, min: 1, max: 12, default: null },
  section: { type: String, trim: true, default: "", maxlength: 20 },
  program: { type: String, trim: true, default: "", maxlength: 120 },
  passwordHash: { type: String, required: true, select: false },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true, toJSON: { transform: (_doc, ret) => { delete ret.passwordHash; delete ret.__v; return ret; } } });

userSchema.index({ role: 1, code: 1 });
userSchema.index({ usn: 1 }, { sparse: true });
userSchema.index({ email: 1 }, { sparse: true });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
