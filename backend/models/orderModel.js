// backend/models/orderModel.js
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    // Customer info (auto-filled from user's saved profile)
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    email: { type: String, default: "" },

    // Required every order
    tableNumber: { type: Number, required: true },

    // Always "order" in new system
    orderType: { type: String, default: "order" },

    // Items in this order
    items: {
      type: [
        {
          itemId: String,
          name: String,
          price: Number,
          quantity: Number,
        },
      ],
      required: true,
    },

    // Amount for this individual order
    amount: { type: Number, required: true },

    // For multi-order billing (sum=mergedSessionAmount)
    mergedSessionAmount: { type: Number, default: 0 },

    // Payment workflow
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },

    // When user clicks "Pay Bill"
    paymentRequested: { type: Boolean, default: false },

    // Kitchen progress
    status: {
      type: String,
      enum: ["pending", "preparing", "served"],
      default: "pending",
    },

    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

const orderModel =
  mongoose.models.order || mongoose.model("order", orderSchema);

export default orderModel;
