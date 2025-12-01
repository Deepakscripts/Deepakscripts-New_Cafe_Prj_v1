// backend/routes/cartRoute.js
// ===============================================
// NEW VERSION — LOGGED-IN USERS ONLY
// All cart routes now require authentication
// ===============================================

import express from "express";
import {
  addToCart,
  getCart,
  removeFromCart,
  mergeCart,
  clearCart,
} from "../controllers/cartController.js";

import authMiddleware from "../middleware/auth.js";

const cartRouter = express.Router();

/* ============================================================
   CART ROUTES (AUTH REQUIRED)
============================================================ */

// Get current user's cart
cartRouter.post("/get", authMiddleware, getCart);

// Add item to cart
cartRouter.post("/add", authMiddleware, addToCart);

// Remove item from cart
cartRouter.post("/remove", authMiddleware, removeFromCart);

// Clear entire cart
cartRouter.post("/clear", authMiddleware, clearCart);

// Merge cart (used during login, if required)
cartRouter.post("/merge", authMiddleware, mergeCart);

export default cartRouter;
