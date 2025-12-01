// backend/middleware/authMiddleware.js
// =============================================================
// CLEAN, STRICT AUTH MIDDLEWARE (NEW WORKFLOW)
//
// - Only logged-in users can access protected routes
// - No guests, no sessionId fallback
// - Extracts token strictly from Authorization / token header
// - Verifies JWT → fetches user → attaches req.user & req.userId
// =============================================================

import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("❌ ERROR: Missing JWT_SECRET in backend/.env");
  process.exit(1);
}

export default async function authMiddleware(req, res, next) {
  try {
    let token = "";

    // Prioritize Bearer tokens
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.headers.token) {
      token = req.headers.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Decode token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const userId = decoded?.id || decoded?._id || decoded?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    // Fetch actual user record
    const user = await userModel.findById(userId).lean();
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Attach user info for downstream controllers
    req.user = user;
    req.userId = String(user._id);
    req.userRole = user.role || "user";

    return next();
  } catch (err) {
    console.error("authMiddleware error:", err);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
}
