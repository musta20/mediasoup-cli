"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDataProducer = exports.getDataProducerById = void 0;
const MediaSoupStore_1 = require("../bin/MediaSoupStore");
const getDataProducerById = (id) => {
    return MediaSoupStore_1.store.getDataProducersByTransportId(id);
};
exports.getDataProducerById = getDataProducerById;
const getDataProducer = () => {
    return MediaSoupStore_1.store.getDataProducerIds();
};
exports.getDataProducer = getDataProducer;
