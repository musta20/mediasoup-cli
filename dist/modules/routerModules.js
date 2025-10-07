"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRouters = exports.getRouterByWorkerId = void 0;
const MediaSoupStore_1 = require("../bin/MediaSoupStore");
const getRouterByWorkerId = (id) => {
    return MediaSoupStore_1.store.getRoutersByWorkerId(id);
};
exports.getRouterByWorkerId = getRouterByWorkerId;
const getRouters = () => {
    return MediaSoupStore_1.store.getRouterIds();
};
exports.getRouters = getRouters;
