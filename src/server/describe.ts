import {
  ConsumerSummary,
  DataConsumerSummary,
  DataProducerSummary,
  ObjectSummary,
  ProducerSummary,
  RouterSummary,
  TransportSummary,
  WebRtcServerSummary,
  WorkerSummary,
} from "../shared/protocol";
import { toPlain } from "./plain";
import { Entry, MediasoupObject, Registry } from "./registry";

/** "webrtc" | "plain" | "pipe" | "direct", also for mediasoup < 3.15. */
export const transportType = (transport: MediasoupObject): string => {
  if (typeof transport?.type === "string") return transport.type;
  const name: string = transport?.constructor?.name ?? "";
  return name.replace(/Impl$/, "").replace(/Transport$/, "").toLowerCase() || "unknown";
};

/** "opus", "VP8"… from RTP parameters. */
export const codecName = (rtpParameters: MediasoupObject): string | undefined => {
  const mimeType: unknown = rtpParameters?.codecs?.[0]?.mimeType;
  return typeof mimeType === "string" ? mimeType.split("/").pop() : undefined;
};

export const formatTuple = (
  tuple: MediasoupObject,
  side: "local" | "remote"
): string | undefined => {
  if (!tuple) return undefined;
  const ip = side === "local" ? tuple.localAddress ?? tuple.localIp : tuple.remoteIp;
  const port = side === "local" ? tuple.localPort : tuple.remotePort;
  if (!ip) return undefined;
  const host = String(ip).includes(":") ? `[${ip}]` : ip;
  return `${host}:${port ?? "?"}${tuple.protocol ? ` ${tuple.protocol}` : ""}`;
};

const formatLayers = (layers: MediasoupObject): string | undefined =>
  layers && typeof layers.spatialLayer === "number"
    ? `${layers.spatialLayer}/${layers.temporalLayer ?? "-"}`
    : undefined;

const appDataOf = (object: MediasoupObject): unknown => {
  const appData = object?.appData;
  if (!appData || typeof appData !== "object" || Object.keys(appData).length === 0) {
    return undefined;
  }
  return toPlain(appData);
};

const count = (registry: Registry, entry: Entry, kind: Entry["kind"]) =>
  registry.childrenOf(entry, kind).length;

