// frontend/src/pages/MyOrders/MyOrders.jsx
// ===============================================================
// FINAL VERSION — REAL-TIME + DATE FILTER + BILL VIEWER
// ===============================================================

import React, { useContext, useEffect, useState } from "react";
import "./MyOrders.css";
import axios from "axios";
import { StoreContext } from "../../Context/StoreContext";
import { assets } from "../../assets/assets";
import { toast } from "react-toastify";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import OutstandingBillModal from "../../components/OutstandingBillModal/OutstandingBillModal";
import BillModal from "../../components/BillModal/BillModal";

import { socket } from "../../App";

// ---------------------------------------------------------------
// STATUS MAP
// ---------------------------------------------------------------
const STATUS_META = {
  pending: { label: "Pending", color: "#f59e0b" },
  preparing: { label: "Preparing", color: "#ff7a00" },
  ready: { label: "Ready", color: "#0a84ff" },
  served: { label: "Served", color: "#0a8a0a" },
  cancelled: { label: "Cancelled", color: "#b40000" },
};

const normalizeStatus = (raw) => {
  const v = String(raw || "").toLowerCase().trim();
  return STATUS_META[v] || STATUS_META.pending;
};

// ---------------------------------------------------------------
// DATE HELPERS
// ---------------------------------------------------------------
const iso = (d) => {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const groupByDate = (orders) => {
  const map = {};
  for (const o of orders) {
    const key = iso(new Date(o.createdAt));
    if (!map[key]) map[key] = [];
    map[key].push(o);
  }

  return Object.keys(map)
    .sort((a, b) => new Date(b) - new Date(a))
    .map((date) => ({ date, orders: map[date] }));
};

// ---------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------
const MyOrders = () => {
  const { url, token, currency } = useContext(StoreContext);

  const [from, setFrom] = useState(new Date());
  const [to, setTo] = useState(new Date());

  const [grouped, setGrouped] = useState([]);
  const [loading, setLoading] = useState(false);

  const [unpaidOrders, setUnpaidOrders] = useState([]);
  const [totalUnpaid, setTotalUnpaid] = useState(0);
  const [showOutstandingModal, setShowOutstandingModal] = useState(false);

  const [showBillModal, setShowBillModal] = useState(null); // {date, orders}

  // ---------------------------------------------------------------
  // FETCH ORDERS (DATE-WISE)
  // ---------------------------------------------------------------
  const fetchOrders = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${url}/api/order/user/by-date?from=${iso(from)}&to=${iso(to)}`,
        { headers: { token } }
      );

      if (res.data?.success) {
        setGrouped(groupByDate(res.data.orders || []));
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------
  // FETCH OUTSTANDING
  // ---------------------------------------------------------------
  const fetchOutstanding = async () => {
    try {
      const res = await axios.get(`${url}/api/order/outstanding`, {
        headers: { token },
      });

      if (res.data?.success) {
        const orders = res.data.orders || [];
        setUnpaidOrders(orders);
        setTotalUnpaid(
          orders.reduce((s, o) => s + Number(o.amount || 0), 0)
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------------------------------------------------------
  // REQUEST BILL FOR OUTSTANDING ORDERS
  // ---------------------------------------------------------------
  const handleOutstandingPayment = async () => {
    try {
      const ids = unpaidOrders.map((o) => o._id);

      if (!ids.length) {
        toast.info("No unpaid orders");
        return;
      }

      const res = await axios.post(
        `${url}/api/order/payrequest`,
        { orderIds: ids },
        { headers: { token } }
      );

      if (res.data?.success) {
        toast.success("Payment request sent!");
        setShowOutstandingModal(false);
        fetchOutstanding();
      } else {
        toast.error(res.data?.message || "Could not request payment");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to request payment");
    }
  };

  // ---------------------------------------------------------------
  // INITIAL LOAD
  // ---------------------------------------------------------------
  useEffect(() => {
    if (token) {
      fetchOrders();
      fetchOutstanding();
    }
  }, [token]);

  // ---------------------------------------------------------------
  // REAL-TIME SOCKET UPDATES
  // ---------------------------------------------------------------
  useEffect(() => {
    if (!token) return;

    const refresh = () => {
      fetchOrders();
      fetchOutstanding();
    };

    socket.on("order.created", refresh);
    socket.on("order.updated", refresh);
    socket.on("order.payRequested", refresh);

    socket.on("order.paid", () => {
      toast.success("Your bill has been paid!");
      refresh();
    });

    return () => {
      socket.off("order.created", refresh);
      socket.off("order.updated", refresh);
      socket.off("order.payRequested", refresh);
      socket.off("order.paid", refresh);
    };
  }, [token]);

  // ---------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------
  return (
    <div className="my-orders-page container">

      <h2>My Orders</h2>

      {/* ------------------ FILTER ROW ------------------ */}
      <div className="filter-row">
        <div>
          <label>From</label>
          <DatePicker
            selected={from}
            onChange={(d) => setFrom(d)}
            className="date-input"
            dateFormat="dd-MM-yyyy"
          />
        </div>

        <div>
          <label>To</label>
          <DatePicker
            selected={to}
            onChange={(d) => setTo(d)}
            className="date-input"
            dateFormat="dd-MM-yyyy"
          />
        </div>

        <button className="filter-btn" onClick={fetchOrders}>
          Filter
        </button>

        {totalUnpaid > 0 && (
          <div className="outstanding-box">
            <p>
              Pending Amount: {currency}
              {totalUnpaid}
            </p>

            <button
              className="paybill-btn"
              onClick={() => setShowOutstandingModal(true)}
            >
              View / Pay Bill
            </button>
          </div>
        )}
      </div>

      {/* ------------------ ORDERS ------------------ */}
      {loading && <p>Loading…</p>}

      <div className="orders-by-date">
        {!loading && grouped.length === 0 && (
          <p>No orders found for this date range.</p>
        )}

        {grouped.map(({ date, orders }) => {
          const totalForDate = orders.reduce(
            (s, o) => s + Number(o.amount || 0),
            0
          );

          return (
            <div className="day-block" key={date}>
              <div className="day-header">
                <div>
                  <h3>{new Date(date).toLocaleDateString()}</h3>
                  <p className="small">Orders: {orders.length}</p>
                </div>

                <div className="day-actions">
                  <p>
                    Total: {currency}
                    {totalForDate}
                  </p>
                  <button
                    className="viewbill-btn"
                    onClick={() => setShowBillModal({ date, orders })}
                  >
                    View Bill
                  </button>
                </div>
              </div>

              <div className="day-orders-list">
                {orders.map((o) => {
                  const itemsText = (o.items || [])
                    .map((i) => `${i.name} x ${i.quantity}`)
                    .join(", ");

                  const { label, color } = normalizeStatus(o.status);

                  return (
                    <div key={o._id} className="order-row">
                      <div className="left">
                        <img src={assets.parcel_icon} alt="" />
                        <div>
                          <div className="items-line">{itemsText}</div>
                          <p className="small">
                            Table: {o.tableNumber || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="right">
                        <p className="amount">
                          {currency}
                          {Number(o.amount || 0).toFixed(2)}
                        </p>

                        <div className="status">
                          <span
                            className="status-dot"
                            style={{ background: color }}
                          />
                          <span className="status-label">{label}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ------------------ OUTSTANDING BILL MODAL ------------------ */}
      <OutstandingBillModal
        visible={showOutstandingModal}
        onClose={() => setShowOutstandingModal(false)}
        outstandingOrders={unpaidOrders}
        total={totalUnpaid}
        currency={currency}
        onConfirmPay={handleOutstandingPayment}
      />

      {/* ------------------ DATE BILL MODAL ------------------ */}
      {showBillModal && (
        <BillModal
          visible={true}
          onClose={() => setShowBillModal(null)}
          dateKey={showBillModal.date}
          ordersForDate={showBillModal.orders}
          currency={currency}
          onConfirmPay={null}
        />
      )}
    </div>
  );
};

export default MyOrders;
