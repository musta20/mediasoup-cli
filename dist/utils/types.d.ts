import { Router } from "mediasoup/node/lib/Router";
import { Worker } from "mediasoup/node/lib/Worker";
import { Transport } from "mediasoup/node/lib/Transport";
import { Producer } from "mediasoup/node/lib/Producer";
import { Consumer } from "mediasoup/node/lib/Consumer";
import { DataConsumer } from "mediasoup/node/lib/DataConsumer";
import { DataProducer } from "mediasoup/node/lib/DataProducer";
import { WebRtcServer } from "mediasoup/node/lib/WebRtcServer";
export interface ServerToClientEvents {
    logWorkers: (data: string[]) => void;
    logTransports: (data: string[]) => void;
    logProducers: (data: string[]) => void;
    logConsumers: (data: string[]) => void;
    logRouters: (data: string[]) => void;
    logWebrtcServer: (data: string[]) => void;
    logDataConsumer: (data: string[]) => void;
    logDataProducers: (data: string[]) => void;
    logTransportsID: (data: string[]) => void;
    logRouterID: (data: string[]) => void;
}
declare type callbackWithParam = (Id: string, callback: (data: string[]) => void) => void;
declare type callbackWithNoParam = (callback: (data: string[]) => void) => void;
export interface ClientToServerEvents {
    getRoutersByWorkerId: callbackWithParam;
    getTansportsByRouterId: callbackWithParam;
    getConsumersByTransportId: callbackWithParam;
    getProducersByTransportId: callbackWithParam;
    getDataConsumersByTransportId: callbackWithParam;
    getDataProducersByTransportId: callbackWithParam;
    getwebrtcServersByWorkerId: callbackWithParam;
    getAllTransportContent: (Id: string, callback: (data: TransportAll) => void) => void;
    getwebrtcServers: callbackWithNoParam;
    getWorkers: callbackWithNoParam;
    getRouters: callbackWithNoParam;
    getTansports: callbackWithNoParam;
    getConsumers: callbackWithNoParam;
    getProducers: callbackWithNoParam;
    getDataConsumers: callbackWithNoParam;
    getDataProducers: callbackWithNoParam;
    requestLog: (name: string, id: string | number) => void;
}
export interface InterServerEvents {
    ping: () => void;
}
export interface SocketData {
    name: string;
    age: number;
}
export declare type WorkerItem = {
    worker: Worker;
    routers: Router[];
    webRtcServer: WebRtcServer[];
};
export declare type RouterItem = {
    router: Router;
    transport: Transport[];
};
export interface HeaderType {
    string: any[];
}
export interface observerObtion {
    PORT: number | string | null;
}
interface IndexType {
    [key: string]: Transport | Producer[] | Consumer[] | DataConsumer[] | DataProducer[];
}
export declare type trnasportArrays = DataProducer[] | DataConsumer[] | Producer[] | Consumer[];
export declare type trnasportArraysItem = [] | DataProducer | DataConsumer | Producer | Consumer;
export interface TransportItem extends IndexType {
    transport: Transport;
    producer: Producer[];
    consumer: Consumer[];
    dataConsumer: DataConsumer[];
    dataProducer: DataProducer[];
}
export declare type TransportAll = {
    consumers: string[];
    producers: string[];
    dataConsumer: string[];
    dataProducer: string[];
};
export {};
