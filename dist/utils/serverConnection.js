"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectSdk = exports.connectSdk = exports.socket = void 0;
const socket_io_client_1 = require("socket.io-client");
const config_1 = __importDefault(require("../config"));
const connectSdk = () => {
    const env = (0, config_1.default)();
    exports.socket = (0, socket_io_client_1.io)(`http://localhost:${env.MEDIA_SOUP_CLI_PORT}/`, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
    });
    exports.socket.on("connect", () => {
        console.log("Connected to mediasoup-cli server");
    });
    exports.socket.on("connect_error", (error) => {
        console.error("Connection error:", error.message);
        console.error("Make sure the mediasoup server with mediasoup-cli observer is running");
    });
    exports.socket.on("disconnect", (reason) => {
        console.log("Disconnected from server:", reason);
    });
};
exports.connectSdk = connectSdk;
const disconnectSdk = () => {
    if (exports.socket && exports.socket.connected) {
        exports.socket.disconnect();
    }
};
exports.disconnectSdk = disconnectSdk;
