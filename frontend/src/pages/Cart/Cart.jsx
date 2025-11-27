// frontend/src/pages/Cart/Cart.jsx
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
    cheeseAddOns,
    updateCheeseAddOns,
    getAddOnTotal,
  } = useContext(StoreContext);

  const navigate = useNavigate();

  // items with qty > 0 — robust id handling
  const cartData = useMemo(() => {
    if (!Array.isArray(food_list) || !cartItems) return [];
    return food_list.filter((item) => {
      const id = String(item._id ?? item.id ?? "");
      return Number(cartItems[id] || 0) > 0;
    });
  }, [food_list, cartItems]);

  // robust category getter (keeps your previous logic)
  const getCategory = (item) => {
    const raw =
      item.category ||
      item.categoryName ||
      item.menu_category ||
      item.menu_name ||
      "";
    return String(raw).toLowerCase();
  };

  // count total qty in a category
  const categoryQty = (needle) =>
    cartData.reduce((sum, item) => {
      const id = String(item._id ?? item.id ?? "");
      const qty = Number(cartItems[id] || 0);
      return getCategory(item).includes(needle) ? sum + qty : sum;
    }, 0);

  const pastaMax = categoryQty("pasta");
  const moburgMax = categoryQty("moburg");

  const addOnTotal = getAddOnTotal();

  const subtotal = getTotalCartAmount();
  const total =
    subtotal === 0 ? 0 : subtotal + (deliveryCharge || 0) + (addOnTotal || 0);

  const isCartEmpty = subtotal === 0;

  return (
    <div className="cart">
      <div className="cart-items">
        <div className="cart-items-title">
          <p>Items</p>
          <p>Title</p>
          <p>Price</p>
          <p>Quantity</p>
          <p>Total</p>
          <p>Remove</p>
        </div>

        <br />
        <hr />

        {cartData.length === 0 && (
          <div style={{ padding: "2rem 0", textAlign: "center", color: "#666" }}>
            Your cart is empty.
          </div>
        )}

        {cartData.map((item, index) => {
          const id = String(item._id ?? item.id ?? "");
          const qty = Number(cartItems[id] || 0);

          return (
            <div key={id}>
              <div className="cart-items-title cart-items-item">
                {/* Serial number only */}
                <p className="cart-serial">{index + 1}.</p>

                {/* Title */}
                <p className="cart-title">{item.name}</p>

                {/* Unit Price */}
                <p>
                  {currency}
                  {item.price}
                </p>

                {/* Quantity (read-only cell) */}
                <div className="cart-qty-read">{qty}</div>

                {/* Line Total */}
                <p>
                  {currency}
                  {Number(item.price) * qty}
                </p>

                {/* +/- controls */}
                <div className="cart-qty-controls">
                  <button
                    className="cart-qty-btn"
                    onClick={() => removeFromCart(id)}
                    aria-label={`Remove one ${item.name}`}
                    type="button"
                  >
                    −
                  </button>
                  <span className="cart-qty-count">{qty}</span>
                  <button
                    className="cart-qty-btn"
                    onClick={() => addToCart(id)}
                    aria-label={`Add one ${item.name}`}
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

      <div className="cart-bottom">
        <div className="cart-total">
          <h2>Cart Totals</h2>
          <div>
            <div className="cart-total-details">
              <p>Subtotal</p>
              <p>
                {currency}
                {subtotal}
              </p>
            </div>

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
            <div className="cart-total-details">
              <p>Delivery Fee</p>
              <p>
                {currency}
                {subtotal === 0 ? 0 : deliveryCharge}
              </p>
            </div>

            <hr />
            <div className="cart-total-details">
              <b>Total</b>
              <b>
                {currency}
                {total}
              </b>
            </div>
          </div>

          <div className="cart-actions">
            {/* ORDER NOW: adhoc quick order (customer may order again later) */}
            <button
              className="btn btn-adhoc"
              onClick={() => navigate("/order?adhoc=1")}
              disabled={isCartEmpty}
              type="button"
            >
              ORDER NOW (Adhoc)
            </button>

            {/* Proceed to final checkout */}
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

        <div className="cart-promocode">
          <div>
            <p>If you have a promo code, Enter it here</p>
            <div className="cart-promocode-input">
              <input type="text" placeholder="promo code" />
              <button type="button">Submit</button>
            </div>

            {(pastaMax > 0 || moburgMax > 0) && (
              <div className="cart-upsell">
                <h4>Add-ons</h4>

                {pastaMax > 0 && (
                  <div className="upsell-row">
                    <div className="upsell-info">
                      <div className="upsell-title">Extra cheese for Pasta</div>
                      <div className="upsell-sub">
                        {currency}
                        {CHEESE_PRICE} each · You can add up to {pastaMax}
                      </div>
                    </div>
                    <div className="cart-qty-controls">
                      <button
                        className="cart-qty-btn"
                        onClick={() =>
                          updateCheeseAddOns({ pasta: Math.max(0, cheeseAddOns.pasta - 1) })
                        }
                        disabled={cheeseAddOns.pasta <= 0}
                        aria-label="Remove cheese for Pasta"
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
                        disabled={cheeseAddOns.pasta >= pastaMax}
                        aria-label="Add cheese for Pasta"
                        type="button"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {moburgMax > 0 && (
                  <div className="upsell-row">
                    <div className="upsell-info">
                      <div className="upsell-title">Extra cheese for Moburg</div>
                      <div className="upsell-sub">
                        {currency}
                        {CHEESE_PRICE} each · You can add up to {moburgMax}
                      </div>
                    </div>
                    <div className="cart-qty-controls">
                      <button
                        className="cart-qty-btn"
                        onClick={() =>
                          updateCheeseAddOns({ moburg: Math.max(0, cheeseAddOns.moburg - 1) })
                        }
                        disabled={cheeseAddOns.moburg <= 0}
                        aria-label="Remove cheese for Moburg"
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
                        disabled={cheeseAddOns.moburg >= moburgMax}
                        aria-label="Add cheese for Moburg"
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
      </div>
    </div>
  );
};

export default Cart;
