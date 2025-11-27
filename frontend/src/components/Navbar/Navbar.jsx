// frontend/src/components/Navbar/Navbar.jsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import "./Navbar.css";
import { assets } from "../../assets/assets";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { StoreContext } from "../../Context/StoreContext";

const Navbar = () => {
  const {
    getTotalCartAmount,
    token,
    setToken,
    sessionId,
    hasPendingAdhocOrders, // <-- optional: can be added in context
  } = useContext(StoreContext);

  const navigate = useNavigate();
  const location = useLocation();

  const [menu, setMenu] = useState("home");

  // Detect active tab from route
  useEffect(() => {
    if (menu === "menu" || menu === "contact") return;

    if (location.pathname === "/myorders") setMenu("orders");
    else if (location.pathname === "/show-bill") setMenu("bill");
    else setMenu("home");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    navigate("/");
    setMenu("home");
  };

  const goToOrders = () => {
    if (token) {
      navigate("/myorders");
      setMenu("orders");
    }
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

  // Show Bill → only if logged in AND session has adhoc orders
  const showBillVisible = token && sessionId;

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
        <img className="logo" src={assets.logo} alt="Momo Magic Cafe" />
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
          onClick={goToOrders}
          className={`linklike ${isActive("orders") ? "active" : ""}`}
        >
          Orders
        </button>

        {/* NEW — Show Bill button */}
        {showBillVisible && (
          <button
            type="button"
            onClick={() => {
              navigate("/show-bill");
              setMenu("bill");
            }}
            className={`linklike ${isActive("bill") ? "active" : ""}`}
          >
            Show Bill
          </button>
        )}

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
        {!token ? (
          <></> // login not visible since OTP login is mandatory
        ) : (
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

              {/* Show Bill inside dropdown also */}
              {showBillVisible && (
                <li
                  onClick={() => {
                    navigate("/show-bill");
                    setMenu("bill");
                  }}
                >
                  <img src={assets.bag_icon} alt="" /> <p>Show Bill</p>
                </li>
              )}

              <hr />
              <li onClick={logout}>
                <img src={assets.logout_icon} alt="" /> <p>Logout</p>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
