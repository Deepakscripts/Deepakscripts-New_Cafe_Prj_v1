// backend/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

import { connectDB } from "./config/db.js";
import userRouter from "./routes/userRoute.js";
import foodRouter from "./routes/foodRoute.js";
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";
import smsRouter from "./routes/smsRoute.js";

// NEW: analytics + dev seed routes
import analyticsRouter from "./routes/analyticsRoute.js";

// -------------------- APP CONFIG --------------------
const app = express();
const port = process.env.PORT || 4000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error("FATAL: JWT_SECRET is missing or too short. Add it to backend/.env");
  process.exit(1);
}

// -------------------- CORS CONFIG --------------------
const defaultOrigins = [
  "http://localhost:5173", // user frontend
  "http://localhost:5174", // admin frontend
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

const envOrigins = (process.env.FRONTEND_URLS || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

const allowedOrigins = envOrigins.length ? envOrigins : defaultOrigins;

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "token", "authorization"],
    credentials: true,
  })
);

app.options("*", cors());

// -------------------- BODY PARSER --------------------
app.use(express.json());

// -------------------- DATABASE ------------------------
connectDB();

// -------------------- ROUTES --------------------------
app.use("/api/user", userRouter);
app.use("/api/food", foodRouter);
app.use("/images", express.static("uploads"));
app.use("/api/cart", cartRouter);
app.use("/api/order", orderRouter);
app.use("/api/sms", smsRouter);
app.use("/api/analytics", analyticsRouter);

// Root endpoint
app.get("/", (_req, res) => {
  res.send("API Working");
});

// -------------------- HTTP + SOCKET.IO SERVER --------------------
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Make io available in controllers
app.set("io", io);

// Handle admin & user socket connections
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

// -------------------- START SERVER --------------------
const host = process.env.HOST || "0.0.0.0";

server.listen(port, host, () => {
  const printableHost = host === "0.0.0.0" ? "localhost" : host;
  console.log(`🚀 Server running at http://${printableHost}:${port}`);
  console.log("🌐 CORS allowed origins:", allowedOrigins.join(", "));
  console.log("🔔 Socket.IO active!");
});
