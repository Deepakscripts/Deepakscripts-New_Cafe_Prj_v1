// frontend/src/components/OutstandingBillModal.jsx
import React from "react";
import "./OutstandingBillModal.css";

const OutstandingBillModal = ({
  visible,
  onClose,
  outstandingOrders = [],
  total = 0,
  currency = "₹",
  onConfirmPay,
}) => {
  if (!visible) return null;

  return (
    <div className="obill-overlay">
      <div className="obill-modal">
        <h2 className="obill-title">Outstanding Bill</h2>

        <div className="obill-orders">
          {outstandingOrders.map((order, idx) => (
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
                    <span>{item.name} × {item.quantity}</span>
                    <span>
                      {currency}
                      {Number(item.price) * Number(item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="obill-total-box">
          <p>Total Pending Amount</p>
          <h3>
            {currency}
            {total}
          </h3>
        </div>

        <div className="obill-actions">
          <button className="obill-btn cancel" onClick={onClose}>
            Close
          </button>
          <button className="obill-btn pay" onClick={onConfirmPay}>
            Confirm Pay Bill
          </button>
        </div>
      </div>
    </div>
  );
};

export default OutstandingBillModal;
