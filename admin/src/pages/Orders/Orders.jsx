// admin/src/pages/Orders/Orders.jsx
// ==================================================================
// ADMIN ORDER PANEL — OPEN ACCESS VERSION
// No JWT, No x-admin-key, No role checks
// Includes:
//  - Real-time Pay Request alerts
//  - Modal popup for bill requests
//  - Sound Alert + Desktop Notification
//  - Blink highlight for rows with paymentRequested
// ==================================================================

import React, { useEffect, useState, useRef } from "react";
import "./Orders.css";
import "./InlinePrint.css";

import axios from "axios";
import { toast } from "react-toastify";
import { url } from "../../assets/assets";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { io } from "socket.io-client";
import { format, parseISO } from "date-fns";

/* ---------------------- SOCKET (NO AUTH) ------------------ */
/* Use the same `url` that axios uses to avoid mismatch between socket & REST */
const API_BASE = (url && String(url).replace(/\/$/, "")) || "http://localhost:4000";

const socket = io(API_BASE, {
  transports: ["websocket"],
  withCredentials: true,
});

/* ---------------------- HELPERS --------------------------- */
const safeStatus = (v) => (v ? String(v).toUpperCase() : "PENDING");
const safePaymentStatus = (v) => (v ? String(v).toUpperCase() : "UNPAID");

const currency = (n) => `₹${Number(n || 0).toFixed(2)}`;

const alertSound = typeof window !== "undefined" ? new Audio("/alert.mp3") : null;

/* Desktop Notification permission */
if (typeof Notification !== "undefined") {
  Notification.requestPermission().catch(() => {});
}

/* ---------------------- TODAY ISO ------------------------- */
function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

/* ---------------------- QS HELPER ------------------------- */
function qs(obj) {
  const entries = Object.entries(obj).filter(([_, v]) => v !== "" && v !== undefined && v !== null);
  if (entries.length === 0) return "";
  return (
    "?" +
    entries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&")
  );
}

/* ---------------------- DATE RANGE PICKER ----------------- */
function DateRange({ from, to, onChange }) {
  const toDateObj = (iso) => (iso ? parseISO(iso) : null);
  const toISO = (d) => (d ? format(d, "yyyy-MM-dd") : "");

  return (
    <div className="control">
      <label>Date Range</label>

      <div className="control-row daterow">
        <DatePicker
          selected={toDateObj(from)}
          onChange={(d) => onChange({ from: d ? toISO(d) : "" })}
          dateFormat="dd-MM-yyyy"
          className="date-input"
        />

        <span>to</span>

        <DatePicker
          selected={toDateObj(to)}
          onChange={(d) => onChange({ to: d ? toISO(d) : "" })}
          dateFormat="dd-MM-yyyy"
          className="date-input"
        />
      </div>
    </div>
  );
}

/* ---------------------- PRINTABLE TICKET ------------------ */
function PrintableTicket({ order }) {
  if (!order) return null;

  const created = new Date(order.createdAt || Date.now());
  const two = (n) => String(n).padStart(2, "0");

  const ts = `${created.getDate()}-${two(created.getMonth() + 1)}-${created.getFullYear()} ${two(
    created.getHours()
  )}:${two(created.getMinutes())}`;

  const totalQty = (order.items || []).reduce((s, i) => s + Number(i.quantity || 0), 0);

  const amount = Number(order.amount || 0).toFixed(2);

  return (
    <div className="ticket-root printable">
      <div className="ticket">
        <div className="ticket-header">
          <div className="brand">MOMO MAGIC</div>
          <div className="sub">Order Ticket</div>
        </div>

        <div className="ticket-meta">
          <div>Status: {safeStatus(order.status)}</div>
          <div>Table: {order.tableNumber}</div>
          <div>Time: {ts}</div>
        </div>

        <div className="ticket-sep" />

        <div className="ticket-items">
          <div className="row head">
            <div className="col qty">QTY</div>
            <div className="col name">ITEM</div>
            <div className="col price">AMT</div>
          </div>

          {(order.items || []).map((it, i) => (
            <div key={i} className="row">
              <div className="col qty">{it.quantity}</div>
              <div className="col name">{it.name}</div>
              <div className="col price">₹{Number(it.price) * Number(it.quantity)}</div>
            </div>
          ))}
        </div>

        <div className="ticket-sep dotted" />

        <div className="ticket-totals">
          <div className="line">
            <span>Items</span>
            <span>{totalQty}</span>
          </div>

          <div className="line total">
            <span>Total</span>
            <span>₹{amount}</span>
          </div>
        </div>

        <div className="ticket-footer">
          <div>
            Customer: {order.firstName || "Customer"} {order.lastName || ""}
          </div>
        </div>

        <div className="cut">────── cut here ───────</div>
      </div>
    </div>
  );
}

