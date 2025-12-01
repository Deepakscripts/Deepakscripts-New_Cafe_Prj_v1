// backend/controllers/orderController.js
// =======================================================
// FINAL UPDATED CONTROLLER — ADMIN OPEN, USER PROTECTED
// =======================================================

import mongoose from "mongoose";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import foodModel from "../models/foodModel.js";

const isMongoId = (v) => mongoose.Types.ObjectId.isValid(String(v || ""));

/* ---------------- HELPERS ---------------- */

async function buildItemsAndAmount(cartMap = {}) {
  if (!cartMap) return { items: [], amount: 0 };

  const ids = Object.keys(cartMap).filter(
    (id) => Number(cartMap[id]) > 0 && isMongoId(id)
  );

  let foods = [];
  if (ids.length) foods = await foodModel.find({ _id: { $in: ids } }).lean();

  const byId = Object.fromEntries(foods.map((f) => [String(f._id), f]));

  let amount = 0;
  const items = [];

  for (const id of Object.keys(cartMap)) {
    const qty = Number(cartMap[id] || 0);
    if (qty <= 0) continue;
    if (!byId[id]) continue;

    const food = byId[id];
    const price = Number(food.price || 0);

    amount += price * qty;
    items.push({
      itemId: id,
      name: food.name,
      price,
      quantity: qty,
    });
  }

  return { items, amount };
}

function coerceClientCart(clientCart) {
  let amount = 0;
  const items = [];

  for (const raw of Array.isArray(clientCart) ? clientCart : []) {
    const itemId = String(raw.itemId || "");
    const name = String(raw.name || "");
    const quantity = Number(raw.quantity || 0);
    const price = Number(raw.price || 0);

    if (!name || quantity <= 0) continue;

    items.push({ itemId, name, price, quantity });
    amount += price * quantity;
  }

  return { items, amount };
}

/* ---------------- AUTH HELP ---------------- */
async function requireUser(req, res) {
  if (!req.userId) {
    console.warn("401: requireUser → no req.userId in request");
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }
  const user = await userModel.findById(req.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  return user;
}

/* ============================================================
   1) PLACE ORDER (USER)
============================================================ */
const placeOrder = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const {
      items: clientCart,
      tableNumber = 0,
      notes = "",
      firstName = "",
      lastName = "",
      email = "",
    } = req.body;

    let items = [];
    let amount = 0;
    let usedServerCart = false;

    if (Array.isArray(clientCart) && clientCart.length) {
      ({ items, amount } = coerceClientCart(clientCart));
    } else if (user.cartData && Object.keys(user.cartData).length) {
      ({ items, amount } = await buildItemsAndAmount(user.cartData));
      usedServerCart = true;
    }

    if (!items.length) {
      return res
        .status(400)
        .json({ success: false, message: "No items provided or cart is empty" });
    }

    const orderDoc = await orderModel.create({
      userId: String(req.userId),
      firstName: firstName || user.firstName || "",
      lastName: lastName || user.lastName || "",
      email: email || user.email || "",
      tableNumber: Number(tableNumber || 0),
      orderType: "order",
      items,
      amount,
      mergedSessionAmount: amount,
      paymentStatus: "unpaid",
      paymentRequested: false,
      status: "pending",
      notes,
    });

    if (!user.firstName || !user.lastName) {
      const upd = {};
      if (firstName?.trim()) upd.firstName = firstName.trim();
      if (lastName?.trim()) upd.lastName = lastName.trim();
      if (email?.trim()) upd.email = email.trim();
      await userModel.findByIdAndUpdate(req.userId, upd, { new: true });
    }

    if (usedServerCart) {
      user.cartData = {};
      await user.save();
    }

    try {
      const io = req.app.get("io");
      io.emit("order.created", { order: orderDoc });
    } catch (e) {}

    res.json({ success: true, order: orderDoc });
  } catch (err) {
    console.error("placeOrder error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ============================================================
   2) GET OUTSTANDING (USER)
============================================================ */
const getOutstanding = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const unpaidOrders = await orderModel
      .find({ userId: String(req.userId), paymentStatus: "unpaid" })
      .sort({ createdAt: 1 })
      .lean();

    const total = unpaidOrders.reduce((s, o) => s + Number(o.amount || 0), 0);

    res.json({ success: true, orders: unpaidOrders, total });
  } catch (err) {
    console.error("getOutstanding error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ============================================================
   3) REQUEST PAY (USER)
============================================================ */
const requestPay = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const { orderIds = [], tableNumber = user.tableNumber || 0 } = req.body;

    const q = { userId: String(req.userId), paymentStatus: "unpaid" };
    if (Array.isArray(orderIds) && orderIds.length) {
      q._id = { $in: orderIds.filter((id) => isMongoId(id)) };
    }

    const unpaid = await orderModel.find(q).lean();
    if (!unpaid.length) {
      return res.status(400).json({
        success: false,
        message: "No unpaid orders to request payment for",
      });
    }

    await orderModel.updateMany(
      { _id: { $in: unpaid.map((o) => o._id) } },
      { paymentRequested: true }
    );

    const updated = await orderModel
      .find({ _id: { $in: unpaid.map((o) => o._id) } })
      .lean();

    const total = updated.reduce((s, o) => s + Number(o.amount || 0), 0);

    try {
      const io = req.app.get("io");
      io.emit("order.payRequested", {
        tableNumber,
        orders: updated,
        total,
      });
    } catch (e) {}

    res.json({ success: true, orders: updated, total });
  } catch (err) {
    console.error("requestPay error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ============================================================
   4) MARK PAID (ADMIN)
============================================================ */
const markPaid = async (req, res) => {
  try {
    const { orderIds = [], userId } = req.body;

    let updatedOrders = [];

    if (Array.isArray(orderIds) && orderIds.length) {
      const valid = orderIds.filter((id) => isMongoId(id));
      await orderModel.updateMany(
        { _id: { $in: valid } },
        { paymentStatus: "paid", paymentRequested: false }
      );
      updatedOrders = await orderModel.find({ _id: { $in: valid } }).lean();
    } else if (userId) {
      await orderModel.updateMany(
        { userId, paymentRequested: true },
        { paymentStatus: "paid", paymentRequested: false }
      );
      updatedOrders = await orderModel
        .find({ userId, paymentStatus: "paid" })
        .lean();
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Provide orderIds or userId" });
    }

    try {
      const io = req.app.get("io");
      io.emit("order.paid", { orders: updatedOrders });
    } catch (e) {}

    res.json({ success: true, orders: updatedOrders });
  } catch (err) {
    console.error("markPaid error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ============================================================
   5) LIST ORDERS (ADMIN — OPEN ACCESS)
============================================================ */
const listOrders = async (req, res) => {
  try {
    const { from, to, paymentStatus, status } = req.query;

    const q = {};

    if (paymentStatus) q.paymentStatus = paymentStatus;
    if (status) q.status = status;

    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        q.createdAt.$lte = d;
      }
    }

    const orders = await orderModel.find(q).sort({ createdAt: -1 }).lean();

    res.json({ success: true, orders });
  } catch (err) {
    console.error("listOrders error:", err);
    res.status(500).json({ success: false, message: "Error listing orders" });
  }
};

/* ============================================================
   6) USER ORDERS (history)
============================================================ */
const userOrders = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const orders = await orderModel
      .find({ userId: String(req.userId) })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, orders });
  } catch (err) {
    console.error("userOrders error:", err);
    res.status(500).json({ success: false, message: "Error" });
  }
};

