// admin/src/auth/AuthContext.jsx
// ===============================================================
// FINAL VERSION — NO AUTHENTICATION, NO TOKEN, NO HEADERS
// Purpose: Provide a harmless context so the rest of the app
// can call useAuth() without breaking, but nothing is protected.
// ===============================================================

import React, { createContext, useContext, useState, useMemo } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // In open-access admin mode, we only keep a dummy UI state (optional)
  const [user, setUser] = useState(null);

  // "login" simply sets a cosmetic user name (optional)
  const login = (userObj) => {
    setUser(userObj || { name: "Admin" });
  };

  // "logout" removes this cosmetic user
  const logout = () => {
    setUser(null);
  };

  // Always treat admin as authenticated (OPEN ACCESS)
  const isAuthenticated = true;

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      isAuthenticated,
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
