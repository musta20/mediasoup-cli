"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transportModules_1 = require("../modules/transportModules");
exports.default = (socket) => {
    socket.on("getTansportsByRouterId", (id, callback) => {
        callback((0, transportModules_1.getTransportByRouterId)(id));
    });
    socket.on("getTansports", (callback) => {
        callback((0, transportModules_1.getTransport)());
    });
    socket.on("getAllTransportContent", (id, callback) => {
        callback((0, transportModules_1.getAllTransport)(id));
    });
};
