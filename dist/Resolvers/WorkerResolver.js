"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const store_1 = require("../bin/store");
exports.default = (socket) => {
    socket.on("getWorkers", (callback) => {
        callback(store_1.workers.map((r) => {
            return r.worker.pid;
        }));
    });
};
