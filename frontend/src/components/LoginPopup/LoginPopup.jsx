// frontend/src/components/LoginPopup/LoginPopup.jsx
// ===============================================================
// LOGIN POPUP (NEW WORKFLOW)
// - Request OTP
// - Verify OTP
// - Backend returns token + user
// - Save JWT & close popup
// - No server cart sync needed
// ===============================================================

import React, { useContext, useEffect, useRef, useState } from "react";
import "./LoginPopup.css";
import { assets } from "../../assets/assets";
import { StoreContext } from "../../Context/StoreContext";
import axios from "axios";
import { toast } from "react-toastify";

const LoginPopup = ({ setShowLogin, forceLogin = false }) => {
  const { token, setToken, url } = useContext(StoreContext);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("phone");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const otpReqAbortRef = useRef(null);
  const verifyAbortRef = useRef(null);

  // If token exists → auto close popup
  useEffect(() => {
    if (token && !forceLogin) setShowLogin(false);
  }, [token, forceLogin, setShowLogin]);

  // Prevent scrolling behind popup
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = originalOverflow);
  }, []);

  const startCooldown = (seconds = 60) => {
    let sec = Number(seconds) || 60;
    setCooldown(sec);

    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /* ---------------------------------------------------
     SEND OTP
  --------------------------------------------------- */
  const sendOtp = async (e) => {
    e.preventDefault();

    if (!phone.startsWith("+")) {
      toast.error("Use phone format +91XXXXXXXXXX");
      return;
    }

    if (cooldown > 0 || busy) return;

    if (otpReqAbortRef.current) otpReqAbortRef.current.abort();
    otpReqAbortRef.current = new AbortController();

    setBusy(true);
    try {
      const res = await axios.post(
        `${url}/api/sms/request`,
        { phoneNumber: phone },
        { signal: otpReqAbortRef.current.signal, validateStatus: () => true }
      );

      if (res.data?.success) {
        setStep("otp");
        startCooldown(res.data.cooldownSeconds || 60);
        toast.success("OTP sent");
      } else {
        if (typeof res.data?.remaining === "number") {
          startCooldown(res.data.remaining);
        }
        toast.error(res.data?.message || "Failed to send OTP");
      }
    } catch (err) {
      if (err.name !== "CanceledError") {
        console.error(err);
        toast.error("Failed to send OTP");
      }
    } finally {
      setBusy(false);
    }
  };

  /* ---------------------------------------------------
     VERIFY OTP
  --------------------------------------------------- */
  const verifyOtp = async (e) => {
    e.preventDefault();
    if (busy || otp.trim().length < 4) return;

    if (verifyAbortRef.current) verifyAbortRef.current.abort();
    verifyAbortRef.current = new AbortController();

    setBusy(true);
    try {
      const res = await axios.post(
        `${url}/api/sms/verify`,
        { phoneNumber: phone, otp: otp.trim() },
        { signal: verifyAbortRef.current.signal, validateStatus: () => true }
      );

      if (res.data?.success && res.data?.token) {
        // Save token
        setToken(res.data.token);
        localStorage.setItem("token", res.data.token);

        toast.success("Logged in successfully");

        if (!forceLogin) setShowLogin(false);
      } else {
        toast.error(res.data?.message || "Invalid OTP");
      }
    } catch (err) {
      if (err.name !== "CanceledError") {
        console.error(err);
        toast.error("OTP verification failed");
      }
    } finally {
      setBusy(false);
    }
  };

  // Cleanup abort controllers
  useEffect(() => {
    return () => {
      if (otpReqAbortRef.current) otpReqAbortRef.current.abort();
      if (verifyAbortRef.current) verifyAbortRef.current.abort();
    };
  }, []);

  /* ---------------------------------------------------
     UI
  --------------------------------------------------- */
  return (
    <div className="login-popup">
      <form
        onSubmit={step === "phone" ? sendOtp : verifyOtp}
        className="login-popup-container"
      >
        <div className="login-popup-title">
          <h2>{step === "phone" ? "Sign in with phone" : "Enter OTP"}</h2>
          {!forceLogin && (
            <img src={assets.cross_icon} alt="Close" onClick={() => setShowLogin(false)} />
          )}
        </div>

        <div className="login-popup-inputs">
          {step === "phone" ? (
            <input
              name="phone"
              type="tel"
              placeholder="+91XXXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          ) : (
            <input
              name="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="OTP"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, ""))
              }
              required
            />
          )}
        </div>

        {step === "phone" ? (
          <button disabled={busy || cooldown > 0}>
            {cooldown > 0 ? `Send OTP (${cooldown}s)` : "Send OTP"}
          </button>
        ) : (
          <>
            <button disabled={busy || otp.length < 4}>Verify</button>
            <p style={{ marginTop: 8 }}>
              Didn’t get it?{" "}
              <span
                style={{
                  color: cooldown > 0 ? "#888" : "#007bff",
                  cursor: cooldown > 0 ? "not-allowed" : "pointer",
                }}
                onClick={cooldown > 0 ? undefined : sendOtp}
              >
                Resend OTP {cooldown > 0 ? `in ${cooldown}s` : ""}
              </span>
            </p>
          </>
        )}
      </form>
    </div>
  );
};

export default LoginPopup;
