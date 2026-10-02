/**
 * Wire protocol shared by the observer server (embedded in the mediasoup app)
 * and the CLI client. Every request goes through a single "request" event and
 * is answered through the Socket.IO acknowledgement callback.
 */

export const PROTOCOL_VERSION = 2;

export const DEFAULT_PORT = 5462;
export const DEFAULT_HOST = "127.0.0.1";

export const OBJECT_KINDS = [
  "worker",
  "webRtcServer",
  "router",
  "transport",
  "producer",
  "consumer",
  "dataProducer",
  "dataConsumer",
] as const;

export type ObjectKind = (typeof OBJECT_KINDS)[number];

/** Narrow a list to objects that live under the given ancestors. */
export interface Filter {
  workerId?: string;
  routerId?: string;
  transportId?: string;
  producerId?: string;
}

export const FILTER_KEYS: ReadonlyArray<keyof Filter> = [
  "workerId",
  "routerId",
  "transportId",
  "producerId",
];

export type Request =
  | { cmd: "hello" }
  | { cmd: "summary" }
  | { cmd: "list"; kind: ObjectKind; filter?: Filter }
  | { cmd: "tree"; filter?: Filter; rootId?: string }
  | { cmd: "inspect"; id: string }
  | { cmd: "stats"; id: string }
  | { cmd: "dump"; id: string }
  | { cmd: "find"; query: string }
  | { cmd: "events"; limit?: number; kind?: ObjectKind }
  | { cmd: "ids" }
  | { cmd: "subscribe"; topic: "events" }
  | { cmd: "unsubscribe"; topic: "events" };

export type Response<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

interface BaseSummary {
  id: string;
  /** Epoch ms when the observer first saw the object. */
  createdAt: number;
  appData?: unknown;
}

export interface WorkerSummary extends BaseSummary {
  kind: "worker";
  pid: number;
  died: boolean;
  routers: number;
  webRtcServers: number;
  /** CPU usage in percent since the previous sample (null when unavailable). */
  cpu?: number | null;
  /** Max resident set size in bytes (null when unavailable). */
  memory?: number | null;
}

export interface WebRtcServerSummary extends BaseSummary {
  kind: "webRtcServer";
  workerId: string;
  transports: number;
}

export interface RouterSummary extends BaseSummary {
  kind: "router";
  workerId: string;
  transports: number;
}

export interface TransportSummary extends BaseSummary {
  kind: "transport";
  routerId: string;
  type: string;
  iceState?: string;
  dtlsState?: string;
  sctpState?: string;
  localTuple?: string;
  remoteTuple?: string;
  webRtcServerId?: string;
  producers: number;
  consumers: number;
  dataProducers: number;
  dataConsumers: number;
}

export interface ProducerSummary extends BaseSummary {
  kind: "producer";
  transportId: string;
  mediaKind: string;
  type: string;
  codec?: string;
  paused: boolean;
  /** One score (0-10) per encoding. */
  scores: number[];
  consumers: number;
}

export interface ConsumerSummary extends BaseSummary {
  kind: "consumer";
  transportId: string;
  producerId: string;
  mediaKind: string;
  type: string;
  codec?: string;
  paused: boolean;
  producerPaused: boolean;
  score?: number;
  producerScore?: number;
  preferredLayers?: string;
  currentLayers?: string;
  priority?: number;
}

export interface DataProducerSummary extends BaseSummary {
  kind: "dataProducer";
  transportId: string;
  type: string;
  label: string;
  protocol: string;
  paused?: boolean;
  dataConsumers: number;
}

export interface DataConsumerSummary extends BaseSummary {
  kind: "dataConsumer";
  transportId: string;
  dataProducerId: string;
  type: string;
  label: string;
  protocol: string;
  paused?: boolean;
  dataProducerPaused?: boolean;
}

export type ObjectSummary =
  | WorkerSummary
  | WebRtcServerSummary
  | RouterSummary
  | TransportSummary
  | ProducerSummary
  | ConsumerSummary
  | DataProducerSummary
  | DataConsumerSummary;

export interface TreeNode {
  summary: ObjectSummary;
  children: TreeNode[];
}

export interface ServerInfo {
  protocol: number;
  version: string;
  mediasoupVersion?: string;
  pid: number;
  nodeVersion: string;
  /** Epoch ms when observer() was called. */
  startedAt: number;
}

export interface Summary {
  server: ServerInfo;
  process: { rss: number; heapUsed: number; uptime: number };
  counts: Record<ObjectKind, number>;
  workers: WorkerSummary[];
  warnings: string[];
}

export interface EventRecord {
  seq: number;
  time: number;
  kind: ObjectKind;
  id: string;
  parentId?: string;
  event: string;
  detail?: string;
}

export interface InspectResult {
  summary: ObjectSummary;
  /** Ancestors, outermost first. */
  path: Array<{ kind: ObjectKind; id: string }>;
  children: Partial<Record<ObjectKind, string[]>>;
}

export interface StatsResult {
  kind: ObjectKind;
  id: string;
  stats: Array<Record<string, unknown>>;
}

export interface FindMatch {
  summary: ObjectSummary;
  field: string;
  value: string;
}

export interface IdEntry {
  kind: ObjectKind;
  id: string;
}
