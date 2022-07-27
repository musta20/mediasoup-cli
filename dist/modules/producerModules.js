"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProducer = exports.getProducerById = void 0;
const store_1 = require("../bin/store");
const getProducerById = (id) => {
    var _a, _b;
    const transportIndex = store_1.TransporObject.findIndex((w) => w.transport.id === id);
    if (transportIndex < 0)
        return [];
    return (_b = (_a = store_1.TransporObject[transportIndex]) === null || _a === void 0 ? void 0 : _a.producer) === null || _b === void 0 ? void 0 : _b.map((r) => {
        return r.id;
    });
};
exports.getProducerById = getProducerById;
const getProducer = () => {
    return store_1.producers.map((r) => {
        return r.id;
    });
};
exports.getProducer = getProducer;
