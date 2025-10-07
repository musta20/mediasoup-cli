"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkers = void 0;
const MediaSoupStore_1 = require("../bin/MediaSoupStore");
const getWorkers = () => {
    return MediaSoupStore_1.store.getWorkerIds();
};
exports.getWorkers = getWorkers;
