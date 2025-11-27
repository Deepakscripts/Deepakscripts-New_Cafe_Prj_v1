// backend/middleware/auth.js
// Global authentication middleware
// Ensures req.userId is always available for logged-in users

import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("❌ ERROR: JWT_SECRET missing in backend/.env");
  process.exit(1);
}

export default async function authMiddleware(req, res, next) {
  try {
    // Accept token from multiple sources
    let token =
      req.headers?.token ||
      req.headers?.authorization ||
      req.query?.token ||
      "";

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Handle "Bearer <token>"
    if (String(token).startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // Extract userId from JWT payload
    const userId = decoded?.id || decoded?._id || decoded?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    // Try fetching user from DB for convenience
    let userDoc = null;
    try {
      userDoc = await userModel.findById(userId).lean();
    } catch (err) {
      console.warn("⚠️ authMiddleware DB user fetch failed:", err.message);
    }

    if (!userDoc) {
      return res.status(401).json({
        success: false,
        message: "User does not exist",
      });
    }

    // Attach user details on request for downstream routes
    req.user = userDoc;
    req.userId = String(userDoc._id);
    req.userRole = userDoc.role || "user"; // supports future admin roles

    return next();
  } catch (err) {
    console.error("authMiddleware error:", err);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
}
