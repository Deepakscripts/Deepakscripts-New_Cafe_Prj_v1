// frontend/src/App.jsx
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
import ShowBill from "./pages/ShowBill/ShowBill"; // ⭐ NEW PAGE

import Footer from "./components/Footer/Footer";
import Navbar from "./components/Navbar/Navbar";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { StoreContext } from "./Context/StoreContext";

const App = () => {
  const { token, isAuthReady } = useContext(StoreContext);
  const location = useLocation();

  // Wait for context to finish loading before rendering the application
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

      {/* 
        If user is NOT logged in, immediately force login.
        This modal overlays everything else.
      */}
      {!token && isAuthReady && (
        <LoginPopup setShowLogin={() => {}} forceLogin={true} />
      )}

      {/* MAIN APPLICATION */}
      <div className="app">
        <Navbar />

        <Routes>
          {/* MAIN ROUTES */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          {/* CART + ORDER FLOW */}
          <Route path="/cart" element={<Cart />} />
          <Route path="/order" element={<PlaceOrder />} /> 
          {/* Works for /order AND /order?adhoc=1 */}

          {/* USER ORDER PAGES */}
          <Route path="/myorders" element={<MyOrders />} />

          {/* ⭐ NEW BILL PAGE */}
          <Route path="/show-bill" element={<ShowBill />} />

          {/* OTP VERIFY */}
          <Route path="/verify" element={<Verify />} />

          {/* FALLBACK */}
          <Route path="*" element={<Home />} />
        </Routes>
      </div>

      {/* Hide footer only on OTP verify page */}
      {location.pathname !== "/verify" && <Footer />}
    </>
  );
};

export default App;