/* ============================================================
   7) UPDATE STATUS (ADMIN)
============================================================ */
const updateStatus = async (req, res) => {
  try {
    const { orderId, status, paymentStatus } = req.body;

    if (!orderId || !isMongoId(orderId))
      return res
        .status(400)
        .json({ success: false, message: "Valid orderId required" });

    const update = {};
    if (status) update.status = status;
    if (paymentStatus) update.paymentStatus = paymentStatus;

    await orderModel.findByIdAndUpdate(orderId, update);

    try {
      const io = req.app.get("io");
      io.emit("order.updated", { orderId, update });
    } catch (e) {}

    res.json({ success: true, message: "Status Updated" });
  } catch (err) {
    console.error("updateStatus error:", err);
    res.status(500).json({ success: false, message: "Error" });
  }
};

/* ============================================================
   8) GET ORDER BY ID
============================================================ */
const getOrderById = async (req, res) => {
  try {
    const id = req.params.id;

    if (!isMongoId(id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid order id" });

    const order = await orderModel.findById(id).lean();
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    res.json({ success: true, order });
  } catch (err) {
    console.error("getOrderById error:", err);
    res.status(500).json({ success: false, message: "Error" });
  }
};

const verifyOrder = async (req, res) => {
  try {
    const { orderId, success } = req.body;

    if (!orderId)
      return res
        .status(400)
        .json({ success: false, message: "orderId required" });

    if (success === true || String(success) === "true") {
      await orderModel.findByIdAndUpdate(orderId, {
        paymentStatus: "paid",
        paymentRequested: false,
      });

      try {
        const io = req.app.get("io");
        io.emit("order.paid", { orders: [orderId] });
      } catch (e) {}

      return res.json({ success: true, message: "Paid" });
    }

    res.json({ success: false, message: "Not paid" });
  } catch (err) {
    console.error("verifyOrder error:", err);
    res.status(500).json({ success: false, message: "Not Verified" });
  }
};

export {
  placeOrder,
  getOutstanding,
  requestPay,
  markPaid,
  listOrders,
  userOrders,
  updateStatus,
  verifyOrder,
  getOrderById,
};
