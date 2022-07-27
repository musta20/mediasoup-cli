"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webrtcServerModules_1 = require("../modules/webrtcServerModules");
exports.default = (socket) => {
    socket.on("getwebrtcServersByWorkerId", (id, callback) => {
        callback((0, webrtcServerModules_1.getWebRtcServerByWorkerId)(id));
    });
    socket.on("getwebrtcServers", (callback) => {
        callback((0, webrtcServerModules_1.getWebrtcServer)());
    });
};
