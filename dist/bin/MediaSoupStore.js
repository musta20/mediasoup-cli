"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = exports.MediaSoupStore = void 0;
class MediaSoupStore {
    constructor() {
        this.workers = new Map();
        this.routers = new Map();
        this.transports = new Map();
        this.producers = new Map();
        this.consumers = new Map();
        this.dataProducers = new Map();
        this.dataConsumers = new Map();
        this.webRtcServers = new Map();
    }
    addWorker(worker) {
        this.workers.set(worker.pid, {
            worker,
            routerIds: new Set(),
            webRtcServerIds: new Set(),
        });
    }
    removeWorker(pid) {
        this.workers.delete(pid);
    }
    getWorker(pid) {
        var _a;
        return (_a = this.workers.get(pid)) === null || _a === void 0 ? void 0 : _a.worker;
    }
    getAllWorkers() {
        return Array.from(this.workers.values()).map((data) => data.worker);
    }
    getWorkerIds() {
        return Array.from(this.workers.keys());
    }
    addRouter(workerId, router) {
        this.routers.set(router.id, {
            router,
            transportIds: new Set(),
        });
        const workerData = this.workers.get(workerId);
        if (workerData) {
            workerData.routerIds.add(router.id);
        }
    }
    removeRouter(workerId, routerId) {
        this.routers.delete(routerId);
        const workerData = this.workers.get(workerId);
        if (workerData) {
            workerData.routerIds.delete(routerId);
        }
    }
    getRouter(routerId) {
        var _a;
        return (_a = this.routers.get(routerId)) === null || _a === void 0 ? void 0 : _a.router;
    }
    getAllRouters() {
        return Array.from(this.routers.values()).map((data) => data.router);
    }
    getRouterIds() {
        return Array.from(this.routers.keys());
    }
    getRoutersByWorkerId(workerId) {
        const workerData = this.workers.get(workerId);
        return workerData ? Array.from(workerData.routerIds) : [];
    }
    addTransport(routerId, transport) {
        this.transports.set(transport.id, {
            transport,
            producerIds: new Set(),
            consumerIds: new Set(),
            dataProducerIds: new Set(),
            dataConsumerIds: new Set(),
        });
        const routerData = this.routers.get(routerId);
        if (routerData) {
            routerData.transportIds.add(transport.id);
        }
    }
    removeTransport(routerId, transportId) {
        this.transports.delete(transportId);
        const routerData = this.routers.get(routerId);
        if (routerData) {
            routerData.transportIds.delete(transportId);
        }
    }
    getTransport(transportId) {
        var _a;
        return (_a = this.transports.get(transportId)) === null || _a === void 0 ? void 0 : _a.transport;
    }
    getAllTransports() {
        return Array.from(this.transports.values()).map((data) => data.transport);
    }
    getTransportIds() {
        return Array.from(this.transports.keys());
    }
    getTransportsByRouterId(routerId) {
        const routerData = this.routers.get(routerId);
        return routerData ? Array.from(routerData.transportIds) : [];
    }
    addProducer(transportId, producer) {
        this.producers.set(producer.id, producer);
        const transportData = this.transports.get(transportId);
        if (transportData) {
            transportData.producerIds.add(producer.id);
        }
    }
    removeProducer(transportId, producerId) {
        this.producers.delete(producerId);
        const transportData = this.transports.get(transportId);
        if (transportData) {
            transportData.producerIds.delete(producerId);
        }
    }
    getProducer(producerId) {
        return this.producers.get(producerId);
    }
    getAllProducers() {
        return Array.from(this.producers.values());
    }
    getProducerIds() {
        return Array.from(this.producers.keys());
    }
    getProducersByTransportId(transportId) {
        const transportData = this.transports.get(transportId);
        return transportData ? Array.from(transportData.producerIds) : [];
    }
    addConsumer(transportId, consumer) {
        this.consumers.set(consumer.id, consumer);
        const transportData = this.transports.get(transportId);
        if (transportData) {
            transportData.consumerIds.add(consumer.id);
        }
    }
    removeConsumer(transportId, consumerId) {
        this.consumers.delete(consumerId);
        const transportData = this.transports.get(transportId);
        if (transportData) {
            transportData.consumerIds.delete(consumerId);
        }
    }
    getConsumer(consumerId) {
        return this.consumers.get(consumerId);
    }
    getAllConsumers() {
        return Array.from(this.consumers.values());
    }
    getConsumerIds() {
        return Array.from(this.consumers.keys());
    }
    getConsumersByTransportId(transportId) {
        const transportData = this.transports.get(transportId);
        return transportData ? Array.from(transportData.consumerIds) : [];
    }
    addDataProducer(transportId, dataProducer) {
        this.dataProducers.set(dataProducer.id, dataProducer);
        const transportData = this.transports.get(transportId);
        if (transportData) {
            transportData.dataProducerIds.add(dataProducer.id);
        }
    }
    removeDataProducer(transportId, dataProducerId) {
        this.dataProducers.delete(dataProducerId);
        const transportData = this.transports.get(transportId);
        if (transportData) {
            transportData.dataProducerIds.delete(dataProducerId);
        }
    }
    getDataProducer(dataProducerId) {
        return this.dataProducers.get(dataProducerId);
    }
    getAllDataProducers() {
        return Array.from(this.dataProducers.values());
    }
    getDataProducerIds() {
        return Array.from(this.dataProducers.keys());
    }
    getDataProducersByTransportId(transportId) {
        const transportData = this.transports.get(transportId);
        return transportData ? Array.from(transportData.dataProducerIds) : [];
    }
    addDataConsumer(transportId, dataConsumer) {
        this.dataConsumers.set(dataConsumer.id, dataConsumer);
        const transportData = this.transports.get(transportId);
        if (transportData) {
            transportData.dataConsumerIds.add(dataConsumer.id);
        }
    }
    removeDataConsumer(transportId, dataConsumerId) {
        this.dataConsumers.delete(dataConsumerId);
        const transportData = this.transports.get(transportId);
        if (transportData) {
            transportData.dataConsumerIds.delete(dataConsumerId);
        }
    }
    getDataConsumer(dataConsumerId) {
        return this.dataConsumers.get(dataConsumerId);
    }
    getAllDataConsumers() {
        return Array.from(this.dataConsumers.values());
    }
    getDataConsumerIds() {
        return Array.from(this.dataConsumers.keys());
    }
    getDataConsumersByTransportId(transportId) {
        const transportData = this.transports.get(transportId);
        return transportData ? Array.from(transportData.dataConsumerIds) : [];
    }
    addWebRtcServer(workerId, webRtcServer) {
        this.webRtcServers.set(webRtcServer.id, webRtcServer);
        const workerData = this.workers.get(workerId);
        if (workerData) {
            workerData.webRtcServerIds.add(webRtcServer.id);
        }
    }
    removeWebRtcServer(workerId, webRtcServerId) {
        this.webRtcServers.delete(webRtcServerId);
        const workerData = this.workers.get(workerId);
        if (workerData) {
            workerData.webRtcServerIds.delete(webRtcServerId);
        }
    }
    getWebRtcServer(webRtcServerId) {
        return this.webRtcServers.get(webRtcServerId);
    }
    getAllWebRtcServers() {
        return Array.from(this.webRtcServers.values());
    }
    getWebRtcServerIds() {
        return Array.from(this.webRtcServers.keys());
    }
    getWebRtcServersByWorkerId(workerId) {
        const workerData = this.workers.get(workerId);
        return workerData ? Array.from(workerData.webRtcServerIds) : [];
    }
    getAllTransportContent(transportId) {
        const transportData = this.transports.get(transportId);
        if (!transportData) {
            return {
                consumers: [],
                producers: [],
                dataConsumer: [],
                dataProducer: [],
            };
        }
        return {
            consumers: Array.from(transportData.consumerIds),
            producers: Array.from(transportData.producerIds),
            dataConsumer: Array.from(transportData.dataConsumerIds),
            dataProducer: Array.from(transportData.dataProducerIds),
        };
    }
}
exports.MediaSoupStore = MediaSoupStore;
exports.store = new MediaSoupStore();
