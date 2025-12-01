// backend/models/userModel.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // Primary identity
    phoneNumber: { type: String, required: true, unique: true },

    // Customer info (filled ONCE)
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    email: { type: String, default: "" },
    tableNumber: { type: Number, default: 0 },

    // Optional role: user / admin
    role: { type: String, default: "user" },

    // Server-side cart
    cartData: { type: Object, default: {} },

    // OTP fields (for future)
    otpHash: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    otpAttemptCount: { type: Number, default: 0, select: false },
    otpLastSentAt: { type: Date, select: false },
    otpSessionId: { type: String, select: false },
  },
  { minimize: false, timestamps: true }
);

// Unique index for phoneNumber
userSchema.index({ phoneNumber: 1 }, { unique: true });

const userModel =
  mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;
