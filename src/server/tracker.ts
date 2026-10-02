import { ObjectKind } from "../shared/protocol";
import { Entry, MediasoupObject, Registry } from "./registry";
import { codecName, formatTuple, transportType } from "./describe";

export interface EmitterLike {
  on(event: any, listener: (...args: any[]) => void): unknown;
  removeListener?(event: any, listener: (...args: any[]) => void): unknown;
  off?(event: any, listener: (...args: any[]) => void): unknown;
}

const shortId = (id: unknown) => String(id).slice(0, 8);

const warn = (err: unknown) => {
  console.warn("[mediasoup-cli] internal error (your app is not affected):", err);
};

/**
 * Subscribe to mediasoup observer events and mirror the object tree into the
 * registry. Returns a function that detaches every listener.
 */
export const track = (registry: Registry, rootObserver: EmitterLike): (() => void) => {
  const rootCleanup: Array<() => void> = [];
  const tracked = new WeakSet<object>();

  const listen = (
    emitter: EmitterLike | undefined,
    event: string,
    handler: (...args: any[]) => void,
    owner?: Entry
  ) => {
    if (!emitter || typeof emitter.on !== "function") return;

    const safeHandler = (...args: any[]) => {
      try {
        handler(...args);
      } catch (err) {
        warn(err);
      }
    };

    emitter.on(event, safeHandler);

    const off = () => {
      if (typeof emitter.removeListener === "function") {
        emitter.removeListener(event, safeHandler);
      } else if (typeof emitter.off === "function") {
        emitter.off(event, safeHandler);
      }
    };

    (owner ? owner.cleanup : rootCleanup).push(off);
  };

  /** Register an object, or return undefined if it is already tracked. */
  const add = (
    kind: ObjectKind,
    object: MediasoupObject,
    id: string,
    parent: Entry | undefined,
    detail?: string
  ): Entry | undefined => {
    if (!object || typeof object !== "object" || tracked.has(object)) return undefined;
    tracked.add(object);
    const entry = registry.add(kind, String(id), object, parent?.key, detail);
    listen(object.observer, "close", () => registry.remove(entry), entry);
    return entry;
  };

  /** Log state changes such as pause/resume or ICE transitions. */
  const logChanges = (
    entry: Entry,
    events: Record<string, (...args: any[]) => string | undefined>
  ) => {
    for (const [event, describe] of Object.entries(events)) {
      listen(
        entry.object.observer,
        event,
        (...args) => {
          registry.record(entry.kind, entry.id, event, describe(...args), entry.parent?.id);
          registry.emit("change");
        },
        entry
      );
    }
  };

  const pauseEvents = { pause: () => undefined, resume: () => undefined };

  const onProducer = (producer: MediasoupObject, transport: Entry) => {
    const entry = add(
      "producer",
      producer,
      producer.id,
      transport,
      [producer.kind, producer.type, codecName(producer.rtpParameters)]
        .filter(Boolean)
        .join(" ")
    );
    if (!entry) return;
    logChanges(entry, pauseEvents);
  };

  const onConsumer = (consumer: MediasoupObject, transport: Entry) => {
    const entry = add(
      "consumer",
      consumer,
      consumer.id,
      transport,
      `${consumer.kind} ${consumer.type} of producer ${shortId(consumer.producerId)}`
    );
    if (!entry) return;
    logChanges(entry, {
      ...pauseEvents,
      layerschange: (layers?: { spatialLayer: number; temporalLayer?: number }) =>
        layers
          ? `spatial ${layers.spatialLayer} temporal ${layers.temporalLayer ?? "-"}`
          : "no layers",
    });
  };

  const onDataProducer = (dataProducer: MediasoupObject, transport: Entry) => {
    const entry = add(
      "dataProducer",
      dataProducer,
      dataProducer.id,
      transport,
      [dataProducer.type, dataProducer.label && `label "${dataProducer.label}"`]
        .filter(Boolean)
        .join(" ")
    );
    if (!entry) return;
    logChanges(entry, pauseEvents);
  };

  const onDataConsumer = (dataConsumer: MediasoupObject, transport: Entry) => {
    const entry = add(
      "dataConsumer",
      dataConsumer,
      dataConsumer.id,
      transport,
      `${dataConsumer.type} of dataProducer ${shortId(dataConsumer.dataProducerId)}`
    );
    if (!entry) return;
    logChanges(entry, pauseEvents);
  };

  const onTransport = (transport: MediasoupObject, router: Entry) => {
    const entry = add("transport", transport, transport.id, router, transportType(transport));
    if (!entry) return;
    const observer = transport.observer;

    listen(observer, "newproducer", (p) => onProducer(p, entry), entry);
    listen(observer, "newconsumer", (c) => onConsumer(c, entry), entry);
    listen(observer, "newdataproducer", (d) => onDataProducer(d, entry), entry);
    listen(observer, "newdataconsumer", (d) => onDataConsumer(d, entry), entry);

    logChanges(entry, {
      icestatechange: (state: string) => state,
      dtlsstatechange: (state: string) => state,
      sctpstatechange: (state: string) => state,
      iceselectedtuplechange: (tuple: unknown) => formatTuple(tuple, "remote"),
      tuple: (tuple: unknown) => formatTuple(tuple, "remote"),
    });
  };

  const onRouter = (router: MediasoupObject, worker: Entry) => {
    const entry = add("router", router, router.id, worker);
    if (!entry) return;
    listen(router.observer, "newtransport", (t) => onTransport(t, entry), entry);
  };

  const onWebRtcServer = (server: MediasoupObject, worker: Entry) => {
    const entry = add("webRtcServer", server, server.id, worker);
    if (!entry) return;
    listen(
      server.observer,
      "webrtctransporthandled",
      (transport: MediasoupObject) => {
        registry.webRtcServerByTransport.set(transport.id, server.id);
      },
      entry
    );
    listen(
      server.observer,
      "webrtctransportunhandled",
      (transport: MediasoupObject) => {
        registry.webRtcServerByTransport.delete(transport.id);
      },
      entry
    );
  };

  const onWorker = (worker: MediasoupObject) => {
    if (!worker || typeof worker !== "object" || tracked.has(worker)) return;
    tracked.add(worker);
    const entry = registry.add("worker", String(worker.pid), worker, undefined, `pid ${worker.pid}`);

    // Workers get a dedicated close handler to report crashes.
    listen(
      worker.observer,
      "close",
      () => registry.remove(entry, worker.died ? "worker died" : undefined),
      entry
    );
    listen(worker.observer, "newrouter", (r) => onRouter(r, entry), entry);
    listen(worker.observer, "newwebrtcserver", (s) => onWebRtcServer(s, entry), entry);
  };

  listen(rootObserver, "newworker", onWorker);

  return () => {
    for (const off of rootCleanup.splice(0)) {
      try {
        off();
      } catch {
        // ignore
      }
    }
    registry.clear();
  };
};
