// backend/controllers/cartController.js
// ===============================================
//  NEW VERSION — LOGGED-IN USERS ONLY
//  No guests, no sessionId, simplified cart flow
// ===============================================

import userModel from "../models/userModel.js";
import foodModel from "../models/foodModel.js";

/* ============================================================
   HELPERS
============================================================ */

/**
 * Always return a valid cart object
 */
const safeCart = (data) => (data && typeof data === "object" ? data : {});

/**
 * Require a logged-in user (authMiddleware sets req.userId)
 */
async function getAuthenticatedUser(req, res) {
  if (!req.userId) {
    res.status(401).json({
      success: false,
      message: "Unauthorized. Please login again.",
    });
    return null;
  }

  const user = await userModel.findById(req.userId);
  if (!user) {
    res.status(404).json({
      success: false,
      message: "User not found.",
    });
    return null;
  }

  return user;
}

/* ============================================================
   ADD TO CART
============================================================ */

export async function addToCart(req, res) {
  try {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return;

    const { itemId } = req.body;
    if (!itemId)
      return res.json({ success: false, message: "Item ID missing" });

    const cartData = safeCart(user.cartData);
    const id = String(itemId);

    cartData[id] = (Number(cartData[id]) || 0) + 1;

    user.cartData = cartData;
    await user.save();

    // Fetch item name for frontend toast
    const item = await foodModel.findById(itemId).lean();

    res.json({
      success: true,
      message: `${item?.name || "Item"} added to cart`,
      itemName: item?.name || "",
      quantity: cartData[id],
      cartData,
    });
  } catch (err) {
    console.error("addToCart error:", err);
    res.json({ success: false, message: "Server error" });
  }
}

/* ============================================================
   REMOVE FROM CART
============================================================ */

export async function removeFromCart(req, res) {
  try {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return;

    const { itemId } = req.body;
    if (!itemId)
      return res.json({ success: false, message: "Item ID missing" });

    const cartData = safeCart(user.cartData);
    const id = String(itemId);

    if (cartData[id]) {
      cartData[id]--;
      if (cartData[id] <= 0) delete cartData[id];
    }

    // Fetch item name for toast
    const item = await foodModel.findById(itemId).lean();

    user.cartData = cartData;
    await user.save();

    res.json({
      success: true,
      message: `${item?.name || "Item"} removed from cart`,
      itemName: item?.name || "",
      quantity: cartData[id] || 0,
      cartData,
    });
  } catch (err) {
    console.error("removeFromCart error:", err);
    res.json({ success: false, message: "Server error" });
  }
}

/* ============================================================
   GET CART
============================================================ */

export async function getCart(req, res) {
  try {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return;

    res.json({
      success: true,
      cartData: safeCart(user.cartData),
    });
  } catch (err) {
    console.error("getCart error:", err);
    res.json({ success: false, message: "Server error" });
  }
}

/* ============================================================
   CLEAR CART
============================================================ */

export async function clearCart(req, res) {
  try {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return;

    user.cartData = {};
    await user.save();

    res.json({
      success: true,
      message: "Cart cleared",
      cartData: {},
    });
  } catch (err) {
    console.error("clearCart error:", err);
    res.json({ success: false, message: "Server error" });
  }
}

/* ============================================================
   MERGE CART — (OPTIONAL)  
   You may remove this if not needed.
   For login flow: merge local cart → user cart.
============================================================ */

export async function mergeCart(req, res) {
  try {
    const user = await getAuthenticatedUser(req, res);
    if (!user) return;

    const incoming = req.body.cart || {};
    const current = safeCart(user.cartData);
    const merged = { ...current };

    for (const [id, qty] of Object.entries(incoming)) {
      const q = Math.max(0, Number(qty) || 0);
      if (q > 0) merged[id] = (merged[id] || 0) + q;
    }

    user.cartData = merged;
    await user.save();

    res.json({
      success: true,
      message: "Cart merged",
      cartData: merged,
    });
  } catch (err) {
    console.error("mergeCart error:", err);
    res.json({ success: false, message: "Server error" });
  }
}
