"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDataConsumer = exports.getDataConsumerById = void 0;
const MediaSoupStore_1 = require("../bin/MediaSoupStore");
const getDataConsumerById = (id) => {
    return MediaSoupStore_1.store.getDataConsumersByTransportId(id);
};
exports.getDataConsumerById = getDataConsumerById;
const getDataConsumer = () => {
    return MediaSoupStore_1.store.getDataConsumerIds();
};
exports.getDataConsumer = getDataConsumer;
