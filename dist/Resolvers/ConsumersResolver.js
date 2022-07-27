"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const consumerModule_1 = require("../modules/consumerModule");
exports.default = (socket) => {
    socket.on("getConsumersByTransportId", (id, callback) => {
        callback((0, consumerModule_1.getConsumerById)(id));
    });
    socket.on("getConsumers", (callback) => {
        callback((0, consumerModule_1.getConsumer)());
    });
};
