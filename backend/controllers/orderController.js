// backend/controllers/orderController.js
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import foodModel from "../models/foodModel.js";
import mongoose from "mongoose";

const isMongoId = (v) => mongoose.Types.ObjectId.isValid(String(v || ""));

/* ---------------- helpers ---------------- */

/**
 * Build an items snapshot and subtotal from a server-side cart map.
 * cartMap: { [itemId]: quantity }
 * Returns { items:[{itemId,name,price,quantity}], amount:number }
 *
 * This supports synthetic add-on itemIds (like "addon:cheese:pasta")
 * by returning them with the provided values only when the item isn't found
 * in the food collection.
 */
async function buildItemsAndAmount(cartMap = {}) {
  // collect candidate ids that look like mongo ids
  const ids = Object.keys(cartMap || {}).filter(
    (id) => Number(cartMap[id]) > 0 && isMongoId(id)
  );

  let foods = [];
  if (ids.length) {
    foods = await foodModel.find({ _id: { $in: ids } }).lean();
  }
  const byId = Object.fromEntries((foods || []).map((f) => [String(f._id), f]));

  let amount = 0;
  const items = [];

  for (const id of Object.keys(cartMap || {})) {
    const qty = Number(cartMap[id]) || 0;
    if (qty <= 0) continue;

    // if item is a known food (mongo id)
    if (byId[id]) {
      const f = byId[id];
      const price = Number(f.price || 0);
      amount += price * qty;
      items.push({
        itemId: String(f._id),
        name: String(f.name || ""),
        price,
        quantity: qty,
      });
    } else {
      // not found in foods — treat as synthetic (e.g., addon)
      // We need to decode price/name if cartMap stored objects; but in many flows
      // the server-side cart contains only ids and qty; in that case we cannot
      // resolve synthetic lines here — skip them.
      // We'll skip unknown non-mongo ids here.
      continue;
    }
  }

  return { items, amount };
}

/** Sanitize a client-provided cart snapshot */
function coerceClientCart(clientCart = []) {
  const out = [];
  let amount = 0;
  for (const raw of Array.isArray(clientCart) ? clientCart : []) {
    const quantity = Math.max(0, parseInt(raw?.quantity ?? 0, 10));
    const price = Number(raw?.price ?? 0);
    const name = String(raw?.name ?? "");
    const itemId = String(raw?.itemId ?? "");
    if (!quantity || !name) continue;
    out.push({ itemId, name, price, quantity });
    amount += price * quantity;
  }
  return { items: out, amount };
}

/* ---------------- place adhoc order ---------------- */
/**
 * POST /api/order/placeadhoc
 * Body: { items (client snapshot) OR sessionCart, tableNumber, notes, sessionId }
 * Requires auth (recommended) — if no req.userId, fallback to guest-<sessionId>.
 */
const placeOrderAdhoc = async (req, res) => {
  try {
    const {
      items: clientCart = null,
      tableNumber = null,
      notes = "",
      sessionId: clientSessionId = null,
    } = req.body;

    // user id from auth middleware; fallback to guest session id
    const userId = req.userId || (clientSessionId ? `guest-${clientSessionId}` : "guest");

    // Ensure sessionId
    const sessionId = clientSessionId || req.body.sessionId || req.params?.sessionId || req.query?.sessionId;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }

    // prefer client snapshot if provided
    let items = [];
    let amount = 0;

    if (Array.isArray(clientCart) && clientCart.length) {
      const coerced = coerceClientCart(clientCart);
      items = coerced.items;
      amount = coerced.amount;
    } else {
      // no client snapshot — try to read server-side cart stored on user (if present)
      try {
        if (req.userId) {
          const user = await userModel.findById(req.userId).lean();
          if (user && user.cartData) {
            const built = await buildItemsAndAmount(user.cartData || {});
            items = built.items;
            amount = built.amount;
          }
        }
      } catch (e) {
        // ignore server cart resolution errors
      }
    }

    if (!items.length) {
      return res.status(400).json({ success: false, message: "No items to place adhoc order" });
    }

    // create adhoc order (unpaid)
    const order = await orderModel.create({
      userId: String(userId),
      firstName: "", // adhoc should not require names; keep empty
      lastName: "",
      email: "",
      tableNumber: Number(tableNumber || 0),
      sessionId,
      orderType: "adhoc",
      items,
      amount,
      mergedSessionAmount: 0,
      paymentStatus: "unpaid",
      status: "pending",
      notes: String(notes || ""),
    });

    // emit socket event for admin UI
    try {
      const io = req.app && req.app.get && req.app.get("io");
      if (io) io.emit("order.created", { orderType: "adhoc", order });
    } catch (e) {
      console.warn("socket emit failed:", e?.message || e);
    }

    // optional: don't clear user cart here - user may continue ordering
    return res.json({ success: true, order });
  } catch (e) {
    console.error("placeOrderAdhoc error", e);
    return res.status(500).json({ success: false, message: "Error creating adhoc order" });
  }
};

