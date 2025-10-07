"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebrtcServer = exports.getWebRtcServerByWorkerId = void 0;
const MediaSoupStore_1 = require("../bin/MediaSoupStore");
const getWebRtcServerByWorkerId = (id) => {
    return MediaSoupStore_1.store.getWebRtcServersByWorkerId(id);
};
exports.getWebRtcServerByWorkerId = getWebRtcServerByWorkerId;
const getWebrtcServer = () => {
    return MediaSoupStore_1.store.getWebRtcServerIds();
};
exports.getWebrtcServer = getWebrtcServer;
