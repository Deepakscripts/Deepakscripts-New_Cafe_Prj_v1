// admin/src/components/OrderPopup.jsx
import React from "react";

const OrderPopup = ({ open, order, onClose, onMarkPaid, onUpdateStatus, onPrint }) => {
    if (!open || !order) return null;

    const total = (order.items || []).reduce((s, it) => s + (Number(it.price || 0) * Number(it.quantity || 0)), 0);

    return (
        <div className="order-popup-backdrop">
            <div className="order-popup">
                <header className="order-popup-header">
                    <h3>
                        {order.orderType === "adhoc" ? "Adhoc Order Received" : "Final Order Received"}
                    </h3>
                    <button onClick={onClose}>✕</button>
                </header>

                <div className="order-popup-body">
                    <p><strong>Session:</strong> {order.sessionId || "—"}</p>
                    <p><strong>Table:</strong> {order.tableNumber || "—"}</p>
                    <p><strong>User:</strong> {order.userId || "guest"}</p>

                    <hr />

                    <div className="order-items">
                        <ul>
                            {(order.items || []).map((it, i) => (
                                <li key={i}>
                                    {it.name} x {it.quantity} — ₹{Number(it.price || 0) * Number(it.quantity || 0)}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="order-summary">
                        <p><strong>Items:</strong> {(order.items || []).length}</p>
                        <p><strong>Total:</strong> ₹{order.amount ?? total}</p>
                        {order.orderType === "final" && order.mergedSessionAmount > 0 && (
                            <p><strong>Merged Total:</strong> ₹{order.mergedSessionAmount}</p>
                        )}
                    </div>

                    <div className="order-notes">
                        <p><strong>Notes:</strong> {order.notes || "—"}</p>
                    </div>
                </div>

                <footer className="order-popup-footer">
                    <div className="left">
                        <button onClick={() => onUpdateStatus(order._id, "preparing")}>Mark Preparing</button>
                        <button onClick={() => onUpdateStatus(order._id, "ready")}>Mark Ready</button>
                        <button onClick={() => onUpdateStatus(order._id, "served")}>Mark Served</button>
                    </div>

                    <div className="right">
                        {order.paymentStatus !== "paid" && (
                            <button onClick={() => onMarkPaid(order._id)}>Mark Paid</button>
                        )}
                        <button onClick={() => onPrint(order)}>Print</button>
                    </div>
                </footer>
            </div>
            <style>{`
        .order-popup-backdrop {
          position: fixed; inset: 0; display:flex; align-items:center; justify-content:center;
          background: rgba(0,0,0,0.35); z-index: 9999;
        }
        .order-popup { width: 680px; max-width: 96%; background:#fff; border-radius:8px; box-shadow: 0 8px 30px rgba(0,0,0,0.2); }
        .order-popup-header { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #eee; }
        .order-popup-body { padding:12px 16px; }
        .order-popup-footer { display:flex; justify-content:space-between; padding:12px 16px; border-top:1px solid #eee; }
        .order-popup-footer button { margin-left:8px; }
      `}</style>
        </div>
    );
}
export default OrderPopup;