/* ---------------- place order (Pay on Counter = FINAL) ---------------- */
/**
 * POST /api/order/placecod
 * Body: { items (client snapshot) OR server cart, tableNumber, notes, sessionId, firstName, lastName, email }
 *
 * Creates a final order for the session. Does NOT remove adhoc history (we keep history).
 * final order will be created with orderType: 'final' and paymentStatus: 'unpaid'
 * (payment is collected at counter; admin can mark it paid).
 */
const placeOrderCod = async (req, res) => {
  try {
    const {
      items: clientCart = null,
      tableNumber = null,
      notes = "",
      sessionId: clientSessionId = null,
      firstName = "",
      lastName = "",
      email = "",
    } = req.body;

    const userId = req.userId || (clientSessionId ? `guest-${clientSessionId}` : "guest");
    const sessionId = clientSessionId || req.body.sessionId || req.params?.sessionId || req.query?.sessionId;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId required" });
    }

    // Collect items and amount
    let items = [];
    let amount = 0;

    if (Array.isArray(clientCart) && clientCart.length) {
      const coerced = coerceClientCart(clientCart);
      items = coerced.items;
      amount = coerced.amount;
    } else {
      try {
        if (req.userId) {
          const user = await userModel.findById(req.userId).lean();
          if (user && user.cartData) {
            const built = await buildItemsAndAmount(user.cartData || {});
            items = built.items;
            amount = built.amount;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    if (!items.length) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // create final order (payment pending at counter)
    const order = await orderModel.create({
      userId: String(userId),
      firstName: String(firstName || "").trim(),
      lastName: String(lastName || "").trim(),
      email: String(email || "").trim(),
      tableNumber: Number(tableNumber || 0),
      sessionId,
      orderType: "final",
      items,
      amount,
      mergedSessionAmount: amount,
      paymentStatus: "unpaid", // payment at counter; admin marks paid when collected
      status: "pending",
      notes: String(notes || ""),
    });

    // try clearing server cart for this user if present
    try {
      if (req.userId) {
        await userModel.findByIdAndUpdate(req.userId, { cartData: {} });
      }
    } catch (e) {
      // ignore
    }

    // notify admin via websocket
    try {
      const io = req.app && req.app.get && req.app.get("io");
      if (io) io.emit("order.created", { orderType: "final", order });
    } catch (e) {}

    return res.json({ success: true, order, message: "Final order created" });
  } catch (e) {
    console.error("placeOrderCod error", e);
    return res.status(500).json({ success: false, message: "Error placing final order" });
  }
};

/* ---------------- convert adhoc orders for a session into a final order ---------------- */
/**
 * POST /api/order/adhoc-to-final
 * Body: { sessionId, payAll: boolean (optional) }
 *
 * Keeps adhoc orders as history, creates a new final order that merges items.
 * Marks adhoc orders as merged: true (keeps them in DB).
 */
const convertAdhocToFinal = async (req, res) => {
  try {
    const { sessionId, payAll = false } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId required" });
    }

    // find adhoc orders for the session
    const adhocOrders = await orderModel.find({ sessionId, orderType: "adhoc" }).sort({ createdAt: 1 }).lean();
    if (!adhocOrders || adhocOrders.length === 0) {
      return res.status(404).json({ success: false, message: "No adhoc orders found for this session" });
    }

    // aggregate items by itemId (sum quantities)
    const agg = new Map();
    for (const o of adhocOrders) {
      for (const it of o.items || []) {
        const key = String(it.itemId || it.name || JSON.stringify(it));
        const existing = agg.get(key) || { itemId: it.itemId, name: it.name, price: it.price || 0, quantity: 0 };
        existing.quantity = Number(existing.quantity || 0) + Number(it.quantity || 0);
        agg.set(key, existing);
      }
    }

    const mergedItems = Array.from(agg.values()).map((v) => ({
      itemId: v.itemId,
      name: v.name,
      price: Number(v.price || 0),
      quantity: Number(v.quantity || 0),
    }));

    // compute total amount
    const combinedAmount = mergedItems.reduce((s, it) => s + Number(it.price || 0) * Number(it.quantity || 0), 0);

    const userId = adhocOrders[0].userId || `guest-${sessionId}`;

    // create final order (paymentStatus depends on payAll flag; we default to unpaid at counter)
    const finalOrder = await orderModel.create({
      userId: String(userId),
      firstName: adhocOrders[0].firstName || "",
      lastName: adhocOrders[0].lastName || "",
      email: adhocOrders[0].email || "",
      tableNumber: adhocOrders[0].tableNumber || 0,
      sessionId,
      orderType: "final",
      items: mergedItems,
      amount: combinedAmount,
      mergedSessionAmount: combinedAmount,
      paymentStatus: payAll ? "paid" : "unpaid",
      status: "pending",
      notes: "Merged adhoc orders into final",
    });

    // mark adhoc orders as merged = true (keeps history)
    await orderModel.updateMany({ sessionId, orderType: "adhoc" }, { $set: { merged: true } });

    // emit event for admin
    try {
      const io = req.app && req.app.get && req.app.get("io");
      if (io) io.emit("order.created", { orderType: "final", order: finalOrder });
    } catch (e) {}

    return res.json({ success: true, order: finalOrder });
  } catch (e) {
    console.error("convertAdhocToFinal error", e);
    return res.status(500).json({ success: false, message: "Error converting adhoc orders" });
  }
};

/* ---------------- list with date filter (admin) ---------------- */
/**
 * GET /api/order/list?from=YYYY-MM-DD&to=YYYY-MM-DD&status=&orderType=
 */
const listOrders = async (req, res) => {
  try {
    const { from, to, status, orderType } = req.query;
    const q = {};
    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) {
        const t = new Date(to);
        if (to.length <= 10) t.setHours(23, 59, 59, 999);
        q.createdAt.$lte = t;
      }
    }
    if (status) q.status = status;
    if (orderType) q.orderType = orderType;

    const orders = await orderModel.find(q).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, orders });
  } catch (e) {
    console.error("listOrders error", e);
    return res.status(500).json({ success: false, message: "Error" });
  }
};

