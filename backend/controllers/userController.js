// backend/controllers/userController.js
// ==========================================================
// USER CONTROLLER – FINAL VERSION (NEW WORKFLOW)
// ==========================================================
// OTP login → JWT → user fills info ONCE → auto-used for all orders
// ==========================================================

import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

/* ============================================================
   1) LOGIN / SIGNUP USING PHONE NUMBER
   (OTP is already verified on the frontend)
============================================================ */
export const loginWithPhone = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber || !phoneNumber.startsWith("+")) {
      return res.json({
        success: false,
        message: "Phone number must be in international format (+91...).",
      });
    }

    // Find or create user
    let user = await userModel.findOne({ phoneNumber });

    if (!user) {
      user = await userModel.create({
        phoneNumber,
        firstName: "",
        lastName: "",
        email: "",
        tableNumber: 0,
        role: "user",
      });
    }

    const token = signToken(user._id);

    return res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        tableNumber: user.tableNumber,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("loginWithPhone error:", err);
    return res.json({
      success: false,
      message: "Login failed",
    });
  }
};

/* ============================================================
   2) GET PROFILE (FETCH AFTER LOGIN)
============================================================ */
export const getProfile = async (req, res) => {
  try {
    const user = req.user;

    return res.json({
      success: true,
      user: {
        _id: user._id,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        tableNumber: user.tableNumber,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("getProfile error:", err);
    return res.json({ success: false, message: "Failed to load profile" });
  }
};

/* ============================================================
   3) UPDATE PROFILE (FIRST ORDER ONLY)
   - Called when a user fills customer info the 1st time
   - Stores name, email, and table number permanently
============================================================ */
export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, tableNumber } = req.body;

    const update = {
      firstName: firstName?.trim() || "",
      lastName: lastName?.trim() || "",
      email: email?.trim() || "",
      tableNumber: Number(tableNumber || 0),
    };

    const updatedUser = await userModel
      .findByIdAndUpdate(req.userId, update, { new: true })
      .lean();

    return res.json({
      success: true,
      user: updatedUser,
      message: "Profile updated",
    });
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

/* ============================================================
   4) TEST ROUTE
============================================================ */
export const me = async (req, res) => {
  try {
    return res.json({
      success: true,
      message: "User authenticated",
      user: req.user,
    });
  } catch (err) {
    console.error("me error:", err);
    return res.json({ success: false, message: "Failed" });
  }
};
