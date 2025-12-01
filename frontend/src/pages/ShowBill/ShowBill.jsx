// frontend/src/pages/ShowBill/ShowBill.jsx
// ===============================================================
// SHOW BILL (NEW WORKFLOW)
// - Fetch all unpaid orders for logged-in user
// - Show combined bill
// - User clicks "Request Payment"
// - Admin receives socket notification
// ===============================================================

import React, { useContext, useEffect, useState } from "react";
import "./ShowBill.css";
import axios from "axios";
import { StoreContext } from "../../Context/StoreContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const ShowBill = () => {
  const { token, url } = useContext(StoreContext);

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);

  const navigate = useNavigate();

  /* ---------------------------------------------------
     LOAD OUTSTANDING ORDERS (paymentStatus = unpaid)
  --------------------------------------------------- */
  useEffect(() => {
    if (!token) {
      toast.error("Please login to view your bill");
      navigate("/cart");
      return;
    }

    const fetchOutstanding = async () => {
      try {
        setLoading(true);
        const res = await axios.get(url + "/api/order/outstanding", {
          headers: { token },
        });

        if (res.data?.success) {
          const list = res.data.orders || [];
          setOrders(list);
          setTotal(res.data.total || 0);
        } else {
          toast.error("Failed to load bill");
        }
      } catch (err) {
        console.error("ShowBill error:", err);
        toast.error("Failed to load bill");
      } finally {
        setLoading(false);
      }
    };

    fetchOutstanding();
  }, [token, url, navigate]);

  /* ---------------------------------------------------
     REQUEST PAYMENT
     (Marks all unpaid orders as paymentRequested = true)
  --------------------------------------------------- */
  const handleRequestPayment = async () => {
    try {
      const res = await axios.post(
        url + "/api/order/payrequest",
        {},
        { headers: { token } }
      );

      if (res.data?.success) {
        toast.success("Bill request sent to admin!");
        navigate("/myorders");
      } else {
        toast.error(res.data?.message || "Unable to send pay request");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error sending pay request");
    }
  };

  /* ---------------------------------------------------
     UI STATES
  --------------------------------------------------- */
  if (loading)
    return (
      <div className="showbill-loading">
        <p>Loading bill...</p>
      </div>
    );

  if (!orders.length)
    return (
      <div className="showbill-empty">
        <h2>No pending bills</h2>
        <button onClick={() => navigate("/")}>Go Back</button>
      </div>
    );

  /* ---------------------------------------------------
     DISPLAY OUTSTANDING ORDERS
  --------------------------------------------------- */
  return (
    <div className="showbill container">
      <h2>Your Pending Bill</h2>

      <div className="showbill-orders">
        {orders.map((order, i) => (
          <div key={order._id} className="showbill-card">
            <h4>Order {i + 1}</h4>

            <p><b>Items:</b></p>
            <ul>
              {order.items.map((item, idx) => (
                <li key={idx}>
                  {item.name} × {item.quantity} — ₹
                  {Number(item.price) * Number(item.quantity)}
                </li>
              ))}
            </ul>

            <p><b>Subtotal:</b> ₹{order.amount}</p>

            <p>
              <span className="unpaid-tag">Unpaid</span>
            </p>
          </div>
        ))}
      </div>

      <div className="showbill-total-box">
        <h3>Total Pending Amount: ₹{total}</h3>

        <button className="finalize-btn" onClick={handleRequestPayment}>
          Request Bill Payment
        </button>
      </div>
    </div>
  );
};

export default ShowBill;
