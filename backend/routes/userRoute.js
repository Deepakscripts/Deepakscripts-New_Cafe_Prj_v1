import express from "express";
import authMiddleware from "../middleware/auth.js";   // ⭐ IMPORTANT
import { loginWithPhone, getProfile, updateProfile, me } 
  from "../controllers/userController.js";

const router = express.Router();

router.post("/login", loginWithPhone);
router.get("/me", authMiddleware, getProfile);

// ⭐ PROFILE UPDATE ROUTE (needed for PlaceOrder.jsx)
router.post("/update-profile", authMiddleware, updateProfile);

router.get("/verify", authMiddleware, me);

export default router;
