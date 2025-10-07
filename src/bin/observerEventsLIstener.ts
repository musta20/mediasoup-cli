import "reflect-metadata";
import { ObserverEvents } from "mediasoup";
import { EnhancedEventEmitter } from "mediasoup/node/lib/EnhancedEventEmitter";
import { Worker } from "mediasoup/node/lib/types";

import {
  CLOSE_EVENT,
  consumers,
  dataConsumers,
  dataProducers,
  NEW_CONSUMER_EVENT,
  NEW_DATA_CONSUMER_EVENT,
  NEW_DATA_PRODUCER_EVENT,
  NEW_PRODUCER_EVENT,
  NEW_ROUTER_EVENT,
  NEW_TRANSPORT_EVENT,
  NEW_WEBRTC_SERVER,
  NEW_WORKER_EVENT,
  producers,
  removeTranspotItem,
  removeWorkerItem,
  routers,
  routersObject,
  TransporObject,
  transports,
  webRtcServers,
  workers,
} from "./store";

import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
  observerObtion,
} from "../utils/types";
import { Server } from "socket.io";

import consumersResolver from "../Resolvers/ConsumersResolver";
import producerResolver from "../Resolvers/ProducerResolver";
import DataConsumersResolver from "../Resolvers/DataConsumersResolver";
import DataProducerResolver from "../Resolvers/DataProducerResolver";
import TransportsResolver from "../Resolvers/TransportsResolver";
import WebRtcResolver from "../Resolvers/WebRtcResolver";
import WorkerResolver from "../Resolvers/WorkerResolver";
import RouterResolver from "../Resolvers/RouterResolver";
import {
  activeLog,
  logConsumers,
  logdataConsumers,
  logdataProducers,
  logProducers,
  logRouters,
  logTransport,
  logWebrtcServer,
  logWorkers,
} from "../utils/liveLogger";

import { getEnvValue, setEnvValue } from "../utils/updateEnv";

import config from "../config";


