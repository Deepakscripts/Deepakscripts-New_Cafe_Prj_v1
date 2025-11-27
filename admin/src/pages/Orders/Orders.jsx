// food-del/admin/src/pages/Orders/Orders.jsx
import React, { useEffect, useState, useMemo } from "react";
import "./Orders.css";
import "./InlinePrint.css";

import axios from "axios";
import { toast } from "react-toastify";
import { url } from "../../assets/assets";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { io } from "socket.io-client";
import { format, parseISO } from "date-fns";

// ---------------------- SOCKET INIT ----------------------
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const socket = io(API_BASE, {
  transports: ["websocket"],
  withCredentials: true,
});

// ---------------------- SAFE HELPERS ----------------------
const safeUpper = (v, fallback = "") =>
  v ? String(v).toUpperCase() : fallback;

const safeStatus = (v) =>
  v ? String(v).toUpperCase() : "PENDING";

const safeOrderType = (v) =>
  v ? String(v).toUpperCase() : "UNKNOWN";

const safePaymentStatus = (v) =>
  v ? String(v).toUpperCase() : "UNPAID";

// ---------------------- HELPERS ----------------------
const todayISO = () => new Date().toISOString().slice(0, 10);
const currency = (n) => `₹${Number(n || 0)}`;

const qs = (obj) => {
  const p = [];
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      p.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
  });
  return p.length ? `?${p.join("&")}` : "";
};

// ---------------------- DATE RANGE ----------------------
function DateRange({ from, to, onChange }) {
  const toDateObj = (iso) => (iso ? parseISO(iso) : null);
  const toISO = (d) => (d ? format(d, "yyyy-MM-dd") : "");

  const [start, setStart] = useState(toDateObj(from));
  const [end, setEnd] = useState(toDateObj(to));

  useEffect(() => setStart(toDateObj(from)), [from]);
  useEffect(() => setEnd(toDateObj(to)), [to]);

  return (
    <div className="control">
      <label>Date range</label>
      <div className="control-row daterow">
        <DatePicker
          selected={start}
          onChange={(d) => {
            if (!d) {
              setStart(null);
              onChange({ from: "" });
              return;
            }
            setStart(d);
            onChange({ from: toISO(d) });
          }}
          dateFormat="dd-MM-yyyy"
          className="date-input"
        />
        <span>to</span>
        <DatePicker
          selected={end}
          onChange={(d) => {
            if (!d) {
              setEnd(null);
              onChange({ to: "" });
              return;
            }
            setEnd(d);
            onChange({ to: toISO(d) });
          }}
          dateFormat="dd-MM-yyyy"
          className="date-input"
        />
      </div>
    </div>
  );
}

