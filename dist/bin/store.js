"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransporObject = exports.webRtcServers = exports.dataProducers = exports.dataConsumers = exports.consumers = exports.producers = exports.transports = exports.routersOvject = exports.routers = exports.workers = exports.addTranspotItem = exports.removeTranspotItem = exports.removeRouterItem = exports.addRouterItem = exports.removeWorkerItem = exports.addWorkerItem = exports.loggerOption = exports.CLOSE_EVENT = exports.NEW_WEBRTC_SERVER = exports.NEW_DATA_CONSUMER_EVENT = exports.NEW_DATA_PRODUCER_EVENT = exports.NEW_CONSUMER_EVENT = exports.NEW_PRODUCER_EVENT = exports.NEW_TRANSPORT_EVENT = exports.NEW_ROUTER_EVENT = exports.NEW_WORKER_EVENT = void 0;
const workers = [];
exports.workers = workers;
const routers = [];
exports.routers = routers;
const routersOvject = [];
exports.routersOvject = routersOvject;
const TransporObject = [];
exports.TransporObject = TransporObject;
const transports = [];
exports.transports = transports;
const producers = [];
exports.producers = producers;
const consumers = [];
exports.consumers = consumers;
exports.NEW_WORKER_EVENT = "newworker", exports.NEW_ROUTER_EVENT = "newrouter", exports.NEW_TRANSPORT_EVENT = "newtransport", exports.NEW_PRODUCER_EVENT = "newproducer", exports.NEW_CONSUMER_EVENT = "newconsumer", exports.NEW_DATA_PRODUCER_EVENT = "newdataproducer", exports.NEW_DATA_CONSUMER_EVENT = "newdataconsumer", exports.NEW_WEBRTC_SERVER = "newwebrtcserver", exports.CLOSE_EVENT = "close";
exports.loggerOption = {
    activeLogTransportid: "",
    activeLogRouterid: "",
    activeLogWorkerid: 0,
    activeLogAllRouter: false,
    activeLogAllRouterId: "",
    activeLogRouter: false,
    activeLogConsumer: false,
    activeLogProducer: false,
    activeLogTransport: false,
    activeLogdataConsumer: false,
    activeLogdataProducer: false,
    activelogWorker: false,
    activelogWebrtcserver: false,
};
const webRtcServers = [];
exports.webRtcServers = webRtcServers;
const dataConsumers = [];
exports.dataConsumers = dataConsumers;
const dataProducers = [];
exports.dataProducers = dataProducers;
const removeTranspotItem = (transportIndex, itemIndex, type) => {
    const indexObject = TransporObject.findIndex((t) => t.transport.id === transportIndex);
    if (typeof TransporObject[indexObject][type] !== "object") {
        const itemtypeIndex = TransporObject[indexObject][type].findIndex((item) => item.id === itemIndex);
        TransporObject[indexObject][type].splice(itemtypeIndex, 1);
    }
};
exports.removeTranspotItem = removeTranspotItem;
const addTranspotItem = (transportIndex, itemIndex, type) => {
    const indexObject = TransporObject.findIndex((t) => t.transport.id === transportIndex);
    if (typeof TransporObject[indexObject][type] !== "object") {
        TransporObject[indexObject][type].push(itemIndex);
    }
};
exports.addTranspotItem = addTranspotItem;
const removeRouterItem = (routerIndex, itemIndex) => {
    const indexObject = routersOvject.findIndex((t) => t.router.id === routerIndex);
    const transportIndex = routersOvject[indexObject].transport.findIndex((item) => item.id === itemIndex);
    routersOvject[indexObject].transport.splice(transportIndex, 1);
};
exports.removeRouterItem = removeRouterItem;
const addRouterItem = (routerIndex, transportItem) => {
    const indexObject = routersOvject.findIndex((t) => t.router.id === routerIndex);
    routersOvject[indexObject].transport.push(transportItem);
};
exports.addRouterItem = addRouterItem;
const removeWorkerItem = (workerIndex, routerIndex) => {
    const indexworker = workers.findIndex((t) => t.worker.pid == workerIndex);
    const routerWorkerIndex = workers[indexworker].routers.findIndex((item) => item.id === routerIndex);
    workers[indexworker].routers.splice(routerWorkerIndex, 1);
};
exports.removeWorkerItem = removeWorkerItem;
const addWorkerItem = (routerIndex, transportItem) => {
    const indexObject = routersOvject.findIndex((t) => t.router.id === routerIndex);
    routersOvject[indexObject].transport.push(transportItem);
};
exports.addWorkerItem = addWorkerItem;
