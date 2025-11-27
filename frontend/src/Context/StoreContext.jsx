// frontend/src/Context/StoreContext.jsx
import { createContext, useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import { menu_list } from "../assets/assets";

export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
  // ------------------ CONFIG ------------------
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    `http://${window.location.hostname}:4000`;
  const url = API_BASE;

  const currency = "₹";
  const deliveryCharge = 0;

  // ------------------ STATE ------------------
  const [food_list, setFoodList] = useState([]);
  const [cartItems, setCartItems] = useState({});
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [isAuthReady, setIsAuthReady] = useState(false);

  // dining session grouping (adhoc → final)
  const [sessionId, setSessionId] = useState(
    localStorage.getItem("momo_session_id") || null
  );

  // ------------------ LOCAL STORAGE KEYS ------------------
  const LS_KEY_CART = "guest_cart";
  const LS_KEY_ADDONS = "guest_addons";

  // ------------------ SESSION ID ------------------
  const ensureSessionId = () => {
    let sid = sessionId;
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem("momo_session_id", sid);
      setSessionId(sid);
    }
    return sid;
  };

  useEffect(() => {
    ensureSessionId();
  }, []);

  // ------------------ GUEST CART PERSISTENCE ------------------
  const readGuestCart = () => {
    try {
      const raw = localStorage.getItem(LS_KEY_CART);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };
  const writeGuestCart = (data) => {
    try {
      localStorage.setItem(LS_KEY_CART, JSON.stringify(data || {}));
    } catch {}
  };

  // ------------------ CHEESE ADD-ONS ------------------
  const [cheeseAddOns, setCheeseAddOns] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY_ADDONS);
      return raw ? JSON.parse(raw) : { pasta: 0, moburg: 0 };
    } catch {
      return { pasta: 0, moburg: 0 };
    }
  });

  const persistCheese = (obj) => {
    try {
      localStorage.setItem(LS_KEY_ADDONS, JSON.stringify(obj));
    } catch {}
  };

  const updateCheeseAddOns = (next) => {
    setCheeseAddOns((prev) => {
      const merged = { ...prev, ...next };
      persistCheese(merged);
      return merged;
    });
  };

  const getAddOnTotal = () =>
    20 * (Number(cheeseAddOns.pasta || 0) + Number(cheeseAddOns.moburg || 0));

  const getGrandTotal = () => {
    const base = getTotalCartAmount();
    if (base === 0) return 0;
    return base + deliveryCharge + getAddOnTotal();
  };

  // ------------------ CART SNAPSHOT (INCLUDING ADDONS) ------------------
  const buildClientCartSnapshot = useCallback(() => {
    const items = [];

    Object.entries(cartItems || {}).forEach(([id, qty]) => {
      const quantity = Number(qty) || 0;
      if (quantity <= 0) return;

      const prod = (food_list || []).find((p) => String(p._id) === String(id));
      if (!prod) return;

      items.push({
        itemId: String(prod._id),
        name: String(prod.name || ""),
        price: Number(prod.price || 0),
        quantity,
      });
    });

    // add-on synthetic lines
    if (cheeseAddOns.pasta > 0) {
      items.push({
        itemId: "addon:cheese:pasta",
        name: "Extra Cheese (Pasta)",
        price: 20,
        quantity: Number(cheeseAddOns.pasta),
      });
    }
    if (cheeseAddOns.moburg > 0) {
      items.push({
        itemId: "addon:cheese:moburg",
        name: "Extra Cheese (Moburg)",
        price: 20,
        quantity: Number(cheeseAddOns.moburg),
      });
    }

    return items;
  }, [cartItems, cheeseAddOns, food_list]);

  // ------------------ LOCAL CART SYNC ------------------
  useEffect(() => {
    if (!token) writeGuestCart(cartItems);
  }, [cartItems, token]);

  // ------------------ ADD/REMOVE WITH TOAST ------------------
  const addToCart = async (itemId) => {
    if (!itemId) return;

    const food = food_list.find((f) => String(f._id) === String(itemId));

    setCartItems((prev) => {
      const next = { ...prev, [itemId]: (prev[itemId] || 0) + 1 };
      return next;
    });

    toast.success(`${food?.name || "Item"} added to cart`, {
      autoClose: 1200,
    });

    if (token) {
      await axios.post(url + "/api/cart/add", { itemId }, { headers: { token } });
    }
  };

  const removeFromCart = async (itemId) => {
    if (!itemId) return;

    const food = food_list.find((f) => String(f._id) === String(itemId));

    setCartItems((prev) => {
      const qty = (prev[itemId] || 0) - 1;
      const next = { ...prev };
      if (qty <= 0) delete next[itemId];
      else next[itemId] = qty;
      return next;
    });

    toast.info(`${food?.name || "Item"} removed`, { autoClose: 1200 });

    if (token) {
      await axios.post(
        url + "/api/cart/remove",
        { itemId },
        { headers: { token } }
      );
    }
  };

  // ------------------ CLEAR CART ------------------
  const clearCart = async () => {
    setCartItems({});
    try {
      if (token) {
        await axios.post(url + "/api/cart/clear", {}, { headers: { token } });
      } else {
        writeGuestCart({});
      }
    } catch {}
  };

  // ------------------ TOTAL AMOUNT ------------------
  const getTotalCartAmount = () => {
    let totalAmount = 0;
    for (const item in cartItems) {
      try {
        if (cartItems[item] > 0) {
          const food = food_list.find(
            (p) => String(p._id) === String(item)
          );
          if (food)
            totalAmount += Number(food.price || 0) * cartItems[item];
        }
      } catch {}
    }
    return totalAmount;
  };

  // ------------------ NORMALIZE IDS ------------------
  const normalizeIds = (list) =>
    (list || []).map((it) => {
      const id = it?._id ?? it?.id ?? it?.itemId;
      return { ...it, _id: id != null ? String(id) : undefined };
    });

  // ------------------ FETCH MENU ------------------
  const fetchFoodList = async () => {
    try {
      const response = await axios.get(url + "/api/food/list");
      const dbItems = Array.isArray(response?.data?.data)
        ? response.data.data
        : [];
      setFoodList(normalizeIds(dbItems));
    } catch {
      setFoodList([]);
    }
  };

  // ------------------ LOAD SERVER CART ------------------
  const loadCartData = async (tokenObjOrString) => {
    const hdrs =
      typeof tokenObjOrString === "string"
        ? { token: tokenObjOrString }
        : tokenObjOrString;

    const res = await axios.post(url + "/api/cart/get", {}, { headers: hdrs });
    const serverCart = res?.data?.cartData || {};

    const guestCart = readGuestCart();
    const hasGuest = Object.values(guestCart).some((q) => Number(q) > 0);

    let merged = serverCart;

    if (hasGuest) {
      const mergeRes = await axios.post(
        url + "/api/cart/merge",
        { cart: guestCart },
        { headers: hdrs }
      );
      merged = mergeRes?.data?.cartData || serverCart;
      writeGuestCart({});
    }

    setCartItems(merged);
    writeGuestCart(merged);
    return merged;
  };

  // ------------------ ADD-ON CLAMPING ------------------
  const getCategory = (item) => {
    const raw =
      item?.category ||
      item?.categoryName ||
      item?.menu_category ||
      item?.menu_name ||
      "";
    return String(raw).toLowerCase();
  };

  const computeCheeseCaps = (cart, items) => {
    let pastaMax = 0;
    let moburgMax = 0;

    const map = new Map((items || []).map((it) => [String(it._id), it]));

    Object.entries(cart || {}).forEach(([id, qty]) => {
      const quantity = Number(qty) || 0;
      if (quantity <= 0) return;

      const prod = map.get(String(id));
      if (!prod) return;

      const cat = getCategory(prod);
      if (cat.includes("pasta")) pastaMax += quantity;
      if (cat.includes("moburg")) moburgMax += quantity;
    });

    return { pastaMax, moburgMax };
  };

  useEffect(() => {
    const { pastaMax, moburgMax } = computeCheeseCaps(cartItems, food_list);

    setCheeseAddOns((prev) => {
      const next = {
        pasta: Math.min(prev.pasta || 0, pastaMax),
        moburg: Math.min(prev.moburg || 0, moburgMax),
      };

      if (next.pasta !== prev.pasta || next.moburg !== prev.moburg) {
        persistCheese(next);
        return next;
      }
      return prev;
    });
  }, [cartItems, food_list]);

  // ------------------ INITIAL BOOT ------------------
  useEffect(() => {
    async function loadData() {
      try {
        await fetchFoodList();

        if (token) {
          await loadCartData({ token });
        } else {
          setCartItems(readGuestCart());
        }
      } catch (e) {
        console.error("initial load failed", e);
      } finally {
        setIsAuthReady(true);
      }
    }
    loadData();
  }, []);

  // ------------------ CONTEXT VALUE ------------------
  const contextValue = {
    url,
    currency,
    deliveryCharge,

    food_list,
    setFoodList,
    menu_list,

    cartItems,
    setCartItems,
    addToCart,
    removeFromCart,
    clearCart,
    getTotalCartAmount,

    token,
    setToken,
    loadCartData,
    isAuthReady,

    cheeseAddOns,
    setCheeseAddOns,
    updateCheeseAddOns,
    getAddOnTotal,
    getGrandTotal,

    buildClientCartSnapshot,

    sessionId,
    ensureSessionId,
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreContextProvider;
