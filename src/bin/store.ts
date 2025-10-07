import { Consumer } from "mediasoup/node/lib/Consumer";
import { Producer } from "mediasoup/node/lib/Producer";
import { DataConsumer } from "mediasoup/node/lib/DataConsumer";
import { DataProducer } from "mediasoup/node/lib/DataProducer";
import { Router } from "mediasoup/node/lib/Router";
import { Transport } from "mediasoup/node/lib/Transport";
import {
  RouterItem,
  TransportItem,
  transportArrays,
  transportArraysItem,
  WorkerItem,
} from "../utils/types";
import { WebRtcServer } from "mediasoup/node/lib/WebRtcServer";

const workers: WorkerItem[] = [];

const routers: Router[] = [];

const routersObject: RouterItem[] = [];

const TransporObject: TransportItem[] = [];

const transports: Transport[] = [];

const producers: Producer[] = [];

const consumers: Consumer[] = [];

export const NEW_WORKER_EVENT = "newworker",
NEW_ROUTER_EVENT = "newrouter",
  NEW_TRANSPORT_EVENT = "newtransport",
  NEW_PRODUCER_EVENT = "newproducer",
  NEW_CONSUMER_EVENT = "newconsumer",
  NEW_DATA_PRODUCER_EVENT = "newdataproducer",
  NEW_DATA_CONSUMER_EVENT = "newdataconsumer",
  NEW_WEBRTC_SERVER = "newwebrtcserver",
  CLOSE_EVENT = "close";

export const loggerOption= {
  activeLogTransportid:"" ,
  activeLogRouterid:"",
  activeLogWorkerid:0,
  activeLogAllRouter :false,
  activeLogAllRouterId:"",
  activeLogRouter: false,
  activeLogConsumer: false,
  activeLogProducer: false,
  activeLogTransport: false,
  activeLogdataConsumer: false,
  activeLogdataProducer: false,
  activelogWorker:false,
  activelogWebrtcserver:false,
};

const webRtcServers: WebRtcServer[] = [];

const dataConsumers: DataConsumer[] = [];

const dataProducers: DataProducer[] = [];

const removeTranspotItem = (
  transportIndex: string,
  itemIndex: string,
  type: string
) => {
  const indexObject = TransporObject.findIndex(
    (t) => t.transport.id === transportIndex
  );

  if (typeof TransporObject[indexObject][type] !== "object") {
    const itemtypeIndex = (
      TransporObject[indexObject][type] as transportArrays
    ).findIndex((item) => item.id === itemIndex);

    (TransporObject[indexObject][type] as transportArrays).splice(
      itemtypeIndex,
      1
    );
  }
};

const addTranspotItem = (
  transportIndex: string,
  itemIndex: transportArraysItem,
  type: string
) => {
  const indexObject = TransporObject.findIndex(
    (t) => t.transport.id === transportIndex
  );

  if (typeof TransporObject[indexObject][type] !== "object") {
    (TransporObject[indexObject][type] as any[]).push(itemIndex);
  }
};

const removeRouterItem = (routerIndex: string, itemIndex: string) => {
  const indexObject = routersObject.findIndex(
    (t) => t.router.id === routerIndex
  );

  const transportIndex = routersObject[indexObject].transport.findIndex(
    (item) => item.id === itemIndex
  );

  routersObject[indexObject].transport.splice(transportIndex, 1);
};

const addRouterItem = (routerIndex: string, transportItem: Transport) => {
  const indexObject = routersObject.findIndex(
    (t) => t.router.id === routerIndex
  );

  routersObject[indexObject].transport.push(transportItem);
};

const removeWorkerItem = (workerIndex: number, routerIndex: string) => {
  const indexworker = workers.findIndex(
    (t) => t.worker.pid == workerIndex
  );

  const routerWorkerIndex = workers[indexworker].routers.findIndex(
    (item) => item.id === routerIndex
  );

  workers[indexworker].routers.splice(routerWorkerIndex, 1);
};

const addWorkerItem = (routerIndex: string, transportItem: Transport) => {
  const indexObject = routersObject.findIndex(
    (t) => t.router.id === routerIndex
  );

  routersObject[indexObject].transport.push(transportItem);
};

export {
  addWorkerItem,
  removeWorkerItem,
  addRouterItem,
  removeRouterItem,
  removeTranspotItem,
  addTranspotItem,
  workers,
  routers,
  routersObject,
  transports,
  producers,
  consumers,
  dataConsumers,
  dataProducers,
  webRtcServers,
  TransporObject,
};
