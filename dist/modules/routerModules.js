"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRouters = exports.getRouterByWorkerId = void 0;
const store_1 = require("../bin/store");
const getRouterByWorkerId = (id) => {
    var _a, _b;
    const workerIndex = store_1.workers.findIndex((w) => w.worker.pid == id);
    if (workerIndex < 0)
        return [];
    return (_b = (_a = store_1.workers[workerIndex]) === null || _a === void 0 ? void 0 : _a.routers) === null || _b === void 0 ? void 0 : _b.map((r) => {
        return r.id;
    });
};
exports.getRouterByWorkerId = getRouterByWorkerId;
const getRouters = () => {
    return store_1.routers.map((r) => {
        return r.id;
    });
};
exports.getRouters = getRouters;
