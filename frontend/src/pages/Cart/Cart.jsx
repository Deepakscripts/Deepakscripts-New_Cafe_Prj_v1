// frontend/src/pages/Cart/Cart.jsx
// ==========================================================
// CART PAGE WITH CHEESE ADD-ONS (RETAINED)
// - No guest mode
// - No adhoc flow
// - Logged-in only
// - Cheese add-ons for Pasta & Moburg supported
// ==========================================================

import React, { useContext, useMemo } from "react";
import "./Cart.css";
import { StoreContext } from "../../Context/StoreContext";
import { useNavigate } from "react-router-dom";

const CHEESE_PRICE = 20;

const Cart = () => {
  const {
    cartItems,
    food_list,
    addToCart,
    removeFromCart,
    getTotalCartAmount,
    currency,
    deliveryCharge,

    // Add-ons
    cheeseAddOns,
    updateCheeseAddOns,
    getAddOnTotal,
  } = useContext(StoreContext);

  const navigate = useNavigate();

  /* ============================================================
     FILTER CART ITEMS
  ============================================================ */
  const cartData = useMemo(() => {
    if (!Array.isArray(food_list) || !cartItems) return [];
    return food_list.filter((item) => {
      const id = String(item._id);
      return Number(cartItems[id] || 0) > 0;
    });
  }, [food_list, cartItems]);

  /* ============================================================
     CATEGORY GETTER (required for cheese limits)
  ============================================================ */
  const getCategory = (item) => {
    return (
      item.category ||
      item.categoryName ||
      item.menu_category ||
      item.menu_name ||
      ""
    ).toLowerCase();
  };

  /* ============================================================
     CALCULATE MAX ADD-ONS PER CATEGORY
  ============================================================ */
  const categoryQty = (needle) =>
    cartData.reduce((sum, item) => {
      const id = String(item._id);
      const qty = Number(cartItems[id] || 0);
      return getCategory(item).includes(needle) ? sum + qty : sum;
    }, 0);

  const pastaMax = categoryQty("pasta");
  const moburgMax = categoryQty("moburg");

  /* ============================================================
     TOTALS
  ============================================================ */
  const subtotal = getTotalCartAmount();
  const addOnTotal = getAddOnTotal();
  const total =
    subtotal === 0 ? 0 : subtotal + deliveryCharge + addOnTotal;

  const isCartEmpty = subtotal === 0;

  return (
    <div className="cart">
      {/* LEFT SIDE: ITEMS LIST */}
      <div className="cart-items">
        <div className="cart-items-title">
          <p>#</p>
          <p>Title</p>
          <p>Price</p>
          <p>Quantity</p>
          <p>Total</p>
          <p>Action</p>
        </div>

        <br />
        <hr />

        {/* EMPTY CART */}
        {cartData.length === 0 && (
          <div style={{ padding: "2rem 0", textAlign: "center", color: "#666" }}>
            Your cart is empty.
          </div>
        )}

        {/* CART ITEMS */}
        {cartData.map((item, index) => {
          const id = String(item._id);
          const qty = Number(cartItems[id] || 0);

          return (
            <div key={id}>
              <div className="cart-items-title cart-items-item">
                {/* Serial */}
                <p>{index + 1}.</p>

                {/* Name */}
                <p className="cart-title">{item.name}</p>

                {/* Price */}
                <p>
                  {currency}
                  {item.price}
                </p>

                {/* Quantity */}
                <div className="cart-qty-read">{qty}</div>

                {/* Line Total */}
                <p>
                  {currency}
                  {item.price * qty}
                </p>

                {/* +/- */}
                <div className="cart-qty-controls">
                  <button
                    className="cart-qty-btn"
                    onClick={() => removeFromCart(id)}
                    type="button"
                  >
                    −
                  </button>
                  <span className="cart-qty-count">{qty}</span>
                  <button
                    className="cart-qty-btn"
                    onClick={() => addToCart(id)}
                    type="button"
                  >
                    +
                  </button>
                </div>
              </div>

              <hr />
            </div>
          );
        })}
      </div>

      {/* RIGHT SIDE: TOTALS */}
      <div className="cart-bottom">
        <div className="cart-total">
          <h2>Cart Totals</h2>

          <div>
            {/* Subtotal */}
            <div className="cart-total-details">
              <p>Subtotal</p>
              <p>
                {currency}
                {subtotal}
              </p>
            </div>

            {/* Add-on Summary */}
            {(pastaMax > 0 || moburgMax > 0) && (
              <>
                <hr />
                <div className="cart-total-details">
                  <p>
                    Extra Cheese
                    {cheeseAddOns.pasta > 0 && <> · Pasta x{cheeseAddOns.pasta}</>}
                    {cheeseAddOns.moburg > 0 && <> · Moburg x{cheeseAddOns.moburg}</>}
                  </p>
                  <p>
                    {currency}
                    {addOnTotal}
                  </p>
                </div>
              </>
            )}

            <hr />

            {/* Delivery Fee */}
            <div className="cart-total-details">
              <p>Delivery Fee</p>
              <p>
                {currency}
                {subtotal === 0 ? 0 : deliveryCharge}
              </p>
            </div>

            <hr />

            {/* Final Total */}
            <div className="cart-total-details">
              <b>Total</b>
              <b>
                {currency}
                {total}
              </b>
            </div>
          </div>

          {/* CHECKOUT BUTTON */}
          <div className="cart-actions">
            <button
              className="btn btn-checkout"
              onClick={() => navigate("/order")}
              disabled={isCartEmpty}
              type="button"
            >
              PROCEED TO CHECKOUT
            </button>
          </div>
        </div>

        {/* ADD-ONS RIGHT PANEL */}
        {(pastaMax > 0 || moburgMax > 0) && (
          <div className="cart-promocode">
            <h3>Add-ons</h3>

            {/* Pasta Cheese Addon */}
            {pastaMax > 0 && (
              <div className="upsell-row">
                <div className="upsell-info">
                  <div className="upsell-title">Extra Cheese for Pasta</div>
                  <div className="upsell-sub">
                    {currency}
                    {CHEESE_PRICE} each · Up to {pastaMax}
                  </div>
                </div>

                <div className="cart-qty-controls">
                  <button
                    className="cart-qty-btn"
                    onClick={() =>
                      updateCheeseAddOns({
                        pasta: Math.max(0, cheeseAddOns.pasta - 1),
                      })
                    }
                    type="button"
                  >
                    −
                  </button>
                  <span className="cart-qty-count">{cheeseAddOns.pasta}</span>
                  <button
                    className="cart-qty-btn"
                    onClick={() =>
                      updateCheeseAddOns({
                        pasta: Math.min(pastaMax, cheeseAddOns.pasta + 1),
                      })
                    }
                    type="button"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Moburg Cheese Addon */}
            {moburgMax > 0 && (
              <div className="upsell-row">
                <div className="upsell-info">
                  <div className="upsell-title">Extra Cheese for Moburg</div>
                  <div className="upsell-sub">
                    {currency}
                    {CHEESE_PRICE} each · Up to {moburgMax}
                  </div>
                </div>

                <div className="cart-qty-controls">
                  <button
                    className="cart-qty-btn"
                    onClick={() =>
                      updateCheeseAddOns({
                        moburg: Math.max(0, cheeseAddOns.moburg - 1),
                      })
                    }
                    type="button"
                  >
                    −
                  </button>
                  <span className="cart-qty-count">{cheeseAddOns.moburg}</span>
                  <button
                    className="cart-qty-btn"
                    onClick={() =>
                      updateCheeseAddOns({
                        moburg: Math.min(moburgMax, cheeseAddOns.moburg + 1),
                      })
                    }
                    type="button"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
