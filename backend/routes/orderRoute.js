// backend/routes/orderRoute.js
import express from "express";
import authMiddleware from "../middleware/auth.js";
import adminOnly from "../middleware/admin.js";

import {
  placeOrderAdhoc,
  placeOrderCod,
  convertAdhocToFinal,
  listOrders,
  userOrders,
  updateStatus,
  verifyOrder,
  getOrderById,
} from "../controllers/orderController.js";

const orderRouter = express.Router();

/* --------------------------------------------
 * ADMIN ROUTES
 * -------------------------------------------- */

// List all orders (with date filter / type filter)
orderRouter.get("/list", adminOnly, listOrders);

// Get single order (for printing or details)
orderRouter.get("/:id", adminOnly, getOrderById);

// Update order status (pending → preparing → ready → served)
orderRouter.post("/status", adminOnly, updateStatus);


/* --------------------------------------------
 * USER ROUTES
 * -------------------------------------------- */

// Get orders for logged-in user
orderRouter.get("/user", authMiddleware, userOrders);
// (You were using POST earlier; now GET is cleaner.)
// If you still need POST support, uncomment next line:
// orderRouter.post("/userorders", authMiddleware, userOrders);

// Place ADHOC order (quick order, customer will order more later)
orderRouter.post("/placeadhoc", authMiddleware, placeOrderAdhoc);

// Place FINAL order (Pay on Counter)
orderRouter.post("/placecod", authMiddleware, placeOrderCod);

// Convert all adhoc orders → final merged bill
orderRouter.post("/adhoc-to-final", authMiddleware, convertAdhocToFinal);


/* --------------------------------------------
 * OPTIONAL LEGACY VERIFY (Stripe, etc.)
 * -------------------------------------------- */

orderRouter.post("/verify", verifyOrder);

export default orderRouter;
