"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activeLog = exports.logWebrtcServer = exports.logWorkers = exports.logRouters = exports.logdataConsumers = exports.logdataProducers = exports.logProducers = exports.logConsumers = exports.logTransport = void 0;
const transportModules_1 = require("../modules/transportModules");
const store_1 = require("../bin/store");
const consumerModule_1 = require("../modules/consumerModule");
const producerModules_1 = require("../modules/producerModules");
const dataProducerModules_1 = require("../modules/dataProducerModules");
const dataConsumerModule_1 = require("../modules/dataConsumerModule");
const routerModules_1 = require("../modules/routerModules");
const webrtcServerModules_1 = require("../modules/webrtcServerModules");
const logTransport = (io) => {
    if (store_1.loggerOption.activeLogTransport) {
        if (store_1.loggerOption.activeLogRouterid) {
            io.to("log").emit("logTransports", (0, transportModules_1.getTransportByRouterId)(store_1.loggerOption.activeLogRouterid));
            return;
        }
        io.to("log").emit("logTransports", (0, transportModules_1.getTransport)());
    }
};
exports.logTransport = logTransport;
const logConsumers = (io) => {
    if (store_1.loggerOption.activeLogConsumer) {
        if (store_1.loggerOption.activeLogTransportid) {
            io.to("log").emit("logConsumers", (0, consumerModule_1.getConsumerById)(store_1.loggerOption.activeLogTransportid));
            return;
        }
        io.to("log").emit("logConsumers", (0, consumerModule_1.getConsumer)());
    }
};
exports.logConsumers = logConsumers;
const logProducers = (io) => {
    if (store_1.loggerOption.activeLogProducer) {
        if (store_1.loggerOption.activeLogTransportid) {
            io.to("log").emit("logProducers", (0, producerModules_1.getProducerById)(store_1.loggerOption.activeLogTransportid));
            return;
        }
        io.to("log").emit("logProducers", (0, producerModules_1.getProducer)());
    }
};
exports.logProducers = logProducers;
const logdataProducers = (io) => {
    if (store_1.loggerOption.activeLogdataProducer) {
        if (store_1.loggerOption.activeLogTransportid) {
            io.to("log").emit("logDataProducers", (0, dataProducerModules_1.getDataProducerById)(store_1.loggerOption.activeLogTransportid));
            return;
        }
        io.to("log").emit("logDataProducers", (0, dataProducerModules_1.getDataProducer)());
    }
};
exports.logdataProducers = logdataProducers;
const logdataConsumers = (io) => {
    if (store_1.loggerOption.activeLogdataConsumer) {
        if (store_1.loggerOption.activeLogTransportid) {
            io.to("log").emit("logDataConsumer", (0, dataConsumerModule_1.getDataConsumerById)(store_1.loggerOption.activeLogTransportid));
            return;
        }
        io.to("log").emit("logDataConsumer", (0, dataConsumerModule_1.getDataConsumer)());
    }
};
exports.logdataConsumers = logdataConsumers;
const logRouters = (io) => {
    if (store_1.loggerOption.activeLogRouter) {
        if (store_1.loggerOption.activeLogWorkerid) {
            io.to("log").emit("logRouters", (0, routerModules_1.getRouterByWorkerId)(store_1.loggerOption.activeLogWorkerid));
            return;
        }
        io.to("log").emit("logRouters", (0, routerModules_1.getRouters)());
    }
};
exports.logRouters = logRouters;
const logWorkers = (io) => {
    if (store_1.loggerOption.activelogWorker) {
        io.to("log").emit("logRouters", store_1.workers.map((t) => {
            return t.worker.pid + "";
        }));
    }
};
exports.logWorkers = logWorkers;
const logWebrtcServer = (io) => {
    if (store_1.loggerOption.activelogWebrtcserver) {
        if (store_1.loggerOption.activeLogWorkerid) {
            io.to("log").emit("logWebrtcServer", (0, webrtcServerModules_1.getWebRtcServerByWorkerId)(store_1.loggerOption.activeLogWorkerid));
            return;
        }
        io.to("log").emit("logWebrtcServer", (0, webrtcServerModules_1.getWebrtcServer)());
    }
};
exports.logWebrtcServer = logWebrtcServer;
const activeLog = (io, name, id) => {
    switch (name) {
        case "producers":
            store_1.loggerOption.activeLogProducer = true;
            if (id)
                store_1.loggerOption.activeLogTransportid = id;
            (0, exports.logProducers)(io);
            break;
        case "consumer":
            store_1.loggerOption.activeLogConsumer = true;
            if (id)
                store_1.loggerOption.activeLogTransportid = id;
            (0, exports.logConsumers)(io);
            break;
        case "dataconsumers":
            store_1.loggerOption.activeLogdataConsumer = true;
            if (id)
                store_1.loggerOption.activeLogTransportid = id;
            (0, exports.logdataConsumers)(io);
            break;
        case "dataproducers":
            store_1.loggerOption.activeLogProducer = true;
            if (id)
                store_1.loggerOption.activeLogTransportid = id;
            (0, exports.logdataProducers)(io);
            break;
        case "routers":
            store_1.loggerOption.activeLogRouter = true;
            if (id)
                store_1.loggerOption.activeLogWorkerid = id;
            (0, exports.logRouters)(io);
            break;
        case "transports":
            store_1.loggerOption.activeLogTransport = true;
            if (id)
                store_1.loggerOption.activeLogRouterid = id;
            (0, exports.logTransport)(io);
            break;
        case "webrtcserver":
            store_1.loggerOption.activelogWebrtcserver = true;
            if (id)
                store_1.loggerOption.activeLogWorkerid = id;
            (0, exports.logWebrtcServer)(io);
            break;
        case "worker":
            store_1.loggerOption.activelogWorker = true;
            (0, exports.logWorkers)(io);
            break;
        default:
            break;
    }
};
exports.activeLog = activeLog;
