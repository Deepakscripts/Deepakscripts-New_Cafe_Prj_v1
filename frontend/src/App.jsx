// frontend/src/App.jsx
// ===============================================================
// UPDATED FOR NEW WORKFLOW (NO SHOW-BILL, NO ADHOC)
// - OTP login mandatory
// - Users place only FINAL orders
// - MyOrders shows pending + order history
// ===============================================================

import React, { useContext } from "react";
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

const App = () => {
  const { token, isAuthReady } = useContext(StoreContext);
  const location = useLocation();

  // Wait for authentication + profile load
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

  return (
    <>
      <ToastContainer />

      {/* FORCE LOGIN — OTP must appear until user logs in */}
      {!token && isAuthReady && (
        <LoginPopup setShowLogin={() => {}} forceLogin={true} />
      )}

      <div className="app">
        <Navbar />

        <Routes>
          {/* MAIN ROUTES */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          {/* CART + FINAL ORDER FLOW ONLY */}
          <Route path="/cart" element={<Cart />} />
          <Route path="/order" element={<PlaceOrder />} />

          {/* USER ORDER HISTORY */}
          <Route path="/myorders" element={<MyOrders />} />

          {/* OTP VERIFY PAGE */}
          <Route path="/verify" element={<Verify />} />

          {/* FALLBACK */}
          <Route path="*" element={<Home />} />
        </Routes>
      </div>

      {/* Hide footer on OTP verification screen */}
      {location.pathname !== "/verify" && <Footer />}
    </>
  );
};

export default App;
