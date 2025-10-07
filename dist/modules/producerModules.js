"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProducer = exports.getProducerById = void 0;
const MediaSoupStore_1 = require("../bin/MediaSoupStore");
const getProducerById = (id) => {
    return MediaSoupStore_1.store.getProducersByTransportId(id);
};
exports.getProducerById = getProducerById;
const getProducer = () => {
    return MediaSoupStore_1.store.getProducerIds();
};
exports.getProducer = getProducer;
