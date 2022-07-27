"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dataProducerModules_1 = require("../modules/dataProducerModules ");
exports.default = (socket) => {
    socket.on("getDataProducersByTransportId", (id, callback) => {
        callback((0, dataProducerModules_1.getDataProducerById)(id));
    });
    socket.on("getDataProducers", (callback) => {
        callback((0, dataProducerModules_1.getDataProducer)());
    });
};
