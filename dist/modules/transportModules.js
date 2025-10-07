"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllTransport = exports.getTransport = exports.getTransportByRouterId = void 0;
const MediaSoupStore_1 = require("../bin/MediaSoupStore");
const getTransportByRouterId = (id) => {
    return MediaSoupStore_1.store.getTransportsByRouterId(id);
};
exports.getTransportByRouterId = getTransportByRouterId;
const getTransport = () => {
    return MediaSoupStore_1.store.getTransportIds();
};
exports.getTransport = getTransport;
const getAllTransport = (id) => {
    return MediaSoupStore_1.store.getAllTransportContent(id);
};
exports.getAllTransport = getAllTransport;
