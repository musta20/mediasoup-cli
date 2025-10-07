import { ClientToServerEvents, ServerToClientEvents } from "./types";
import { io, Socket } from "socket.io-client";
import confg from "../config";

export let socket: Socket<ServerToClientEvents, ClientToServerEvents>;

export const connectSdk = () => {
  const env = confg();

  socket = io(`http://localhost:${env.MEDIA_SOUP_CLI_PORT}/`, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    console.log("Connected to mediasoup-cli server");
  });

  socket.on("connect_error", (error) => {
    console.error("Connection error:", error.message);
    console.error("Make sure the mediasoup server with mediasoup-cli observer is running");
  });

  socket.on("disconnect", (reason) => {
    console.log("Disconnected from server:", reason);
  });
};

export const disconnectSdk = () => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
};
