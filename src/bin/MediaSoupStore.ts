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

/**
 * Centralized store for all mediasoup objects using Maps for O(1) lookups
 */
export class MediaSoupStore {
  // Maps for O(1) lookups
  private workers = new Map<number, WorkerData>();
  private routers = new Map<string, RouterData>();
  private transports = new Map<string, TransportData>();
  private producers = new Map<string, Producer>();
  private consumers = new Map<string, Consumer>();
  private dataProducers = new Map<string, DataProducer>();
  private dataConsumers = new Map<string, DataConsumer>();
  private webRtcServers = new Map<string, WebRtcServer>();

  // Worker operations
  addWorker(worker: Worker): void {
    this.workers.set(worker.pid, {
      worker,
      routerIds: new Set(),
      webRtcServerIds: new Set(),
    });
  }

  removeWorker(pid: number): void {
    this.workers.delete(pid);
  }

  getWorker(pid: number): Worker | undefined {
    return this.workers.get(pid)?.worker;
  }

  getAllWorkers(): Worker[] {
    return Array.from(this.workers.values()).map((data) => data.worker);
  }

  getWorkerIds(): number[] {
    return Array.from(this.workers.keys());
  }

  // Router operations
  addRouter(workerId: number, router: Router): void {
    this.routers.set(router.id, {
      router,
      transportIds: new Set(),
    });

    const workerData = this.workers.get(workerId);
    if (workerData) {
      workerData.routerIds.add(router.id);
    }
  }

  removeRouter(workerId: number, routerId: string): void {
    this.routers.delete(routerId);

    const workerData = this.workers.get(workerId);
    if (workerData) {
      workerData.routerIds.delete(routerId);
    }
  }

  getRouter(routerId: string): Router | undefined {
    return this.routers.get(routerId)?.router;
  }

  getAllRouters(): Router[] {
    return Array.from(this.routers.values()).map((data) => data.router);
  }

  getRouterIds(): string[] {
    return Array.from(this.routers.keys());
  }

  getRoutersByWorkerId(workerId: number): string[] {
    const workerData = this.workers.get(workerId);
    return workerData ? Array.from(workerData.routerIds) : [];
  }

