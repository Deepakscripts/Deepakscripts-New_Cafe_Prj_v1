// frontend/src/pages/MyOrders/MyOrders.jsx
// ===============================================================
// NEW ORDER HISTORY PAGE + OUTSTANDING BILL MODAL
// - Works with new backend /api/order/user & /outstanding
// - Shows all orders for logged-in user
// - Outstanding Bill Modal replaces ShowBill page
// ===============================================================

import React, { useContext, useEffect, useState } from "react";
import "./MyOrders.css";
import axios from "axios";
import { StoreContext } from "../../Context/StoreContext";
import { assets } from "../../assets/assets";
import { toast } from "react-toastify";

import OutstandingBillModal from "../../components/OutstandingBillModal/OutstandingBillModal";


// Allowed statuses
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

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  // Outstanding bill
  const [unpaidOrders, setUnpaidOrders] = useState([]);
  const [totalUnpaid, setTotalUnpaid] = useState(0);
  const [showBillModal, setShowBillModal] = useState(false);

  const { url, token, currency } = useContext(StoreContext);

  // ---------------------------------------------------------------
  // FETCH ORDERS
  // ---------------------------------------------------------------
  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${url}/api/order/user`, {
        headers: { token },
      });

      if (res.data?.success) {
        setOrders(res.data.orders || []);
      } else {
        toast.error("Unable to load orders");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load orders");
    }
  };

  // ---------------------------------------------------------------
  // FETCH OUTSTANDING BILL
  // ---------------------------------------------------------------
  const fetchOutstanding = async () => {
    try {
      const res = await axios.get(`${url}/api/order/outstanding`, {
        headers: { token },
      });

      if (res.data?.success) {
        const list = res.data.orders || [];
        setUnpaidOrders(list);
        const total = list.reduce(
          (sum, o) => sum + Number(o.amount || 0),
          0
        );
        setTotalUnpaid(total);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------------------------------------------------------
  // TRACK ORDER
  // ---------------------------------------------------------------
  const trackOrder = async (orderId) => {
    setLoadingId(orderId);
    await fetchOrders();
    setLoadingId(null);
  };

  // ---------------------------------------------------------------
  // PAY BILL
  // ---------------------------------------------------------------
  const handlePayBill = async () => {
    try {
      const unpaidIds = unpaidOrders.map((o) => o._id);

      if (unpaidIds.length === 0) {
        toast.info("No unpaid orders!");
        return;
      }

      const res = await axios.post(
        `${url}/api/order/payrequest`,
        { orderIds: unpaidIds },
        { headers: { token } }
      );

      if (res.data?.success) {
        toast.success("Payment request sent to admin!");
        setShowBillModal(false);
        await fetchOutstanding();
      } else {
        toast.error(res.data?.message || "Could not request bill");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to request payment");
    }
  };

  // ---------------------------------------------------------------
  // LOAD ORDERS + OUTSTANDING BILL
  // ---------------------------------------------------------------
  useEffect(() => {
    if (token) {
      fetchOrders();
      fetchOutstanding();
    }
  }, [token]);

  return (
    <div className="my-orders">
      <h2>My Orders</h2>

      {/* Outstanding Bill Summary Button */}
      {unpaidOrders.length > 0 && (
        <div className="bill-summary">
          <h3>
            Pending Amount: {currency}
            {totalUnpaid}
          </h3>

          <button
            className="paybill-btn"
            onClick={() => setShowBillModal(true)}
          >
            View / Pay Bill
          </button>
        </div>
      )}

      {/* Orders List */}
      <div className="container">
        {orders.map((order) => {
          const items = Array.isArray(order.items) ? order.items : [];

          const itemsText =
            items.length === 0
              ? "No items"
              : items
                .map(
                  (item, idx) =>
                    `${item?.name || item?.itemId || "Item"} x ${item?.quantity || 0
                    }`
                )
                .join(", ");

          const { label, color } = normalizeStatus(order.status);
          const amount = Number(order.amount || 0).toFixed(2);

          return (
            <div key={order._id} className="my-orders-order">
              <img src={assets.parcel_icon} alt="" />

              <p className="items-line">{itemsText}</p>

              <p className="amount">
                {currency}
                {amount}
              </p>

              <p className="count">Items: {items.length}</p>

              <p className="status">
                <span
                  className="status-dot"
                  style={{ background: color }}
                />
                <b className="status-label">{label}</b>
              </p>

              <button
                onClick={() => trackOrder(order._id)}
                disabled={loadingId === order._id}
                className={loadingId === order._id ? "loading" : ""}
              >
                {loadingId === order._id ? "Updating…" : "Track Order"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Outstanding Bill Modal */}
      <OutstandingBillModal
        visible={showBillModal}
        onClose={() => setShowBillModal(false)}
        outstandingOrders={unpaidOrders}
        total={totalUnpaid}
        currency={currency}
        onConfirmPay={handlePayBill}
      />
    </div>
  );
};

export default MyOrders;
