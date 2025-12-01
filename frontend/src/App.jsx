// frontend/src/App.jsx
// ===============================================================
// UPDATED FOR REAL-TIME SYNC WITH ADMIN + NEW WORKFLOW
// - Global Socket.IO Connection
// - OTP login mandatory
// - Real-time updates for MyOrders, Bill, Cart, PlaceOrder
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

// ⭐ NEW: GLOBAL SOCKET.IO CLIENT
import { io } from "socket.io-client";

// 👇 Create single socket instance (shared everywhere)
export const socket = io(
  import.meta.env.VITE_API_URL || "http://localhost:4000",
  {
    transports: ["websocket"],
    withCredentials: true,
  }
);

const App = () => {
  const { token, isAuthReady } = useContext(StoreContext);
  const location = useLocation();

  // Wait until authentication state is ready
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

  // ⭐ OPTIONAL: Log socket connection state for debugging
  useEffect(() => {
    socket.on("connect", () => console.log("Socket connected:", socket.id));
    socket.on("disconnect", () => console.log("Socket disconnected"));

    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, []);

  return (
    <>
      <ToastContainer />

      {/* FORCE LOGIN — OTP must appear until user logs in */}
      {!token && isAuthReady && (
        <LoginPopup setShowLogin={() => {}} forceLogin={true} />
      )}

      <div className="app">
        <Navbar />

        {/* ⭐ Routes now have REAL-TIME capability via global socket */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          <Route path="/cart" element={<Cart />} />
          <Route path="/order" element={<PlaceOrder />} />

          <Route path="/myorders" element={<MyOrders />} />

          <Route path="/verify" element={<Verify />} />

          {/* Fallback */}
          <Route path="*" element={<Home />} />
        </Routes>
      </div>

      {/* Hide footer on OTP verification screen */}
      {location.pathname !== "/verify" && <Footer />}
    </>
  );
};

export default App;
