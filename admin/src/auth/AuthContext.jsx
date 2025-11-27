// frontend/src/Context/AuthContext.jsx
import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const LS_USER = "mm_auth_user";
const LS_TOKEN = "token";

export function AuthProvider({ children }) {
  // Load initial user from localStorage synchronously
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Load initial token from localStorage
  const [token, _setToken] = useState(() => {
    try {
      return localStorage.getItem(LS_TOKEN) || "";
    } catch {
      return "";
    }
  });

  // Whenever token changes, configure axios default header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common = axios.defaults.headers.common || {};
      axios.defaults.headers.common["token"] = token;
      try {
        localStorage.setItem(LS_TOKEN, token);
      } catch {}
    } else {
      if (axios.defaults.headers && axios.defaults.headers.common) {
        delete axios.defaults.headers.common["token"];
      }
      try {
        localStorage.removeItem(LS_TOKEN);
      } catch {}
    }
  }, [token]);

  // Public API: login with user object and token
  const login = (userObj, jwtToken) => {
    setUser(userObj || null);
    if (userObj) {
      try {
        localStorage.setItem(LS_USER, JSON.stringify(userObj));
      } catch {}
    } else {
      try {
        localStorage.removeItem(LS_USER);
      } catch {}
    }

    if (jwtToken) {
      _setToken(jwtToken);
    }
  };

  // Update only token (useful for OTP flow where token arrives separately)
  const setToken = (t) => {
    _setToken(t || "");
  };

  // Update user object in-place (useful after profile edits)
  const updateUser = (patch) => {
    setUser((prev) => {
      const updated = { ...(prev || {}), ...(patch || {}) };
      try {
        localStorage.setItem(LS_USER, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Logout helper: clears user + token
  const logout = () => {
    setUser(null);
    _setToken("");
    try {
      localStorage.removeItem(LS_USER);
      localStorage.removeItem(LS_TOKEN);
    } catch {}
    // also clear axios header
    if (axios.defaults.headers && axios.defaults.headers.common) {
      delete axios.defaults.headers.common["token"];
    }
  };

  const isAuthenticated = Boolean(user && token);

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
      setToken,
      updateUser,
      isAuthenticated,
    }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
