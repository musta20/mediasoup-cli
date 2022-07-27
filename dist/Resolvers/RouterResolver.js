"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const routerModules_1 = require("../modules/routerModules");
exports.default = (socket) => {
    socket.on("getRoutersByWorkerId", (id, callback) => {
        callback((0, routerModules_1.getRouterByWorkerId)(parseInt(id)));
    });
    socket.on("getRouters", (callback) => {
        callback((0, routerModules_1.getRouters)());
    });
};
