import mongoose from "mongoose";

// -----------------------------------------------------
// ORDER ITEM SCHEMA
// -----------------------------------------------------
const orderItemSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true },
    name: { type: String },
    price: { type: Number },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

// -----------------------------------------------------
// MAIN ORDER SCHEMA
// -----------------------------------------------------
const orderSchema = new mongoose.Schema(
  {
    // USER IDENTIFICATION
    userId: { type: String, required: true },

    // DINE-IN CUSTOMER INFO
    firstName: { type: String, trim: true, default: "" },
    lastName: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    tableNumber: { type: Number, required: true, min: 1, max: 7 },

    // GROUPING KEY FOR ADHOC → FINAL FLOW
    sessionId: {
      type: String,
      required: true,
      index: true,
    },

    // ORDER TYPE
    // adhoc  → customer will order more
    // final  → customer stops ordering, final payment pending/paid
    orderType: {
      type: String,
      enum: ["adhoc", "final"],
      required: true,
    },

    // CART SNAPSHOT FOR THIS INDIVIDUAL ORDER
    items: {
      type: [orderItemSchema],
      required: true,
    },

    // AMOUNT OF JUST THIS ORDER
    amount: { type: Number, required: true, min: 0 },

    // MERGED SESSION AMOUNT (ONLY FOR FINAL ORDER)
    mergedSessionAmount: {
      type: Number,
      default: 0, // calculated when adhoc → final conversion happens
    },

    // PAYMENT STATUS
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },

    // KITCHEN ORDER STATUS
    status: {
      type: String,
      enum: ["pending", "preparing", "ready", "served", "cancelled"],
      default: "pending",
    },

    // OPTIONAL NOTES
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// MODEL
const orderModel =
  mongoose.models.order || mongoose.model("order", orderSchema);

export default orderModel;