// ---------------------- PRINTABLE TICKET ----------------------
function PrintableTicket({ order }) {
  if (!order) return null;

  const created = new Date(order.createdAt || Date.now());
  const two = (n) => String(n).padStart(2, "0");
  const ts = `${created.getDate()}-${two(created.getMonth() + 1)}-${created.getFullYear()} ${two(
    created.getHours()
  )}:${two(created.getMinutes())}`;

  const totalQty = (order.items || []).reduce((s, i) => s + Number(i.quantity || 0), 0);
  const amount = Number(order.mergedSessionAmount || order.amount || 0).toFixed(2);

  return (
    <div className="ticket-root printable">
      <div className="ticket">

        <div className="ticket-header">
          <div className="brand">MOMO MAGIC</div>
          <div className="sub">
            {order.orderType === "adhoc" ? "Adhoc Ticket" : "Final Ticket"}
          </div>
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

          {(order.items || []).map((it, idx) => (
            <div key={idx} className="row">
              <div className="col qty">{it.quantity}</div>
              <div className="col name">{it.name}</div>
              <div className="col price">
                ₹{Number(it.price * it.quantity).toFixed(2)}
              </div>
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
          <div>Customer: {order.firstName} {order.lastName}</div>
          <div>Status: {safeStatus(order.status)}</div>
        </div>

        <div className="cut">────── cut here ───────</div>

      </div>
    </div>
  );
}

// ---------------------- MAIN PAGE ----------------------
const Orders = () => {
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [printOrder, setPrintOrder] = useState(null);

  // ---------------- FETCH ----------------
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const r = await axios.get(`${url}/api/order/list${qs({ from, to })}`);
      setOrders(r.data?.orders || []);
    } catch (err) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [from, to]);

  // ---------------- SOCKET ----------------
  useEffect(() => {
    socket.on("order.created", ({ orderType }) => {
      toast.info(`New ${safeOrderType(orderType)} order received`);
      fetchOrders();
    });

    socket.on("order.updated", fetchOrders);

    return () => {
      socket.off("order.created");
      socket.off("order.updated");
    };
  }, []);

  // ---------------- UPDATE STATUS ----------------
  const updateStatus = async (orderId, status) => {
    try {
      const r = await axios.post(`${url}/api/order/status`, { orderId, status });
      if (r.data?.success) {
        toast.success("Status updated");
        fetchOrders();
      }
    } catch {
      toast.error("Failed to update");
    }
  };

  const markPaid = async (orderId) => {
    try {
      const r = await axios.post(`${url}/api/order/status`, {
        orderId,
        paymentStatus: "paid",
      });
      if (r.data?.success) {
        toast.success("Marked as paid");
        fetchOrders();
      }
    } catch {
      toast.error("Failed to mark paid");
    }
  };

  // ---------------- PRINT ----------------
  useEffect(() => {
    if (!printOrder) return;
    const afterPrint = () => setPrintOrder(null);
    const t = setTimeout(() => window.print(), 40);

    window.addEventListener("afterprint", afterPrint);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, [printOrder]);

  // ---------------- GROUP BY sessionId ----------------
  const grouped = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      const sid = o.sessionId || "no-session";
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid).push(o);
    }
    return Array.from(map.entries());
  }, [orders]);

  return (
    <div className="orders">

      {printOrder && <PrintableTicket order={printOrder} />}

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

          {grouped.map(([sessionId, list]) => (
            <div key={sessionId} className="session-block">
              <h4 className="session-title">
                Session: <span>{sessionId}</span>
              </h4>

              {list.map((order) => (
                <div className="order" key={order._id}>
                  <div className="order-content">

                    <p className="order-items">
                      {order.items.map((i) => `${i.name} x ${i.quantity}`).join(", ")}
                    </p>

                    <p className="order-customer">
                      {order.firstName || "Customer"} {order.lastName || ""}
                    </p>

                    {/* TAGS */}
                    <div className="tags">
                      <span className={`chip ${order.orderType}`}>
                        {safeOrderType(order.orderType)}
                      </span>

                      <span className={`chip pay-${order.paymentStatus}`}>
                        {safePaymentStatus(order.paymentStatus)}
                      </span>
                    </div>

                    <div className="order-meta">
                      <span className="chip">Email: {order.email || "—"}</span>
                      <span className="chip">Table: {order.tableNumber ?? "—"}</span>
                      <span className="chip">
                        Items: {order.items.reduce((n, i) => n + i.quantity, 0)}
                      </span>
                      <span className="chip">Total: {currency(order.amount)}</span>

                      {order.orderType === "final" && (
                        <span className="chip final-total">
                          Final Bill: {currency(order.mergedSessionAmount || order.amount)}
                        </span>
                      )}

                      <span className="chip ts">
                        {new Date(order.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="order-actions">
                    <button className="btn btn-print" onClick={() => setPrintOrder(order)}>
                      Print
                    </button>

                    <select
                      className="order-status"
                      value={order.status}
                      onChange={(e) => updateStatus(order._id, e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="preparing">Preparing</option>
                      <option value="ready">Ready</option>
                      <option value="served">Served</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    {order.paymentStatus !== "paid" && (
                      <button className="btn btn-paid" onClick={() => markPaid(order._id)}>
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default Orders;
