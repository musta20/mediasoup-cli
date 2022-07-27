"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const producerModules_1 = require("../modules/producerModules");
;
exports.default = (socket) => {
    socket.on("getProducersByTransportId", (id, callback) => {
        callback((0, producerModules_1.getProducerById)(id));
    });
    socket.on("getProducers", (callback) => {
        callback((0, producerModules_1.getProducer)());
    });
};
