#! /usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const cmd_1 = __importDefault(require("./cli/cmd"));
const serverConnection_1 = require("./utils/serverConnection");
const main = async () => {
    (0, serverConnection_1.connectSdk)();
    (0, cmd_1.default)();
};
main().catch(e => {
    console.log(e);
});
