"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllTransport = exports.getTransport = exports.getTransportByRouterId = void 0;
const store_1 = require("../bin/store");
const getTransportByRouterId = (id) => {
    var _a, _b;
    const routerIndex = store_1.routers.findIndex((w) => w.id === id);
    if (routerIndex < 0)
        return [];
    return (_b = (_a = store_1.routersObject[routerIndex]) === null || _a === void 0 ? void 0 : _a.transport) === null || _b === void 0 ? void 0 : _b.map((r) => {
        return r.id;
    });
};
exports.getTransportByRouterId = getTransportByRouterId;
const getTransport = () => {
    return store_1.transports.map((r) => {
        return r.id;
    });
};
exports.getTransport = getTransport;
const getAllTransport = (id) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const transportObjectIndex = store_1.TransporObject.findIndex(t => t.transport.id == id);
    const consumersOfTransport = (_b = (_a = store_1.TransporObject[transportObjectIndex]) === null || _a === void 0 ? void 0 : _a.consumer) === null || _b === void 0 ? void 0 : _b.map(c => {
        return c.id;
    });
    const producersOfTransport = (_d = (_c = store_1.TransporObject[transportObjectIndex]) === null || _c === void 0 ? void 0 : _c.producer) === null || _d === void 0 ? void 0 : _d.map(p => {
        return p.id;
    });
    const dataproducersOfTransport = (_f = (_e = store_1.TransporObject[transportObjectIndex]) === null || _e === void 0 ? void 0 : _e.dataProducer) === null || _f === void 0 ? void 0 : _f.map(p => {
        return p.id;
    });
    const dataconsumersOfTransport = (_h = (_g = store_1.TransporObject[transportObjectIndex]) === null || _g === void 0 ? void 0 : _g.dataConsumer) === null || _h === void 0 ? void 0 : _h.map(p => {
        return p.id;
    });
    return {
        consumers: consumersOfTransport,
        producers: producersOfTransport,
        dataConsumer: dataconsumersOfTransport,
        dataProducer: dataproducersOfTransport
    };
};
exports.getAllTransport = getAllTransport;
