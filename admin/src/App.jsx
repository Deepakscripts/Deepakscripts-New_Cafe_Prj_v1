import React, { useState } from "react";
import Navbar from "./components/Navbar/Navbar";
import Sidebar from "./components/Sidebar/Sidebar";
import { Route, Routes, Navigate } from "react-router-dom";

import Add from "./pages/Add/Add";
import List from "./pages/List/List";
import Orders from "./pages/Orders/Orders";
import Analytics from "./pages/Analytics/Analytics";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import LoginModal from "./components/LoginModal/LoginModal";
import { AuthProvider } from "./auth/AuthContext"; // <-- IMPORTANT

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const openLogin = () => setLoginOpen(true);
  const closeLogin = () => setLoginOpen(false);

  return (
    <AuthProvider >  {/* <-- FIXED */}
      <div className="app">
        <ToastContainer />

        <Navbar
          onHamburgerClick={() => setSidebarOpen((s) => !s)}
          onAvatarClick={openLogin}
        />

        <hr />

        <div className="app-content">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <Routes>
            <Route path="/" element={<Navigate to="/analytics" replace />} />

            <Route path="/add" element={<Add />} />
            <Route path="/list" element={<List />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/analytics" element={<Analytics />} />

            <Route path="*" element={<Navigate to="/analytics" replace />} />
          </Routes>
        </div>

        <LoginModal open={loginOpen} onClose={closeLogin} />
      </div>
    </AuthProvider>
  );
}
