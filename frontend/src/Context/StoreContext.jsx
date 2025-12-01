// frontend/src/Context/StoreContext.jsx
// ============================================================
// CLEAN GLOBAL STORE CONTEXT (FINAL WORKFLOW)
// - NO guest users
// - NO sessionId
// - Cart exists ONLY for logged-in users
// - Supports CHEESE ADD-ONS for Pasta & Moburg
// - Fully aligned with simplified backend
// ============================================================

import { createContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
  /* ============================================================
     BASIC CONFIG
  ============================================================ */
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    `http://${window.location.hostname}:4000`;

  const url = API_BASE;
  const currency = "₹";
  const deliveryCharge = 0;

  /* ============================================================
     STATE
  ============================================================ */
  const [food_list, setFoodList] = useState([]);
  const [cartItems, setCartItems] = useState({});
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [isAuthReady, setIsAuthReady] = useState(false);

  /* ============================================================
     CHEESE ADD-ONS STATE
  ============================================================ */
  const [cheeseAddOns, setCheeseAddOns] = useState({
    pasta: 0,
    moburg: 0,
  });

  const updateCheeseAddOns = (data) => {
    setCheeseAddOns((prev) => ({
      ...prev,
      ...data,
    }));
  };

  /* ============================================================
     ADD-ON TOTAL CALCULATOR
  ============================================================ */
  const getAddOnTotal = () => {
    const pastaTotal = (cheeseAddOns.pasta || 0) * 20;
    const moburgTotal = (cheeseAddOns.moburg || 0) * 20;
    return pastaTotal + moburgTotal;
  };

  /* ============================================================
     HEADERS
  ============================================================ */
  const apiHeaders = () => ({
    Authorization: `Bearer ${token}`,
  });

  /* ============================================================
     FETCH FOOD LIST
  ============================================================ */
  const fetchFoodList = async () => {
    try {
      const res = await axios.get(`${url}/api/food/list`);
      setFoodList(res.data?.data || []);
    } catch (err) {
      console.error("Food load error:", err);
      setFoodList([]);
    }
  };

  /* ============================================================
     CART ACTIONS
  ============================================================ */

  // Add item
  const addToCart = async (itemId) => {
    if (!token) {
      toast.error("Please login first");
      return;
    }

    const prod = food_list.find((f) => String(f._id) === String(itemId));

    setCartItems((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));

    toast.success(`${prod?.name || "Item"} added`, { autoClose: 800 });

    await axios.post(
      `${url}/api/cart/add`,
      { itemId },
      { headers: apiHeaders() }
    );
  };

  // Remove item
  const removeFromCart = async (itemId) => {
    if (!token) return;

    const prod = food_list.find((f) => String(f._id) === String(itemId));

    setCartItems((prev) => {
      const qty = (prev[itemId] || 0) - 1;
      const next = { ...prev };
      if (qty <= 0) delete next[itemId];
      else next[itemId] = qty;
      return next;
    });

    toast.info(`${prod?.name || "Item"} removed`, { autoClose: 800 });

    await axios.post(
      `${url}/api/cart/remove`,
      { itemId },
      { headers: apiHeaders() }
    );
  };

  // Clear entire cart
  const clearCart = async () => {
    if (!token) return;

    setCartItems({});
    setCheeseAddOns({ pasta: 0, moburg: 0 });

    await axios.post(
      `${url}/api/cart/clear`,
      {},
      { headers: apiHeaders() }
    );
  };

  /* ============================================================
     SYNC CART WITH BACKEND
  ============================================================ */
  const loadCartData = async () => {
    if (!token) {
      setCartItems({});
      setCheeseAddOns({ pasta: 0, moburg: 0 });
      return;
    }

    try {
      const res = await axios.post(
        `${url}/api/cart/get`,
        {},
        { headers: apiHeaders() }
      );

      setCartItems(res.data?.cartData || {});
    } catch (err) {
      console.error("Cart load error:", err);
      setCartItems({});
    }
  };

  /* ============================================================
     CART SNAPSHOT FOR ORDER
  ============================================================ */
  const buildClientCartSnapshot = () => {
    const items = [];

    for (const [id, qty] of Object.entries(cartItems)) {
      const quantity = Number(qty);
      if (quantity <= 0) continue;

      const prod = food_list.find((f) => String(f._id) === String(id));
      if (!prod) continue;

      items.push({
        itemId: String(prod._id),
        name: prod.name,
        price: Number(prod.price),
        quantity,
      });
    }

    return items;
  };

  /* ============================================================
     TOTALS
  ============================================================ */
  const getTotalCartAmount = () => {
    let total = 0;
    for (const id in cartItems) {
      const prod = food_list.find((p) => String(p._id) === String(id));
      if (prod) total += Number(prod.price) * cartItems[id];
    }
    return total;
  };

  const getGrandTotal = () =>
    getTotalCartAmount() + deliveryCharge + getAddOnTotal();

  /* ============================================================
     INITIAL LOAD
  ============================================================ */
  useEffect(() => {
    (async () => {
      await fetchFoodList();
      await loadCartData();
      setIsAuthReady(true);
    })();
  }, [token]);

  /* ============================================================
     FINAL CONTEXT VALUE
  ============================================================ */
  const contextValue = {
    url,
    currency,
    deliveryCharge,

    token,
    setToken,
    isAuthReady,

    food_list,
    cartItems,

    addToCart,
    removeFromCart,
    clearCart,

    buildClientCartSnapshot,

    loadCartData,

    getTotalCartAmount,
    getGrandTotal,

    // ⭐ CHEESE ADD-ONS
    cheeseAddOns,
    updateCheeseAddOns,
    getAddOnTotal,
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreContextProvider;
