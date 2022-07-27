"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const store_1 = require("./store");
const socket_io_1 = require("socket.io");
const ConsumersResolver_1 = __importDefault(require("../Resolvers/ConsumersResolver"));
const ProducerResolver_1 = __importDefault(require("../Resolvers/ProducerResolver"));
const DataConsumersResolver_1 = __importDefault(require("../Resolvers/DataConsumersResolver"));
const DataProducerResolver_1 = __importDefault(require("../Resolvers/DataProducerResolver"));
const TansportsResolver_1 = __importDefault(require("../Resolvers/TansportsResolver"));
const WebRtcResolver_1 = __importDefault(require("../Resolvers/WebRtcResolver"));
const WorkerResolver_1 = __importDefault(require("../Resolvers/WorkerResolver"));
const RouterResolver_1 = __importDefault(require("../Resolvers/RouterResolver"));
const liveLogger_1 = require("../utils/liveLogger");
const chalk_1 = __importDefault(require("chalk"));
const updateEnv_1 = require("../utils/updateEnv");
const config_1 = __importDefault(require("../config"));
console.log(chalk_1.default.blueBright((0, updateEnv_1.getEnvValue)('MEDIA_SOUP_CLI_PORT')));
(0, updateEnv_1.setEnvValue)('MEDIA_SOUP_CLI_PORT', 6525);
const env = (0, config_1.default)();
const MEDIA_SOUP_CLI_PORT = env.MEDIA_SOUP_CLI_PORT;
console.log(MEDIA_SOUP_CLI_PORT);
const io = new socket_io_1.Server();
const startCliServer = async () => {
    io.on("connection", (socket) => {
        socket.on("requestLog", (name, id) => {
            socket.join("log");
            (0, liveLogger_1.activeLog)(io, name, id);
        });
        (0, ConsumersResolver_1.default)(socket);
        (0, ProducerResolver_1.default)(socket);
        (0, DataConsumersResolver_1.default)(socket);
        (0, DataProducerResolver_1.default)(socket);
        (0, TansportsResolver_1.default)(socket);
        (0, WebRtcResolver_1.default)(socket);
        (0, WorkerResolver_1.default)(socket);
        (0, RouterResolver_1.default)(socket);
    });
    io.listen(MEDIA_SOUP_CLI_PORT);
};
startCliServer();
exports.observer = ({ observer, }) => observer.on(store_1.NEW_WORKER_EVENT, (worker) => {
    store_1.workers.push({ worker, routers: [], webRtcServer: [] });
    (0, liveLogger_1.logWorkers)(io);
    worker.observer.on(store_1.CLOSE_EVENT, () => {
        const Index = store_1.workers.findIndex((w) => w.worker.pid === worker.pid);
        store_1.workers.splice(Index, 1);
        (0, liveLogger_1.logWorkers)(io);
    });
    worker.observer.on(store_1.NEW_ROUTER_EVENT, (router) => {
        var _a;
        store_1.routers.push(router);
        store_1.routersOvject.push({ router: router, transport: [] });
        const workerIndex = store_1.workers.findIndex((w) => w.worker.pid === worker.pid);
        (_a = store_1.workers === null || store_1.workers === void 0 ? void 0 : store_1.workers[workerIndex]) === null || _a === void 0 ? void 0 : _a.routers.push(router);
        (0, liveLogger_1.logRouters)(io);
        router.observer.on(store_1.CLOSE_EVENT, () => {
            const Index = store_1.routers.findIndex((ro) => ro.id === router.id);
            store_1.routers.splice(Index, 1);
            const routerObjIndex = store_1.routersOvject.findIndex((r) => r.router.id === router.id);
            (0, store_1.removeWorkerItem)(worker.pid, router.id);
            store_1.routersOvject.splice(routerObjIndex, 1);
            (0, liveLogger_1.logRouters)(io);
        });
        router.observer.on(store_1.NEW_TRANSPORT_EVENT, (transport) => {
            var _a;
            store_1.transports.push(transport);
            const routerIndex = store_1.routersOvject.findIndex((r) => r.router.id === router.id);
            (_a = store_1.routersOvject === null || store_1.routersOvject === void 0 ? void 0 : store_1.routersOvject[routerIndex]) === null || _a === void 0 ? void 0 : _a.transport.push(transport);
            store_1.TransporObject.push({
                transport: transport,
                consumer: [],
                dataConsumer: [],
                dataProducer: [],
                producer: [],
            });
            (0, liveLogger_1.logTransport)(io);
            transport.observer.on(store_1.CLOSE_EVENT, () => {
                var _a, _b;
                const routerIndex = store_1.routersOvject.findIndex((r) => r.router.id === router.id);
                const transportindex = (_a = store_1.routersOvject === null || store_1.routersOvject === void 0 ? void 0 : store_1.routersOvject[routerIndex]) === null || _a === void 0 ? void 0 : _a.transport.findIndex((t) => t.id === transport.id);
                (_b = store_1.routersOvject === null || store_1.routersOvject === void 0 ? void 0 : store_1.routersOvject[routerIndex]) === null || _b === void 0 ? void 0 : _b.transport.splice(transportindex, 1);
                const Index = store_1.transports.findIndex((tr) => tr.id === transport.id);
                store_1.transports.splice(Index, 1);
                const transportObjectIndex = store_1.TransporObject.findIndex((t) => t.transport.id === transport.id);
                store_1.TransporObject.splice(transportObjectIndex, 1);
                (0, liveLogger_1.logTransport)(io);
            });
            transport.observer.on(store_1.NEW_PRODUCER_EVENT, (producer) => {
                store_1.producers.push(producer);
                const Index = store_1.TransporObject.findIndex((t) => t.transport.id === transport.id);
                store_1.TransporObject[Index].producer.push(producer);
                (0, liveLogger_1.logProducers)(io);
                producer.observer.on(store_1.CLOSE_EVENT, () => {
                    const producetIndex = store_1.producers.findIndex((p) => p.id === producer.id);
                    store_1.producers.splice(producetIndex, 1);
                    (0, store_1.removeTranspotItem)(transport.id, producer.id, "producer");
                    (0, liveLogger_1.logProducers)(io);
                });
            });
            transport.observer.on(store_1.NEW_CONSUMER_EVENT, (consumer) => {
                store_1.consumers.push(consumer);
                const TransportItemIndex = store_1.TransporObject.findIndex((t) => t.transport.id === transport.id);
                store_1.TransporObject[TransportItemIndex].consumer.push(consumer);
                (0, liveLogger_1.logConsumers)(io);
                consumer.observer.on(store_1.CLOSE_EVENT, () => {
                    const consumerIndex = store_1.consumers.findIndex((c) => c.id === consumer.id);
                    store_1.consumers.splice(consumerIndex, 1);
                    (0, store_1.removeTranspotItem)(transport.id, consumer.id, "consumer");
                    (0, liveLogger_1.logConsumers)(io);
                });
            });
            transport.observer.on(store_1.NEW_DATA_PRODUCER_EVENT, (dataProducer) => {
                store_1.dataProducers.push(dataProducer);
                const transportObjectIndex = store_1.TransporObject.findIndex((t) => t.transport.id === transport.id);
                store_1.TransporObject[transportObjectIndex].dataProducer.push(dataProducer);
                (0, liveLogger_1.logdataProducers)(io);
                dataProducer.observer.on(store_1.CLOSE_EVENT, () => {
                    const dataProducerIndex = store_1.dataProducers.findIndex((d) => d.id === dataProducer.id);
                    store_1.dataProducers.splice(dataProducerIndex, 1);
                    (0, store_1.removeTranspotItem)(transport.id, dataProducer.id, "dataProducer");
                    (0, liveLogger_1.logdataProducers)(io);
                });
            });
            transport.observer.on(store_1.NEW_DATA_CONSUMER_EVENT, (dataConsumer) => {
                store_1.dataConsumers.push(dataConsumer);
                const transportObjectIndex = store_1.TransporObject.findIndex((t) => t.transport.id === transport.id);
                store_1.TransporObject[transportObjectIndex].dataConsumer.push(dataConsumer);
                (0, liveLogger_1.logdataConsumers)(io);
                dataConsumer.observer.on(store_1.CLOSE_EVENT, () => {
                    const dataConsumerIndex = store_1.dataConsumers.findIndex((d) => d.id === dataConsumer.id);
                    store_1.dataConsumers.splice(dataConsumerIndex, 1);
                    (0, store_1.removeTranspotItem)(transport.id, dataConsumer.id, "dataConsumer");
                    (0, liveLogger_1.logdataConsumers)(io);
                });
            });
        });
    });
    worker.observer.on(store_1.NEW_WEBRTC_SERVER, (webRtcServer) => {
        var _a;
        store_1.webRtcServers.push(webRtcServer);
        const workerIndex = store_1.workers.findIndex((w) => w.worker.pid === worker.pid);
        (_a = store_1.workers === null || store_1.workers === void 0 ? void 0 : store_1.workers[workerIndex]) === null || _a === void 0 ? void 0 : _a.webRtcServer.push(webRtcServer);
        (0, liveLogger_1.logWebrtcServer)(io);
        webRtcServer.observer.on(store_1.CLOSE_EVENT, () => {
            var _a;
            const webRtcServerIndexItem = store_1.webRtcServers.findIndex((w) => w.id === webRtcServer.id);
            store_1.webRtcServers.splice(webRtcServerIndexItem, 1);
            const workerIndex = store_1.workers.findIndex((w) => w.worker.pid === worker.pid);
            const webRtcServerIndex = store_1.workers[workerIndex].webRtcServer.findIndex((w) => w.id === webRtcServer.id);
            (_a = store_1.workers === null || store_1.workers === void 0 ? void 0 : store_1.workers[workerIndex]) === null || _a === void 0 ? void 0 : _a.webRtcServer.splice(webRtcServerIndex, 1);
            (0, liveLogger_1.logWebrtcServer)(io);
        });
    });
});