  // Transport operations
  addTransport(routerId: string, transport: Transport): void {
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

  removeTransport(routerId: string, transportId: string): void {
    this.transports.delete(transportId);

    const routerData = this.routers.get(routerId);
    if (routerData) {
      routerData.transportIds.delete(transportId);
    }
  }

  getTransport(transportId: string): Transport | undefined {
    return this.transports.get(transportId)?.transport;
  }

  getAllTransports(): Transport[] {
    return Array.from(this.transports.values()).map((data) => data.transport);
  }

  getTransportIds(): string[] {
    return Array.from(this.transports.keys());
  }

  getTransportsByRouterId(routerId: string): string[] {
    const routerData = this.routers.get(routerId);
    return routerData ? Array.from(routerData.transportIds) : [];
  }

  // Producer operations
  addProducer(transportId: string, producer: Producer): void {
    this.producers.set(producer.id, producer);

    const transportData = this.transports.get(transportId);
    if (transportData) {
      transportData.producerIds.add(producer.id);
    }
  }

  removeProducer(transportId: string, producerId: string): void {
    this.producers.delete(producerId);

    const transportData = this.transports.get(transportId);
    if (transportData) {
      transportData.producerIds.delete(producerId);
    }
  }

  getProducer(producerId: string): Producer | undefined {
    return this.producers.get(producerId);
  }

  getAllProducers(): Producer[] {
    return Array.from(this.producers.values());
  }

  getProducerIds(): string[] {
    return Array.from(this.producers.keys());
  }

  getProducersByTransportId(transportId: string): string[] {
    const transportData = this.transports.get(transportId);
    return transportData ? Array.from(transportData.producerIds) : [];
  }

  // Consumer operations
  addConsumer(transportId: string, consumer: Consumer): void {
    this.consumers.set(consumer.id, consumer);

    const transportData = this.transports.get(transportId);
    if (transportData) {
      transportData.consumerIds.add(consumer.id);
    }
  }

  removeConsumer(transportId: string, consumerId: string): void {
    this.consumers.delete(consumerId);

    const transportData = this.transports.get(transportId);
    if (transportData) {
      transportData.consumerIds.delete(consumerId);
    }
  }

  getConsumer(consumerId: string): Consumer | undefined {
    return this.consumers.get(consumerId);
  }

  getAllConsumers(): Consumer[] {
    return Array.from(this.consumers.values());
  }

  getConsumerIds(): string[] {
    return Array.from(this.consumers.keys());
  }

  getConsumersByTransportId(transportId: string): string[] {
    const transportData = this.transports.get(transportId);
    return transportData ? Array.from(transportData.consumerIds) : [];
  }

  // DataProducer operations
  addDataProducer(transportId: string, dataProducer: DataProducer): void {
    this.dataProducers.set(dataProducer.id, dataProducer);

    const transportData = this.transports.get(transportId);
    if (transportData) {
      transportData.dataProducerIds.add(dataProducer.id);
    }
  }

  removeDataProducer(transportId: string, dataProducerId: string): void {
    this.dataProducers.delete(dataProducerId);

    const transportData = this.transports.get(transportId);
    if (transportData) {
      transportData.dataProducerIds.delete(dataProducerId);
    }
  }

  getDataProducer(dataProducerId: string): DataProducer | undefined {
    return this.dataProducers.get(dataProducerId);
  }

  getAllDataProducers(): DataProducer[] {
    return Array.from(this.dataProducers.values());
  }

  getDataProducerIds(): string[] {
    return Array.from(this.dataProducers.keys());
  }

  getDataProducersByTransportId(transportId: string): string[] {
    const transportData = this.transports.get(transportId);
    return transportData ? Array.from(transportData.dataProducerIds) : [];
  }

  // DataConsumer operations
  addDataConsumer(transportId: string, dataConsumer: DataConsumer): void {
    this.dataConsumers.set(dataConsumer.id, dataConsumer);

    const transportData = this.transports.get(transportId);
    if (transportData) {
      transportData.dataConsumerIds.add(dataConsumer.id);
    }
  }

  removeDataConsumer(transportId: string, dataConsumerId: string): void {
    this.dataConsumers.delete(dataConsumerId);

    const transportData = this.transports.get(transportId);
    if (transportData) {
      transportData.dataConsumerIds.delete(dataConsumerId);
    }
  }

  getDataConsumer(dataConsumerId: string): DataConsumer | undefined {
    return this.dataConsumers.get(dataConsumerId);
  }

  getAllDataConsumers(): DataConsumer[] {
    return Array.from(this.dataConsumers.values());
  }

  getDataConsumerIds(): string[] {
    return Array.from(this.dataConsumers.keys());
  }

  getDataConsumersByTransportId(transportId: string): string[] {
    const transportData = this.transports.get(transportId);
    return transportData ? Array.from(transportData.dataConsumerIds) : [];
  }

  // WebRtcServer operations
  addWebRtcServer(workerId: number, webRtcServer: WebRtcServer): void {
    this.webRtcServers.set(webRtcServer.id, webRtcServer);

    const workerData = this.workers.get(workerId);
    if (workerData) {
      workerData.webRtcServerIds.add(webRtcServer.id);
    }
  }

  removeWebRtcServer(workerId: number, webRtcServerId: string): void {
    this.webRtcServers.delete(webRtcServerId);

    const workerData = this.workers.get(workerId);
    if (workerData) {
      workerData.webRtcServerIds.delete(webRtcServerId);
    }
  }

  getWebRtcServer(webRtcServerId: string): WebRtcServer | undefined {
    return this.webRtcServers.get(webRtcServerId);
  }

  getAllWebRtcServers(): WebRtcServer[] {
    return Array.from(this.webRtcServers.values());
  }

  getWebRtcServerIds(): string[] {
    return Array.from(this.webRtcServers.keys());
  }

  getWebRtcServersByWorkerId(workerId: number): string[] {
    const workerData = this.workers.get(workerId);
    return workerData ? Array.from(workerData.webRtcServerIds) : [];
  }

  // Utility method to get all transport content
  getAllTransportContent(transportId: string): {
    consumers: string[];
    producers: string[];
    dataConsumer: string[];
    dataProducer: string[];
  } {
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

// Export singleton instance
export const store = new MediaSoupStore();
