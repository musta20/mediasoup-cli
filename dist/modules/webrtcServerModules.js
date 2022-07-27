"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebrtcServer = exports.getWebRtcServerByWorkerId = void 0;
const store_1 = require("../bin/store");
const getWebRtcServerByWorkerId = (id) => {
    var _a, _b;
    const workerIndex = store_1.workers.findIndex((w) => w.worker.pid === id);
    if (workerIndex < 0)
        return [];
    return (_b = (_a = store_1.workers[workerIndex]) === null || _a === void 0 ? void 0 : _a.webRtcServer) === null || _b === void 0 ? void 0 : _b.map((r) => {
        return r.id;
    });
};
exports.getWebRtcServerByWorkerId = getWebRtcServerByWorkerId;
const getWebrtcServer = () => {
    return store_1.webRtcServers.map((r) => {
        return r.id;
    });
};
exports.getWebrtcServer = getWebrtcServer;
