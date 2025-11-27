import React, { useContext, useEffect, useState } from "react";
import "./ShowBill.css";
import { StoreContext } from "../../Context/StoreContext";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const ShowBill = () => {
  const { token, url, sessionId, ensureSessionId } = useContext(StoreContext);
  const [loading, setLoading] = useState(true);
  const [groupedOrders, setGroupedOrders] = useState([]);
  const [finalOrderExists, setFinalOrderExists] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    ensureSessionId();
  }, []);

  // FETCH ALL ORDERS FOR THIS SESSION
  useEffect(() => {
    if (!sessionId || !token) return;

    const fetchOrders = async () => {
      try {
        const res = await axios.get(`${url}/api/order/user`, {
          headers: { token },
        });

        if (res.data?.success) {
          const allUserOrders = res.data.orders || [];

          // filter by sessionId
          const sessionOrders = allUserOrders.filter(
            (o) => o.sessionId === sessionId
          );

          if (sessionOrders.length === 0) {
            setGroupedOrders([]);
            setTotalAmount(0);
            setLoading(false);
            return;
          }

          const adhocOrders = sessionOrders.filter(
            (o) => o.orderType === "adhoc"
          );

          const finalOrders = sessionOrders.filter(
            (o) => o.orderType === "final"
          );

          setFinalOrderExists(finalOrders.length > 0);

          // compute combined total from adhoc orders
          const total = adhocOrders.reduce(
            (sum, o) => sum + Number(o.amount || 0),
            0
          );

          setGroupedOrders(adhocOrders);
          setTotalAmount(total);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load bill");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [sessionId, token, url]);

  // FINALIZE THE BILL (convert adhoc → final)
  const handleFinalizeBill = async () => {
    try {
      const res = await axios.post(
        `${url}/api/order/adhoc-to-final`,
        { sessionId },
        { headers: { token } }
      );

      if (res.data?.success) {
        toast.success("Final bill generated! Please pay at counter.");
        navigate("/myorders");
      } else {
        toast.error(res.data?.message || "Error finalizing bill");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error");
    }
  };

  if (loading)
    return (
      <div className="showbill-loading">
        <p>Loading bill...</p>
      </div>
    );

  if (groupedOrders.length === 0)
    return (
      <div className="showbill-empty">
        <h2>No pending bills</h2>
        <button onClick={() => navigate("/")}>Go Back</button>
      </div>
    );

  return (
    <div className="showbill container">
      <h2>Your Bill</h2>

      <div className="showbill-orders">
        {groupedOrders.map((order, idx) => (
          <div key={order._id} className="showbill-card">
            <h4>Order {idx + 1}</h4>
            <p>
              <b>Items:</b>
            </p>
            <ul>
              {order.items.map((item, i) => (
                <li key={i}>
                  {item.name} x {item.quantity} — ₹
                  {Number(item.price) * Number(item.quantity)}
                </li>
              ))}
            </ul>
            <p>
              <b>Subtotal:</b> ₹{order.amount}
            </p>
            <p className="showbill-type">
              <span className="adhoc-tag">Adhoc</span>
            </p>
          </div>
        ))}
      </div>

      <div className="showbill-total-box">
        <h3>Total Pending Amount: ₹{totalAmount}</h3>

        {!finalOrderExists ? (
          <button className="finalize-btn" onClick={handleFinalizeBill}>
            Finalize & Pay Bill
          </button>
        ) : (
          <p className="already-final">Final bill already created.</p>
        )}
      </div>
    </div>
  );
};

export default ShowBill;