/* ---------------- get orders for user ---------------- */
/**
 * GET /api/order/user   (or POST depending on your route)
 * uses req.userId (auth middleware)
 */
const userOrders = async (req, res) => {
  try {
    const userId = req.userId || req.body?.userId || req.query?.userId;
    if (!userId) return res.status(400).json({ success: false, message: "userId required" });

    const orders = await orderModel.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, orders });
  } catch (e) {
    console.error("userOrders error", e);
    return res.status(500).json({ success: false, message: "Error" });
  }
};

/* ---------------- update order status (admin) ---------------- */
/**
 * POST /api/order/status
 * Body: { orderId, status, paymentStatus? }
 */
const updateStatus = async (req, res) => {
  try {
    const { orderId, status, paymentStatus } = req.body;
    if (!orderId || !isMongoId(orderId)) return res.status(400).json({ success: false, message: "orderId required" });

    const update = {};
    if (status) update.status = status;
    if (paymentStatus) update.paymentStatus = paymentStatus;

    await orderModel.findByIdAndUpdate(orderId, update);

    // emit status update to admin / clients
    try {
      const io = req.app && req.app.get && req.app.get("io");
      if (io) io.emit("order.updated", { orderId, update });
    } catch (e) {}

    return res.json({ success: true, message: "Status Updated" });
  } catch (e) {
    console.error("updateStatus error", e);
    return res.status(500).json({ success: false, message: "Error" });
  }
};

/* ---------------- get single order by id ---------------- */
const getOrderById = async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!isMongoId(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }
    const order = await orderModel.findById(id).lean();
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    return res.json({ success: true, order });
  } catch (e) {
    console.error("getOrderById error", e);
    return res.status(500).json({ success: false, message: "Error" });
  }
};

/* ---------------- optional verifyOrder (kept for legacy Stripe flows) ---------------- */
const verifyOrder = async (req, res) => {
  // Body: { orderId, success }
  const { orderId, success } = req.body;
  try {
    if (!orderId) return res.status(400).json({ success: false, message: "orderId required" });
    if (String(success) === "true" || success === true) {
      await orderModel.findByIdAndUpdate(orderId, { paymentStatus: "paid" });
      return res.json({ success: true, message: "Paid" });
    } else {
      // If a Stripe checkout was cancelled, you may want to delete the order
      // but we keep it for audit by default.
      return res.json({ success: false, message: "Not paid" });
    }
  } catch (e) {
    console.error("verifyOrder error", e);
    return res.status(500).json({ success: false, message: "Not Verified" });
  }
};

export {
  placeOrderAdhoc,
  placeOrderCod,
  convertAdhocToFinal,
  listOrders,
  userOrders,
  updateStatus,
  verifyOrder,
  getOrderById,
};
