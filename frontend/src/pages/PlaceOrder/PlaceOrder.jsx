// frontend/src/pages/PlaceOrder/PlaceOrder.jsx
// ===============================================================
// FINAL ORDER FLOW (NO ADHOC)
// - Ask customer info only on FIRST order
// - Auto-fetch user profile
// - Hide name/email for repeat users
// - Table number required every time
// - Every order is unpaid until Pay Bill
// ===============================================================

import React, { useContext, useEffect, useMemo, useState } from "react";
import "./PlaceOrder.css";
import { StoreContext } from "../../Context/StoreContext";
import { useNavigate } from "react-router-dom";
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
  } = useContext(StoreContext);

  const navigate = useNavigate();

  // -------------------------------------------------------------
  // USER PROFILE (AUTO-LOADED)
  // -------------------------------------------------------------
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Only for FIRST ORDER
  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    tableNumber: "",
  });

  const onChangeHandler = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  // -------------------------------------------------------------
  // FETCH USER PROFILE
  // -------------------------------------------------------------
  useEffect(() => {
    if (!token) return;

    const loadProfile = async () => {
      try {
        const res = await axios.get(url + "/api/user/me", {
          headers: { token },
        });

        if (res.data?.success) {
          setProfile(res.data.user || null);
        }
      } catch (err) {
        console.error("Profile load error:", err);
      }
      setLoadingProfile(false);
    };

    loadProfile();
  }, [token]);

  // -------------------------------------------------------------
  // CART TOTALS
  // -------------------------------------------------------------
  const clientCart = useMemo(
    () => buildClientCartSnapshot(),
    [buildClientCartSnapshot]
  );

  const cartSubtotal = useMemo(() => getTotalCartAmount(), [getTotalCartAmount]);
  const cheeseTotal = useMemo(() => getAddOnTotal(), [getAddOnTotal]);
  const grandTotal = useMemo(() => getGrandTotal(), [getGrandTotal]);

  // -------------------------------------------------------------
  // PLACE ORDER HANDLER
  // -------------------------------------------------------------
  const placeOrder = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error("Please sign in to place order");
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

    // Determine if customer info is missing → first order
    const isFirstOrder =
      !profile?.firstName ||
      !profile?.lastName ||
      profile.firstName.trim() === "" ||
      profile.lastName.trim() === "";

    if (isFirstOrder) {
      if (!data.firstName.trim() || !data.lastName.trim()) {
        toast.error("First name & last name are required");
        return;
      }
    }

    try {
      // Payload for backend
      const payload = {
        firstName: isFirstOrder ? data.firstName.trim() : profile.firstName,
        lastName: isFirstOrder ? data.lastName.trim() : profile.lastName,
        email: isFirstOrder ? (data.email || "") : profile.email,
        tableNumber: Number(data.tableNumber),
        items: clientCart,
        orderType: "order",
        paymentStatus: "unpaid",
        notes: "",
      };

      // Save profile FIRST TIME only
      if (isFirstOrder) {
        await axios.post(
          url + "/api/user/update-profile",
          {
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: payload.email,
          },
          { headers: { token } }
        );
      }

      // Create order
      const res = await axios.post(url + "/api/order/place", payload, {
        headers: { token },
      });

      if (res.data?.success) {
        toast.success("Order placed successfully!");
        await clearCart();
        navigate("/myorders");
      } else {
        toast.error(res.data?.message || "Could not place order");
      }
    } catch (err) {
      console.error("placeOrder error:", err);
      toast.error("Error placing order");
    }
  };

  // -------------------------------------------------------------
  // REDIRECTS
  // -------------------------------------------------------------
  useEffect(() => {
    if (!token) navigate("/cart");
    if (cartSubtotal <= 0) navigate("/cart");
  }, [token, cartSubtotal, navigate]);

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  if (loadingProfile)
    return <div className="place-order">Loading...</div>;

  const isFirstOrder =
    !profile?.firstName || !profile?.lastName;

  return (
    <form className="place-order" onSubmit={placeOrder}>
      {/* LEFT SIDE */}
      <div className="place-order-left">
        <p className="title">Customer Info</p>

        {/* FIRST ORDER → ask all fields */}
        {isFirstOrder && (
          <>
            <div className="multi-field">
              <input
                type="text"
                name="firstName"
                placeholder="First name"
                onChange={onChangeHandler}
                value={data.firstName}
                required
              />

              <input
                type="text"
                name="lastName"
                placeholder="Last name"
                onChange={onChangeHandler}
                value={data.lastName}
                required
              />
            </div>

            <input
              type="email"
              name="email"
              placeholder="Email (optional)"
              onChange={onChangeHandler}
              value={data.email}
            />
          </>
        )}

        {/* NEXT ORDERS → show saved info */}
        {!isFirstOrder && (
          <div className="existing-profile">
            <p>
              <b>Name:</b> {profile.firstName} {profile.lastName}
            </p>
            {profile.email && (
              <p>
                <b>Email:</b> {profile.email}
              </p>
            )}
          </div>
        )}

        {/* TABLE NUMBER ALWAYS REQUIRED */}
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

        <div className="payment">
          <h2>Payment Method</h2>
          <div className="payment-option active">
            <span className="dot">●</span>
            <p>Pay on Counter</p>
          </div>
        </div>

        <button className="place-order-submit" type="submit">
          Place Order
        </button>
      </div>
    </form>
  );
};

export default PlaceOrder;
