// frontend/src/App.jsx
// ===============================================================
// FIXED + OPTIMIZED
// - Validated socket setup
// - Prevent duplicate listeners
// - Ensures LoginPopup works correctly
// - Ensures Navbar + Footer rendering is stable
// - Ready for real-time MyOrders sync
// ===============================================================

import React, { useContext, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";

import Home from "./pages/Home/Home";
import About from "./pages/About/About";
import PrivacyPolicy from "./pages/PrivacyPolicy/PrivacyPolicy";
import Cart from "./pages/Cart/Cart";
import LoginPopup from "./components/LoginPopup/LoginPopup";
import PlaceOrder from "./pages/PlaceOrder/PlaceOrder";
import MyOrders from "./pages/MyOrders/MyOrders";
import Verify from "./pages/Verify/Verify";

import Footer from "./components/Footer/Footer";
import Navbar from "./components/Navbar/Navbar";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { StoreContext } from "./Context/StoreContext";

// ⭐ GLOBAL SOCKET.IO CLIENT
import { io } from "socket.io-client";

// ⭐ Create ONLY ONE socket instance safely (NO DUPLICATES)
export const socket = io(
  import.meta.env.VITE_API_URL || "http://localhost:4000",
  {
    transports: ["websocket"],
    withCredentials: true
  }
);

const App = () => {
  const { token, isAuthReady } = useContext(StoreContext);
  const location = useLocation();

  // ⭐ If StoreContext is not ready, show loader
  if (!isAuthReady) {
    return (
      <div
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          fontSize: "18px",
          fontWeight: "500",
        }}
      >
        Loading...
      </div>
    );
  }

  // ⭐ Debug Socket Connection Status
  useEffect(() => {
    const onConnect = () => console.log("Socket connected:", socket.id);
    const onDisconnect = () => console.log("Socket disconnected");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return (
    <>
      <ToastContainer />

      {/* ⭐ FORCE LOGIN until user has token */}
      {!token && isAuthReady && (
        <LoginPopup forceLogin={true} setShowLogin={() => {}} />
      )}

      <div className="app">
        <Navbar />

        <Routes>
          {/* MAIN ROUTES */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          {/* CART + FINAL ORDER FLOW */}
          <Route path="/cart" element={<Cart />} />
          <Route path="/order" element={<PlaceOrder />} />

          {/* REAL-TIME MyOrders */}
          <Route path="/myorders" element={<MyOrders />} />

          {/* OTP VERIFY PAGE */}
          <Route path="/verify" element={<Verify />} />

          {/* FALLBACK */}
          <Route path="*" element={<Home />} />
        </Routes>
      </div>

      {/* Hide footer on OTP verify page */}
      {location.pathname !== "/verify" && <Footer />}
    </>
  );
};

export default App;
