"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConsumer = exports.getConsumerById = void 0;
const MediaSoupStore_1 = require("../bin/MediaSoupStore");
const getConsumerById = (id) => {
    return MediaSoupStore_1.store.getConsumersByTransportId(id);
};
exports.getConsumerById = getConsumerById;
const getConsumer = () => {
    return MediaSoupStore_1.store.getConsumerIds();
};
exports.getConsumer = getConsumer;
