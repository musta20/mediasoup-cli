"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dataConsumerModule_1 = require("../modules/dataConsumerModule");
exports.default = (socket) => {
    socket.on("getDataConsumersByTransportId", (id, callback) => {
        callback((0, dataConsumerModule_1.getDataConsumerById)(id));
    });
    socket.on("getDataConsumers", (callback) => {
        callback((0, dataConsumerModule_1.getDataConsumer)());
    });
};
