// frontend/src/components/OutstandingBillModal/OutstandingBillModal.jsx
// ===============================================================
// OUTSTANDING BILL MODAL — REAL-TIME READY
// - Auto closes when bill becomes paid (total = 0)
// - Shows success toast
// - Prevents user from paying when amount = 0
// - Smooth user experience
// ===============================================================

import React, { useEffect } from "react";
import "./OutstandingBillModal.css";
import { toast } from "react-toastify";

const OutstandingBillModal = ({
  visible,
  onClose,
  outstandingOrders = [],
  total = 0,
  currency = "₹",
  onConfirmPay,
}) => {
  if (!visible) return null;

  // 🔥 Auto-close the modal when admin marks payment as PAID
  useEffect(() => {
    if (visible && total === 0) {
      toast.success("Your payment has been completed!");
      onClose();
    }
  }, [total, visible, onClose]);

  return (
    <div className="obill-overlay" onClick={onClose}>
      <div
        className="obill-modal"
        onClick={(e) => e.stopPropagation()} // block clicking background
      >
        <h2 className="obill-title">Outstanding Bill</h2>

        {/* Order List */}
        <div className="obill-orders">
          {outstandingOrders.length === 0 ? (
            <p className="obill-empty">No pending orders</p>
          ) : (
            outstandingOrders.map((order, idx) => (
              <div className="obill-order-card" key={order._id}>
                <div className="obill-order-header">
                  <h4>Order {idx + 1}</h4>
                  <span className="obill-order-amount">
                    {currency}
                    {order.amount}
                  </span>
                </div>

                <ul className="obill-item-list">
                  {order.items.map((item, i) => (
                    <li key={i}>
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <span>
                        {currency}
                        {Number(item.price) * Number(item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* Total Box */}
        <div className="obill-total-box">
          <p>Total Pending Amount</p>
          <h3>
            {currency}
            {total}
          </h3>
        </div>

        {/* Buttons */}
        <div className="obill-actions">
          <button className="obill-btn cancel" onClick={onClose}>
            Close
          </button>

          <button
            className="obill-btn pay"
            onClick={onConfirmPay}
            disabled={total === 0}
            style={{
              opacity: total === 0 ? 0.6 : 1,
              cursor: total === 0 ? "not-allowed" : "pointer",
            }}
          >
            Confirm Pay Bill
          </button>
        </div>
      </div>
    </div>
  );
};

export default OutstandingBillModal;
