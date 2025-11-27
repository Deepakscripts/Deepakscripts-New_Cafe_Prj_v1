// admin/src/utils/socket.js
import { io } from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

let socket = null;

export function initSocket() {
  if (socket) return socket;
  socket = io(API_BASE, {
    transports: ["websocket", "polling"],
    withCredentials: true,
  });
  socket.on("connect", () => {
    console.log("Admin socket connected:", socket.id);
  });
  socket.on("disconnect", () => {
    console.log("Admin socket disconnected");
  });
  return socket;
}

export default function getSocket() {
  if (!socket) return initSocket();
  return socket;
}
