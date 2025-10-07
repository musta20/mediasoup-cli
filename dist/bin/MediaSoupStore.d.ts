import { Consumer } from "mediasoup/node/lib/Consumer";
import { Producer } from "mediasoup/node/lib/Producer";
import { DataConsumer } from "mediasoup/node/lib/DataConsumer";
import { DataProducer } from "mediasoup/node/lib/DataProducer";
import { Router } from "mediasoup/node/lib/Router";
import { Transport } from "mediasoup/node/lib/Transport";
import { Worker } from "mediasoup/node/lib/Worker";
import { WebRtcServer } from "mediasoup/node/lib/WebRtcServer";
export interface WorkerData {
    worker: Worker;
    routerIds: Set<string>;
    webRtcServerIds: Set<string>;
}
export interface RouterData {
    router: Router;
    transportIds: Set<string>;
}
export interface TransportData {
    transport: Transport;
    producerIds: Set<string>;
    consumerIds: Set<string>;
    dataProducerIds: Set<string>;
    dataConsumerIds: Set<string>;
}
export declare class MediaSoupStore {
    private workers;
    private routers;
    private transports;
    private producers;
    private consumers;
    private dataProducers;
    private dataConsumers;
    private webRtcServers;
    addWorker(worker: Worker): void;
    removeWorker(pid: number): void;
    getWorker(pid: number): Worker | undefined;
    getAllWorkers(): Worker[];
    getWorkerIds(): number[];
    addRouter(workerId: number, router: Router): void;
    removeRouter(workerId: number, routerId: string): void;
    getRouter(routerId: string): Router | undefined;
    getAllRouters(): Router[];
    getRouterIds(): string[];
    getRoutersByWorkerId(workerId: number): string[];
    addTransport(routerId: string, transport: Transport): void;
    removeTransport(routerId: string, transportId: string): void;
    getTransport(transportId: string): Transport | undefined;
    getAllTransports(): Transport[];
    getTransportIds(): string[];
    getTransportsByRouterId(routerId: string): string[];
    addProducer(transportId: string, producer: Producer): void;
    removeProducer(transportId: string, producerId: string): void;
    getProducer(producerId: string): Producer | undefined;
    getAllProducers(): Producer[];
    getProducerIds(): string[];
    getProducersByTransportId(transportId: string): string[];
    addConsumer(transportId: string, consumer: Consumer): void;
    removeConsumer(transportId: string, consumerId: string): void;
    getConsumer(consumerId: string): Consumer | undefined;
    getAllConsumers(): Consumer[];
    getConsumerIds(): string[];
    getConsumersByTransportId(transportId: string): string[];
    addDataProducer(transportId: string, dataProducer: DataProducer): void;
    removeDataProducer(transportId: string, dataProducerId: string): void;
    getDataProducer(dataProducerId: string): DataProducer | undefined;
    getAllDataProducers(): DataProducer[];
    getDataProducerIds(): string[];
    getDataProducersByTransportId(transportId: string): string[];
    addDataConsumer(transportId: string, dataConsumer: DataConsumer): void;
    removeDataConsumer(transportId: string, dataConsumerId: string): void;
    getDataConsumer(dataConsumerId: string): DataConsumer | undefined;
    getAllDataConsumers(): DataConsumer[];
    getDataConsumerIds(): string[];
    getDataConsumersByTransportId(transportId: string): string[];
    addWebRtcServer(workerId: number, webRtcServer: WebRtcServer): void;
    removeWebRtcServer(workerId: number, webRtcServerId: string): void;
    getWebRtcServer(webRtcServerId: string): WebRtcServer | undefined;
    getAllWebRtcServers(): WebRtcServer[];
    getWebRtcServerIds(): string[];
    getWebRtcServersByWorkerId(workerId: number): string[];
    getAllTransportContent(transportId: string): {
        consumers: string[];
        producers: string[];
        dataConsumer: string[];
        dataProducer: string[];
    };
}
export declare const store: MediaSoupStore;
