#! /usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const cmd_1 = __importDefault(require("./cli/cmd"));
const serverConnection_1 = require("./utils/serverConnection");
const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    (0, serverConnection_1.disconnectSdk)();
    process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
const main = async () => {
    try {
        (0, serverConnection_1.connectSdk)();
        await (0, cmd_1.default)();
    }
    catch (error) {
        console.error("Fatal error:", error instanceof Error ? error.message : error);
        (0, serverConnection_1.disconnectSdk)();
        process.exit(1);
    }
};
main().catch(e => {
    console.error("Unhandled error:", e);
    (0, serverConnection_1.disconnectSdk)();
    process.exit(1);
});