exports.observer = (
  { observer }: { observer: EnhancedEventEmitter<ObserverEvents> },
  optionParam: observerObtion
) => {

  const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>();


  
  const startCliServer = async () => {
    io.on("connection", (socket) => {
      socket.on("requestLog", (name, id) => {
        socket.join("log");
        activeLog(io, name, id);
      });

      consumersResolver(socket);
      producerResolver(socket);
      DataConsumersResolver(socket);
      DataProducerResolver(socket);
      TransportsResolver(socket);
      WebRtcResolver(socket);
      WorkerResolver(socket);
      RouterResolver(socket);
    });


    const env = config();
    const MEDIA_SOUP_CLI_PORT = env.MEDIA_SOUP_CLI_PORT;
  

    io.listen(MEDIA_SOUP_CLI_PORT as number);
  };



  if (optionParam?.PORT) {
    const currentPort = parseInt(getEnvValue("MEDIA_SOUP_CLI_PORT") as string);

    const newtPort =
      typeof optionParam.PORT === "string"
        ? parseInt(optionParam.PORT)
        : optionParam.PORT;

    if (currentPort !== newtPort && newtPort !== 0) {
      console.log(newtPort)

      setEnvValue("MEDIA_SOUP_CLI_PORT", newtPort);
    }
  }
  startCliServer();



  observer.on(NEW_WORKER_EVENT, (worker: Worker) => {
    workers.push({ worker, routers: [], webRtcServer: [] });
    logWorkers(io);
    worker.observer.on(CLOSE_EVENT, () => {
      const Index = workers.findIndex((w) => w.worker.pid === worker.pid);
      workers.splice(Index, 1);

      logWorkers(io);
    });

    worker.observer.on(NEW_ROUTER_EVENT, (router) => {
      routers.push(router);
      routersObject.push({ router: router, transport: [] });

      const workerIndex = workers.findIndex((w) => w.worker.pid === worker.pid);

      workers?.[workerIndex]?.routers.push(router);
      logRouters(io);

      router.observer.on(CLOSE_EVENT, () => {
        const Index = routers.findIndex((ro) => ro.id === router.id);

        routers.splice(Index, 1);

        const routerObjIndex = routersObject.findIndex(
          (r) => r.router.id === router.id
        );
        removeWorkerItem(worker.pid, router.id);

        routersObject.splice(routerObjIndex, 1);

        logRouters(io);
      });

      router.observer.on(NEW_TRANSPORT_EVENT, (transport) => {
        transports.push(transport);

        const routerIndex = routersObject.findIndex(
          (r) => r.router.id === router.id
        );

        routersObject?.[routerIndex]?.transport.push(transport);

        TransporObject.push({
          transport: transport,
          consumer: [],
          dataConsumer: [],
          dataProducer: [],
          producer: [],
        });

        logTransport(io);

        transport.observer.on(CLOSE_EVENT, () => {
          const routerIndex = routersObject.findIndex(
            (r) => r.router.id === router.id
          );

          const transportindex = routersObject?.[
            routerIndex
          ]?.transport.findIndex((t) => t.id === transport.id);

          routersObject?.[routerIndex]?.transport.splice(transportindex, 1);

          const Index = transports.findIndex((tr) => tr.id === transport.id);
          transports.splice(Index, 1);

          const transportObjectIndex = TransporObject.findIndex(
            (t) => t.transport.id === transport.id
          );
          TransporObject.splice(transportObjectIndex, 1);

          logTransport(io);
        });

        transport.observer.on(NEW_PRODUCER_EVENT, (producer) => {
          producers.push(producer);
          const Index = TransporObject.findIndex(
            (t) => t.transport.id === transport.id
          );
          TransporObject[Index].producer.push(producer);

          logProducers(io);
          producer.observer.on(CLOSE_EVENT, () => {
            const producetIndex = producers.findIndex(
              (p) => p.id === producer.id
            );

            producers.splice(producetIndex, 1);
            removeTranspotItem(transport.id, producer.id, "producer");
            logProducers(io);
          });
        });

        transport.observer.on(NEW_CONSUMER_EVENT, (consumer) => {
          consumers.push(consumer);

          const TransportItemIndex = TransporObject.findIndex(
            (t) => t.transport.id === transport.id
          );

          TransporObject[TransportItemIndex].consumer.push(consumer);

          logConsumers(io);

          consumer.observer.on(CLOSE_EVENT, () => {
            const consumerIndex = consumers.findIndex(
              (c) => c.id === consumer.id
            );
            consumers.splice(consumerIndex, 1);

            removeTranspotItem(transport.id, consumer.id, "consumer");

            logConsumers(io);
          });
        });

        transport.observer.on(NEW_DATA_PRODUCER_EVENT, (dataProducer) => {
          dataProducers.push(dataProducer);

          const transportObjectIndex = TransporObject.findIndex(
            (t) => t.transport.id === transport.id
          );
          TransporObject[transportObjectIndex].dataProducer.push(dataProducer);

          logdataProducers(io);
          dataProducer.observer.on(CLOSE_EVENT, () => {
            const dataProducerIndex = dataProducers.findIndex(
              (d) => d.id === dataProducer.id
            );
            dataProducers.splice(dataProducerIndex, 1);

            removeTranspotItem(transport.id, dataProducer.id, "dataProducer");

            logdataProducers(io);
          });
        });

        transport.observer.on(NEW_DATA_CONSUMER_EVENT, (dataConsumer) => {
          dataConsumers.push(dataConsumer);

          const transportObjectIndex = TransporObject.findIndex(
            (t) => t.transport.id === transport.id
          );
          TransporObject[transportObjectIndex].dataConsumer.push(dataConsumer);

          logdataConsumers(io);
          dataConsumer.observer.on(CLOSE_EVENT, () => {
            const dataConsumerIndex = dataConsumers.findIndex(
              (d) => d.id === dataConsumer.id
            );
            dataConsumers.splice(dataConsumerIndex, 1);

            removeTranspotItem(transport.id, dataConsumer.id, "dataConsumer");

            logdataConsumers(io);
          });
        });
      });
    });

    worker.observer.on(NEW_WEBRTC_SERVER, (webRtcServer) => {
      webRtcServers.push(webRtcServer);
      const workerIndex = workers.findIndex((w) => w.worker.pid === worker.pid);

      workers?.[workerIndex]?.webRtcServer.push(webRtcServer);

      logWebrtcServer(io);
      webRtcServer.observer.on(CLOSE_EVENT, () => {
        const webRtcServerIndexItem = webRtcServers.findIndex(
          (w) => w.id === webRtcServer.id
        );
        webRtcServers.splice(webRtcServerIndexItem, 1);
        const workerIndex = workers.findIndex(
          (w) => w.worker.pid === worker.pid
        );
        const webRtcServerIndex = workers[workerIndex].webRtcServer.findIndex(
          (w) => w.id === webRtcServer.id
        );

        workers?.[workerIndex]?.webRtcServer.splice(webRtcServerIndex, 1);

        logWebrtcServer(io);
      });
    });
  });
};