/* ---------------------- MAIN COMPONENT ------------------- */
const Orders = () => {
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [printOrder, setPrintOrder] = useState(null);
  const [highlighted, setHighlighted] = useState([]);

  const [payModal, setPayModal] = useState(null);

  // keep a stable reference to the handler so we can remove it cleanly
  const payRequestedHandlerRef = useRef();

  /* ---------------- FETCH ORDERS ---------------- */
  const fetchOrders = async () => {
    try {
      setLoading(true);

      // NOTE: changed endpoint to match backend route `/list-orders`
      const endpoint = `${(url || "").replace(/\/$/, "")}/api/order/list-orders${qs({ from, to })}`;

      const r = await axios.get(endpoint);

      // log for debugging (so you can see status / data)
      // eslint-disable-next-line no-console
      console.log("Orders fetch:", endpoint, r.status, r.data);

      setOrders(r.data?.orders || []);
    } catch (err) {
      // show toast & log the error response for debugging
      // eslint-disable-next-line no-console
      console.error("Failed to fetch orders:", err?.response || err);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  /* ---------------- SOCKET ---------------- */
  useEffect(() => {
    const onCreated = () => fetchOrders();
    const onUpdated = () => fetchOrders();
    const onPaid = () => fetchOrders();

    const onPayRequested = (payload) => {
      const { tableNumber, orders: ords } = payload || {};

      try {
        if (alertSound) alertSound.play().catch(() => {});
      } catch (e) {
        // ignore
      }

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Bill Requested", {
          body: `Table ${tableNumber} requested the bill.`,
        });
      }

      toast.info(`Table ${tableNumber} requested the bill`);

      setHighlighted((_) => (ords ? ords.map((o) => o._id) : []));
      setPayModal({ tableNumber, orders: ords });

      fetchOrders();
    };

    // store ref so we can remove exact handler
    payRequestedHandlerRef.current = onPayRequested;

    socket.on("order.created", onCreated);
    socket.on("order.updated", onUpdated);
    socket.on("order.paid", onPaid);
    socket.on("order.payRequested", onPayRequested);

    return () => {
      socket.off("order.created", onCreated);
      socket.off("order.updated", onUpdated);
      socket.off("order.paid", onPaid);
      if (payRequestedHandlerRef.current) {
        socket.off("order.payRequested", payRequestedHandlerRef.current);
      } else {
        socket.off("order.payRequested");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- UPDATE STATUS ---------------- */
  const updateStatus = async (orderId, status) => {
    try {
      const r = await axios.post(`${(url || "").replace(/\/$/, "")}/api/order/updatestatus`, {
        orderId,
        status,
      });

      if (r.data?.success) {
        toast.success("Status updated");
        fetchOrders();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to update status:", err?.response || err);
      toast.error("Failed to update");
    }
  };

  /* ---------------- MARK PAID ---------------- */
  const handleMarkPaid = async (ordersArray) => {
    const ids = ordersArray.map((o) => o._id);

    try {
      const r = await axios.post(`${(url || "").replace(/\/$/, "")}/api/order/markpaid`, {
        orderIds: ids,
      });

      if (r.data?.success) {
        toast.success("Marked paid");
        fetchOrders();
        setPayModal(null);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to mark paid:", err?.response || err);
      toast.error("Failed to mark paid");
    }
  };

  /* ---------------- PRINT ---------------- */
  useEffect(() => {
    if (!printOrder) return;

    const after = () => setPrintOrder(null);
    const t = setTimeout(() => window.print(), 30);

    window.addEventListener("afterprint", after);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", after);
    };
  }, [printOrder]);

  /* ---------------- RENDER ---------------- */
  return (
    <div className="orders">
      {printOrder && <PrintableTicket order={printOrder} />}

      {/* Pay Request Modal */}
      {payModal && (
        <div className="pay-modal">
          <div className="pay-modal-content">
            <h2>Bill Requested</h2>
            <p>
              <b>Table {payModal.tableNumber}</b> requested the bill.
            </p>

            <h3>Orders:</h3>
            <ul>
              {payModal.orders &&
                payModal.orders.map((o) => (
                  <li key={o._id}>
                    Order #{o._id.slice(-6)} – ₹{o.amount}
                  </li>
                ))}
            </ul>

            <div className="pm-actions">
              <button onClick={() => handleMarkPaid(payModal.orders)}>Mark All Paid</button>
              <button className="pm-close" onClick={() => setPayModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="orders-head">
        <h3>Orders</h3>
        <DateRange
          from={from}
          to={to}
          onChange={({ from: f, to: t }) => {
            if (f !== undefined) setFrom(f);
            if (t !== undefined) setTo(t);
          }}
        />
      </div>

      {loading ? (
        <div className="loader">Loading…</div>
      ) : (
        <>
          <div className="orders-count">{orders.length} orders</div>

          {orders.map((order) => {
            const isHighlighted = highlighted.includes(order._id);

            return (
              <div className={`order ${isHighlighted ? "blink-highlight" : ""}`} key={order._id}>
                <div className="order-content">
                  <p className="order-items">
                    {(order.items || []).map((i) => `${i.name} x ${i.quantity}`).join(", ")}
                  </p>

                  <p className="order-customer">
                    {order.firstName || "Customer"} {order.lastName || ""}
                  </p>

                  <div className="tags">
                    <span className={`chip pay-${order.paymentStatus}`}>{safePaymentStatus(order.paymentStatus)}</span>
                  </div>

                  <div className="order-meta">
                    <span className="chip">Table: {order.tableNumber}</span>
                    <span className="chip">
                      Items:{" "}
                      {(order.items || []).reduce((n, i) => n + Number(i.quantity || 0), 0)}
                    </span>
                    <span className="chip">Total: {currency(order.amount)}</span>
                    <span className="chip ts">{new Date(order.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="order-actions">
                  <button className="btn btn-print" onClick={() => setPrintOrder(order)}>
                    Print
                  </button>

                  <select
                    className="order-status"
                    value={order.status || "pending"}
                    onChange={(e) => updateStatus(order._id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="served">Served</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  {order.paymentStatus !== "paid" && (
                    <button className="btn btn-paid" onClick={() => handleMarkPaid([order])}>
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default Orders;
