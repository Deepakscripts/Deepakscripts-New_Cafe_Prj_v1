// frontend/src/components/OutstandingBillModal/OutstandingBillModal.jsx
// ===============================================================
// OUTSTANDING BILL MODAL — FINAL STABLE VERSION
// - Calls onConfirmPay correctly
// - Auto closes when total becomes 0
// - Cleaner structure
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

  // Auto close if admin marks PAID in real-time
  useEffect(() => {
    if (visible && total === 0) {
      toast.success("Your payment has been completed!");
      onClose();
    }
  }, [total, visible, onClose]);

  // Prevent accidental click when unpaid is 0
  const handlePayClick = () => {
    if (total === 0) {
      toast.info("No outstanding amount");
      return;
    }

    if (typeof onConfirmPay === "function") {
      onConfirmPay(outstandingOrders);  // <-- THIS FIXES EVERYTHING
    } else {
      console.warn("onConfirmPay was not passed!");
    }
  };

  return (
    <div className="obill-overlay" onClick={onClose}>
      <div className="obill-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="obill-title">Outstanding Bill</h2>

        {/* Orders List */}
        <div className="obill-orders">
          {outstandingOrders.length === 0 ? (
            <p className="obill-empty">No pending orders</p>
          ) : (
            outstandingOrders.map((order, idx) => (
              <div key={order._id} className="obill-order-card">
                <div className="obill-order-header">
                  <h4>Order {idx + 1}</h4>
                  <span className="obill-order-amount">
                    {currency}
                    {Number(order.amount || 0).toFixed(2)}
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
                        {(Number(item.price) * Number(item.quantity)).toFixed(2)}
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
            {Number(total).toFixed(2)}
          </h3>
        </div>

        {/* Buttons */}
        <div className="obill-actions">
          <button className="obill-btn cancel" onClick={onClose}>
            Close
          </button>

          <button
            className="obill-btn pay"
            onClick={handlePayClick}
            disabled={total === 0}
            style={{
              opacity: total === 0 ? 0.5 : 1,
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