/** Synchronous summary of a tracked object. Worker CPU/memory are added by {@link UsageSampler}. */
export const describe = (entry: Entry, registry: Registry): ObjectSummary => {
  const o = entry.object;
  const base = { id: entry.id, createdAt: entry.createdAt, appData: appDataOf(o) };
  const parentId = entry.parent?.id ?? "";

  switch (entry.kind) {
    case "worker": {
      const summary: WorkerSummary = {
        ...base,
        kind: "worker",
        pid: o.pid,
        died: Boolean(o.died),
        routers: count(registry, entry, "router"),
        webRtcServers: count(registry, entry, "webRtcServer"),
      };
      return summary;
    }

    case "webRtcServer": {
      let transports = 0;
      for (const serverId of registry.webRtcServerByTransport.values()) {
        if (serverId === entry.id) transports++;
      }
      const summary: WebRtcServerSummary = {
        ...base,
        kind: "webRtcServer",
        workerId: parentId,
        transports,
      };
      return summary;
    }

    case "router": {
      const summary: RouterSummary = {
        ...base,
        kind: "router",
        workerId: parentId,
        transports: count(registry, entry, "transport"),
      };
      return summary;
    }

    case "transport": {
      const type = transportType(o);
      const selected = type === "webrtc" ? o.iceSelectedTuple : o.tuple;
      const summary: TransportSummary = {
        ...base,
        kind: "transport",
        routerId: parentId,
        type,
        iceState: o.iceState,
        dtlsState: o.dtlsState,
        sctpState: o.sctpState,
        localTuple: formatTuple(selected, "local"),
        remoteTuple: formatTuple(selected, "remote"),
        webRtcServerId: registry.webRtcServerByTransport.get(entry.id),
        producers: count(registry, entry, "producer"),
        consumers: count(registry, entry, "consumer"),
        dataProducers: count(registry, entry, "dataProducer"),
        dataConsumers: count(registry, entry, "dataConsumer"),
      };
      return summary;
    }

    case "producer": {
      const scores: number[] = Array.isArray(o.score)
        ? o.score.map((s: MediasoupObject) => Number(s?.score ?? 0))
        : [];
      const consumers = registry.consumersOf(entry).length;
      const summary: ProducerSummary = {
        ...base,
        kind: "producer",
        transportId: parentId,
        mediaKind: o.kind,
        type: o.type,
        codec: codecName(o.rtpParameters),
        paused: Boolean(o.paused),
        scores,
        consumers,
      };
      return summary;
    }

    case "consumer": {
      const summary: ConsumerSummary = {
        ...base,
        kind: "consumer",
        transportId: parentId,
        producerId: o.producerId,
        mediaKind: o.kind,
        type: o.type,
        codec: codecName(o.rtpParameters),
        paused: Boolean(o.paused),
        producerPaused: Boolean(o.producerPaused),
        score: o.score?.score,
        producerScore: o.score?.producerScore,
        preferredLayers: formatLayers(o.preferredLayers),
        currentLayers: formatLayers(o.currentLayers),
        priority: o.priority,
      };
      return summary;
    }

    case "dataProducer": {
      const dataConsumers = registry.consumersOf(entry).length;
      const summary: DataProducerSummary = {
        ...base,
        kind: "dataProducer",
        transportId: parentId,
        type: o.type,
        label: o.label ?? "",
        protocol: o.protocol ?? "",
        paused: o.paused,
        dataConsumers,
      };
      return summary;
    }

    case "dataConsumer": {
      const summary: DataConsumerSummary = {
        ...base,
        kind: "dataConsumer",
        transportId: parentId,
        dataProducerId: o.dataProducerId,
        type: o.type,
        label: o.label ?? "",
        protocol: o.protocol ?? "",
        paused: o.paused,
        dataProducerPaused: o.dataProducerPaused,
      };
      return summary;
    }
  }
};

export const withTimeout = <T>(promise: Promise<T>, ms: number, what: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms} ms`)), ms);
    timer.unref();
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });

/** Computes worker CPU usage from successive getResourceUsage() samples. */
export class UsageSampler {
  // Keyed by entry, not pid: pids get reused and dead workers must be forgotten.
  private readonly last = new WeakMap<Entry, { at: number; cpuTime: number; cpu: number | null }>();

  async sample(entry: Entry): Promise<{ cpu: number | null; memory: number | null }> {
    const worker = entry.object;
    if (typeof worker?.getResourceUsage !== "function" || worker.closed) {
      return { cpu: null, memory: null };
    }

    try {
      const usage = await withTimeout<MediasoupObject>(
        worker.getResourceUsage(),
        2000,
        "getResourceUsage"
      );
      const now = Date.now();
      // ru_utime/ru_stime are in ms, ru_maxrss in KiB.
      const cpuTime = Number(usage.ru_utime) + Number(usage.ru_stime);
      const memory = Number.isFinite(usage.ru_maxrss) ? usage.ru_maxrss * 1024 : null;
      const previous = this.last.get(entry) ?? {
        at: entry.createdAt,
        cpuTime: 0,
        cpu: null,
      };
      const elapsed = now - previous.at;

      // Several clients may poll at once and a fresh worker has barely run:
      // a tiny window would give meaningless numbers.
      if (elapsed < 1000) {
        if (!this.last.has(entry)) this.last.set(entry, { at: now, cpuTime, cpu: null });
        return { cpu: previous.cpu, memory };
      }

      const cpu = Math.max(0, ((cpuTime - previous.cpuTime) / elapsed) * 100);
      this.last.set(entry, { at: now, cpuTime, cpu });

      return { cpu, memory };
    } catch {
      return { cpu: null, memory: null };
    }
  }
}
