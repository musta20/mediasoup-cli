"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectSdk = exports.socket = void 0;
const socket_io_client_1 = require("socket.io-client");
const config_1 = __importDefault(require("../config"));
const connectSdk = async () => {
    const env = (0, config_1.default)();
    try {
        exports.socket = (0, socket_io_client_1.io)(`http://localhost:${env.MEDIA_SOUP_CLI_PORT}/`);
    }
    catch (e) {
        throw e;
    }
};
exports.connectSdk = connectSdk;
