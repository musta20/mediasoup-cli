import { Server } from "socket.io";
import {
  getTransport,
  getTransportByRouterId,
} from "../modules/transportModules";
import { loggerOption, workers } from "../bin/store";
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "./types";
import { getConsumer, getConsumerById } from "../modules/consumerModule";
import { getProducer, getProducerById } from "../modules/producerModules";
import {
  getDataProducer,
  getDataProducerById,
} from "../modules/dataProducerModules";
import {
  getDataConsumer,
  getDataConsumerById,
} from "../modules/dataConsumerModule";
import { getRouterByWorkerId, getRouters } from "../modules/routerModules";
import {
  getWebrtcServer,
  getWebRtcServerByWorkerId,
} from "../modules/webrtcServerModules";

export const logTransport = (
  io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >
) => {
  if (loggerOption.activeLogTransport) {
    if (loggerOption.activeLogRouterid) {
      io.to("log").emit(
        "logTransports",
        getTransportByRouterId(loggerOption.activeLogRouterid)
      );
      return;
    }
    io.to("log").emit("logTransports", getTransport());
  }
};

export const logConsumers = (
  io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >
) => {
  if (loggerOption.activeLogConsumer) {
    if (loggerOption.activeLogTransportid) {
      io.to("log").emit(
        "logConsumers",
        getConsumerById(loggerOption.activeLogTransportid)
      );

      return;
    }

    io.to("log").emit("logConsumers", getConsumer());
  }
};

export const logProducers = (
  io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >
) => {
  if (loggerOption.activeLogProducer) {
    if (loggerOption.activeLogTransportid) {
      io.to("log").emit(
        "logProducers",
        getProducerById(loggerOption.activeLogTransportid)
      );

      return;
    }

    io.to("log").emit(
      "logProducers",

      getProducer()
    );
  }
};

export const logdataProducers = (
  io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >
) => {
  if (loggerOption.activeLogdataProducer) {
    if (loggerOption.activeLogTransportid) {
      io.to("log").emit(
        "logDataProducers",
        getDataProducerById(loggerOption.activeLogTransportid)
      );

      return;
    }

    io.to("log").emit("logDataProducers", getDataProducer());
  }
};

export const logdataConsumers = (
  io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >
) => {
  if (loggerOption.activeLogdataConsumer) {
    if (loggerOption.activeLogTransportid) {
      io.to("log").emit(
        "logDataConsumer",
        getDataConsumerById(loggerOption.activeLogTransportid)
      );

      return;
    }

    io.to("log").emit("logDataConsumer", getDataConsumer());
  }
};

export const logRouters = (
  io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >
) => {
  if (loggerOption.activeLogRouter) {
    if (loggerOption.activeLogWorkerid) {
      io.to("log").emit(
        "logRouters",
        getRouterByWorkerId(loggerOption.activeLogWorkerid)
      );

      return;
    }

    io.to("log").emit("logRouters", getRouters());
  }
};

export const logWorkers = (
  io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >
) => {
  if (loggerOption.activelogWorker) {
    io.to("log").emit(
      "logRouters",
      workers.map((t) => {
        return t.worker.pid + "";
      })
    );
  }
};

export const logWebrtcServer = (
  io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >
) => {
  if (loggerOption.activelogWebrtcserver) {
    if (loggerOption.activeLogWorkerid) {
      io.to("log").emit(
        "logWebrtcServer",
        getWebRtcServerByWorkerId(loggerOption.activeLogWorkerid)
      );

      return;
    }

    io.to("log").emit("logWebrtcServer", getWebrtcServer());
  }
};

export const activeLog = (
  io: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >,
  name: string,
  id: number | string
) => {
  switch (name) {
    case "producers":
      loggerOption.activeLogProducer = true;
      if (id) loggerOption.activeLogTransportid = id as string;
      logProducers(io);
      break;
    case "consumer":
      loggerOption.activeLogConsumer = true;
      if (id) loggerOption.activeLogTransportid = id as string;
      logConsumers(io);
      break;
    case "dataconsumers":
      loggerOption.activeLogdataConsumer = true;
      if (id) loggerOption.activeLogTransportid = id as string;
      logdataConsumers(io);
      break;
    case "dataproducers":
      loggerOption.activeLogProducer = true;
      if (id) loggerOption.activeLogTransportid = id as string;
      logdataProducers(io);
      break;
    case "routers":
      loggerOption.activeLogRouter = true;
      if (id) loggerOption.activeLogWorkerid = id as number;
      logRouters(io);
      break;
    case "transports":
      loggerOption.activeLogTransport = true;
      if (id) loggerOption.activeLogRouterid = id as string;
      logTransport(io);
      break;
    case "webrtcserver":
      loggerOption.activelogWebrtcserver = true;
      if (id) loggerOption.activeLogWorkerid = id as number;
      logWebrtcServer(io);
      break;
    case "worker":
      loggerOption.activelogWorker = true;
      logWorkers(io);
      break;
    default:
      break;
  }
};
