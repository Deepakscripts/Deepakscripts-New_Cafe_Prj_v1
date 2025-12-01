// frontend/src/components/Navbar/Navbar.jsx
// ===============================================================
// CLEAN NAVBAR FOR NEW WORKFLOW
// - No session/adhoc logic
// - No ShowBill button
// - Login happens from OTP popup only
// - Orders = normal order history
// ===============================================================

import React, { useContext, useEffect, useState, useMemo } from "react";
import "./Navbar.css";
import { assets } from "../../assets/assets";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { StoreContext } from "../../Context/StoreContext";

const Navbar = () => {
  const { getTotalCartAmount, token, setToken } = useContext(StoreContext);

  const navigate = useNavigate();
  const location = useLocation();

  const [menu, setMenu] = useState("home");

  // Detect active tab
  useEffect(() => {
    if (location.pathname === "/myorders") setMenu("orders");
    else if (location.pathname.startsWith("/")) setMenu("home");
  }, [location.pathname]);

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    navigate("/");
    setMenu("home");
  };

  const handleMenuClick = () => {
    setMenu("menu");

    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const el = document.getElementById("explore-menu");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 250);
    } else {
      const el = document.getElementById("explore-menu");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const isActive = (name) => menu === name;

  const cartHasItems = useMemo(() => getTotalCartAmount() > 0, [getTotalCartAmount]);

  return (
    <div className="navbar">
      {/* LOGO */}
      <Link
        to="/"
        onClick={() => {
          navigate("/");
          setMenu("home");
        }}
      >
        <img className="logo" src={assets.logo} alt="Momo Magic Café" />
      </Link>

      {/* NAV CENTER */}
      <ul className="navbar-menu">
        <button
          type="button"
          onClick={() => {
            navigate("/");
            setMenu("home");
          }}
          className={`linklike ${isActive("home") ? "active" : ""}`}
        >
          Home
        </button>

        <button
          type="button"
          onClick={handleMenuClick}
          className={`linklike ${isActive("menu") ? "active" : ""}`}
        >
          Menu
        </button>

        <button
          type="button"
          onClick={() => {
            if (token) {
              navigate("/myorders");
              setMenu("orders");
            }
          }}
          className={`linklike ${isActive("orders") ? "active" : ""}`}
        >
          Orders
        </button>

        <a
          href="#footer"
          onClick={() => setMenu("contact")}
          className={`linklike ${isActive("contact") ? "active" : ""}`}
        >
          Contact Us
        </a>
      </ul>

      {/* NAV RIGHT */}
      <div className="navbar-right">
        {/* CART */}
        <Link to="/cart" className="navbar-cart" aria-label="Cart">
          <div className="navbar-icon-container">
            <img src={assets.basket_icon} alt="Cart" />
            {cartHasItems && <div className="dot"></div>}
          </div>
          <span>Cart</span>
        </Link>

        {/* PROFILE */}
        {token ? (
          <div className="navbar-profile-container">
            <div className="navbar-icon-container">
              <img src={assets.profile_icon} alt="Profile" />
            </div>
            <span>Profile</span>

            <ul className="navbar-profile-dropdown">
              <li
                onClick={() => {
                  navigate("/myorders");
                  setMenu("orders");
                }}
              >
                <img src={assets.bag_icon} alt="" /> <p>Orders</p>
              </li>

              <hr />
              <li onClick={logout}>
                <img src={assets.logout_icon} alt="" /> <p>Logout</p>
              </li>
            </ul>
          </div>
        ) : (
          <></> // login handled by OTP popup
        )}
      </div>
    </div>
  );
};

export default Navbar;
