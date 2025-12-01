// frontend/src/pages/ShowBill/ShowBill.jsx
// ===============================================================
// SHOW BILL (REAL-TIME VERSION)
// - Auto-updates when admin marks paid
// - Auto-updates when new orders come in
// - Auto-updates on status updates & bill requests
// - No refresh required
// ===============================================================

import React, { useContext, useEffect, useState } from "react";
import "./ShowBill.css";
import axios from "axios";
import { StoreContext } from "../../Context/StoreContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

// ⭐ Import socket instance (same as MyOrders)
import { socket } from "../../App";

const ShowBill = () => {
  const { token, url } = useContext(StoreContext);

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);

  const navigate = useNavigate();

  /* ---------------------------------------------------
     LOAD OUTSTANDING ORDERS (unpaid only)
  --------------------------------------------------- */
  const fetchOutstanding = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${url}/api/order/outstanding`, {
        headers: { token },
      });

      if (res.data?.success) {
        const list = res.data.orders || [];
        setOrders(list);
        setTotal(res.data.total || 0);

        // If admin marks paid → bill becomes empty → redirect user
        if (list.length === 0) {
          toast.success("Your bill has been paid!");
          navigate("/myorders");
        }
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

  /* ---------------------------------------------------
     INITIAL LOAD
  --------------------------------------------------- */
  useEffect(() => {
    if (!token) {
      toast.error("Please login to view your bill");
      navigate("/cart");
      return;
    }

    fetchOutstanding();
  }, [token]);

  /* ---------------------------------------------------
     REAL-TIME SOCKET SYNC (live updates)
  --------------------------------------------------- */
  useEffect(() => {
    if (!token) return;

    // New order created → recheck unpaid bill in case user adds new order
    socket.on("order.created", () => {
      fetchOutstanding();
    });

    // Status updated → may affect bill screen (but mostly admin side)
    socket.on("order.updated", () => {
      fetchOutstanding();
    });

    // Bill requested (by same user or admin acknowledges)
    socket.on("order.payRequested", () => {
      fetchOutstanding();
    });

    // ADMIN MARKS PAID → close this screen immediately
    socket.on("order.paid", () => {
      toast.success("Your bill has been paid!");
      fetchOutstanding();
    });

    return () => {
      socket.off("order.created");
      socket.off("order.updated");
      socket.off("order.payRequested");
      socket.off("order.paid");
    };
  }, [token]);

  /* ---------------------------------------------------
     REQUEST PAYMENT
  --------------------------------------------------- */
  const handleRequestPayment = async () => {
    try {
      const res = await axios.post(
        `${url}/api/order/payrequest`,
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
        <button onClick={() => navigate("/myorders")}>Back</button>
      </div>
    );

  /* ---------------------------------------------------
     DISPLAY OUTSTANDING ORDERS
  --------------------------------------------------- */
  return (
    <div className="showbill container">
      <h2>Your Pending Bill</h2>

      <div className="showbill-orders">
        {orders.map((order, index) => (
          <div key={order._id} className="showbill-card">
            <h4>Order {index + 1}</h4>

            <p><b>Items:</b></p>
            <ul>
              {order.items.map((item, i) => (
                <li key={i}>
                  {item.name} × {item.quantity} — ₹
                  {Number(item.price) * Number(item.quantity)}
                </li>
              ))}
            </ul>

            <p><b>Subtotal:</b> ₹{order.amount}</p>
            <p><span className="unpaid-tag">Unpaid</span></p>
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
