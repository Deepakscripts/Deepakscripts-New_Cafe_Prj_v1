// frontend/src/pages/PlaceOrder/PlaceOrder.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import "./PlaceOrder.css";
import { StoreContext } from "../../Context/StoreContext";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";

const PlaceOrder = () => {
  const {
    getTotalCartAmount,
    getAddOnTotal,
    getGrandTotal,
    buildClientCartSnapshot,
    clearCart,
    token,
    url,
    currency,
    sessionId,
    ensureSessionId,
  } = useContext(StoreContext);

  const navigate = useNavigate();
  const location = useLocation();

  // detect whether this page was opened as ?adhoc=1
  const params = new URLSearchParams(location.search);
  const isAdhoc = params.get("adhoc") === "1";

  // ------------------------------
  // Customer Data (only needed for FINAL order)
  // ------------------------------
  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    tableNumber: "",
  });

  const onChangeHandler = (event) => {
    const { name, value } = event.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  // ------------------------------
  // Cart Snapshots and Totals
  // ------------------------------
  const clientCart = useMemo(
    () => buildClientCartSnapshot(),
    [buildClientCartSnapshot]
  );

  const cartSubtotal = useMemo(() => getTotalCartAmount(), [getTotalCartAmount]);
  const cheeseTotal = useMemo(() => getAddOnTotal(), [getAddOnTotal]);
  const grandTotal = useMemo(() => getGrandTotal(), [getGrandTotal]);

  // ------------------------------
  // PLACE ORDER HANDLER
  // ------------------------------
  const placeOrder = async (e) => {
    e.preventDefault();

    ensureSessionId(); // ensure grouping id exists

    if (!token) {
      toast.error("Please sign in to place an order");
      navigate("/cart");
      return;
    }

    if (cartSubtotal <= 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (!data.tableNumber) {
      toast.error("Please select table number");
      return;
    }

    // FINAL ORDER requires name + last name
    if (!isAdhoc) {
      if (!data.firstName.trim() || !data.lastName.trim()) {
        toast.error("First name & last name are required");
        return;
      }
    }

    try {
      // use backend fields
      const payload = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: (data.email || "").trim(),
        tableNumber: Number(data.tableNumber),
        items: clientCart,
        sessionId,
        notes: "",
      };

      let endpoint = "";
      if (isAdhoc) {
        endpoint = "/api/order/placeadhoc";
      } else {
        endpoint = "/api/order/placecod";
        payload.paymentMethod = "POC";
      }

      const response = await axios.post(url + endpoint, payload, {
        headers: { token },
        validateStatus: () => true,
      });

      // token expired case
      if (response.status === 401) {
        localStorage.removeItem("token");
        toast.error("Session expired. Please login again.");
        navigate("/cart");
        return;
      }

      if (response.data?.success) {
        // reset cart & addons
        await clearCart();

        if (isAdhoc) {
          toast.success("Adhoc order placed successfully!");
          navigate("/myorders");
        } else {
          toast.success("Final order placed! Please pay on counter.");
          navigate("/myorders");
        }
      } else {
        toast.error(response.data?.message || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error placing order");
    }
  };

  // ------------------------------
  // Redirect if cart empty or not logged in
  // ------------------------------
  useEffect(() => {
    if (!token) {
      toast.error("Please sign in to place an order");
      navigate("/cart");
      return;
    }
    if (cartSubtotal <= 0) {
      navigate("/cart");
    }
  }, [token, cartSubtotal, navigate]);

  return (
    <form onSubmit={placeOrder} className="place-order">
      {/* LEFT SIDE */}
      <div className="place-order-left">
        <p className="title">
          {isAdhoc ? "Adhoc Order (Quick Order)" : "Customer Info"}
        </p>

        {/* FINAL ORDER → Ask for name & email */}
        {!isAdhoc && (
          <>
            <div className="multi-field">
              <input
                type="text"
                name="firstName"
                onChange={onChangeHandler}
                value={data.firstName}
                placeholder="First name"
                required={!isAdhoc}
              />
              <input
                type="text"
                name="lastName"
                onChange={onChangeHandler}
                value={data.lastName}
                placeholder="Last name"
                required={!isAdhoc}
              />
            </div>

            <input
              type="email"
              name="email"
              onChange={onChangeHandler}
              value={data.email}
              placeholder="Email address (optional)"
            />
          </>
        )}

        {/* TABLE NUMBER (required always) */}
        <div className="multi-field">
          <select
            name="tableNumber"
            value={data.tableNumber}
            onChange={onChangeHandler}
            required
          >
            <option value="" disabled>
              Table Number
            </option>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="place-order-right">
        <div className="cart-total">
          <h2>Cart Totals</h2>

          <div>
            <div className="cart-total-details">
              <p>Subtotal</p>
              <p>
                {currency}
                {cartSubtotal}
              </p>
            </div>

            {cheeseTotal > 0 && (
              <>
                <hr />
                <div className="cart-total-details">
                  <p>Extra Cheese</p>
                  <p>
                    {currency}
                    {cheeseTotal}
                  </p>
                </div>
              </>
            )}

            <hr />
            <div className="cart-total-details">
              <b>Total</b>
              <b>
                {currency}
                {grandTotal}
              </b>
            </div>
          </div>
        </div>

        {/* Payment always Pay on Counter */}
        <div className="payment">
          <h2>Payment Method</h2>
          <div className="payment-option active">
            <span className="dot">●</span>
            <p>POC (Pay On Counter)</p>
          </div>
        </div>

        <button className="place-order-submit" type="submit">
          {isAdhoc ? "Place Adhoc Order" : "Place Final Order"}
        </button>
      </div>
    </form>
  );
};

export default PlaceOrder;
