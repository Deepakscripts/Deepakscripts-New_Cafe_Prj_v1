// backend/routes/orderRoute.js
// ===============================================================
// ORDER ROUTES - FINAL VERSION (User = JWT, Admin = OPEN ACCESS)
// ===============================================================

import express from "express";

import {
  placeOrder,
  getOutstanding,
  requestPay,
  markPaid,
  listOrders,
  userOrders,
  updateStatus,
  getOrderById,
  verifyOrder,
  listUserOrdersByDate,
} from "../controllers/orderController.js";

import authMiddleware from "../middleware/auth.js";

const orderRouter = express.Router();

/* ============================================================
   USER ROUTES (JWT REQUIRED)
============================================================ */

// 🟩 User places order
orderRouter.post("/place", authMiddleware, placeOrder);

// 🟩 User unpaid orders summary
orderRouter.get("/outstanding", authMiddleware, getOutstanding);

// 🟩 User requests bill
orderRouter.post("/payrequest", authMiddleware, requestPay);

// 🟩 List user's own orders
orderRouter.get("/user", authMiddleware, userOrders);

// 🟩 List user's orders by date (filtered)
orderRouter.get("/user/by-date", authMiddleware, listUserOrdersByDate);

/* ============================================================
   ADMIN ROUTES (NO AUTH REQUIRED)
============================================================ */

// 🟥 Mark orders PAID — OPEN
orderRouter.post("/markpaid", markPaid);

// 🟥 List all orders — OPEN
orderRouter.get("/list-orders", listOrders);

// Optional alias
orderRouter.get("/list", listOrders);

// 🟥 Update order status — OPEN
orderRouter.post("/updatestatus", updateStatus);

/* ============================================================
   OPTIONAL PAYMENT VERIFY
============================================================ */
orderRouter.post("/verify", verifyOrder);

/* ============================================================
   ⚠️ DYNAMIC ROUTE — MUST BE LAST
============================================================ */

// 🟩 Fetch one order (USER ONLY)
orderRouter.get("/:id", authMiddleware, getOrderById);

export default orderRouter;
