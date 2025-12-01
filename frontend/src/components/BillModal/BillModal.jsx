// frontend/src/components/BillModal/BillModal.jsx
// ===============================================================
// FINAL READ-ONLY BILL VIEWER (NO PRINT, NO PAY BUTTONS)
// - Used when viewing past bills grouped by date
// - Consolidates duplicate items
// - Clean and minimal UI
// ===============================================================

import React, { useEffect } from "react";
import "./BillModal.css";

const BillModal = ({ visible, onClose, dateKey, ordersForDate = [], currency = "₹" }) => {
  // Close on ESC key
  useEffect(() => {
    if (!visible) return;

    const onEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [visible, onClose]);

  if (!visible) return null;

  /* ------------------------------------------------------------
      CONSOLIDATE ITEMS ACROSS ALL ORDERS OF THIS DATE
  ------------------------------------------------------------ */
  const consolidated = [];

  for (const order of ordersForDate) {
    for (const item of order.items || []) {
      const name = item.name;
      const qty = Number(item.quantity || 0);
      const amount = Number(item.price || 0) * qty;

      const existing = consolidated.find((x) => x.name === name);

      if (existing) {
        existing.quantity += qty;
        existing.amount += amount;
      } else {
        consolidated.push({
          name,
          quantity: qty,
          amount,
        });
      }
    }
  }

  const total = ordersForDate.reduce((sum, o) => sum + Number(o.amount || 0), 0);
  const readableDate = new Date(dateKey).toLocaleDateString();

  /* ------------------------------------------------------------
      UI
  ------------------------------------------------------------ */
  return (
    <div className="billmodal-overlay" onClick={onClose}>
      <div className="billmodal-box" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="billmodal-head">
          <h3>Bill — {readableDate}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="billmodal-body">

          {/* Consolidated Items */}
          <div className="consolidated-items">
            {consolidated.map((item, idx) => (
              <div key={idx} className="bill-row">
                <div className="name">{item.name} × {item.quantity}</div>
                <div className="amt">{currency}{item.amount.toFixed(2)}</div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="bill-total">
            <strong>Total: </strong> {currency}{total.toFixed(2)}
          </div>

        </div>

      </div>
    </div>
  );
};

export default BillModal;
