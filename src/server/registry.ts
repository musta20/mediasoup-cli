import { EventEmitter } from "events";
import { EventRecord, Filter, OBJECT_KINDS, ObjectKind } from "../shared/protocol";

/**
 * mediasoup objects are duck-typed on purpose: their class layout changed
 * across 3.x releases and we only read a handful of well known properties.
 */
export type MediasoupObject = any;

export interface Entry {
  /** Unique registry key: the id, except for objects sharing an id (see add()). */
  key: string;
  kind: ObjectKind;
  /** The mediasoup id (workers use their pid). */
  id: string;
  object: MediasoupObject;
  parent?: Entry;
  children: Set<Entry>;
  createdAt: number;
  /** Detaches the listeners registered on this object. */
  cleanup: Array<() => void>;
}

const FILTER_KINDS: Record<keyof Filter, ObjectKind> = {
  workerId: "worker",
  routerId: "router",
  transportId: "transport",
  producerId: "producer",
};

/**
 * In-memory view of every live mediasoup object. Emits "change" whenever the
 * tree changes and "event" with an {@link EventRecord} for the activity log.
 */
export class Registry extends EventEmitter {
  private readonly entries = new Map<string, Entry>();
  private readonly byKind = new Map<ObjectKind, Set<Entry>>(
    OBJECT_KINDS.map((kind) => [kind, new Set<Entry>()])
  );
  /** producerId -> consumers, dataProducerId -> dataConsumers (any router). */
  private readonly consumersByProducer = new Map<string, Set<Entry>>();
  private readonly events: EventRecord[] = [];
  private seq = 0;

  /** WebRTC transports handled by a WebRtcServer: transportId -> serverId. */
  readonly webRtcServerByTransport = new Map<string, string>();

  constructor(private readonly maxEvents = 1000) {
    super();
  }

  add(
    kind: ObjectKind,
    id: string,
    object: MediasoupObject,
    parentKey?: string,
    detail?: string
  ): Entry {
    let key = id;
    const existing = this.entries.get(key);
    if (existing) {
      if (existing.object === object) return existing;
      // pipeToRouter() keeps the producer id by default: the pipe producer in
      // the other router is a distinct object with the same id.
      key = `${id}@${parentKey ?? "?"}`;
      const again = this.entries.get(key);
      if (again) return again;
    }

    const parent = parentKey !== undefined ? this.entries.get(parentKey) : undefined;
    const entry: Entry = {
      key,
      kind,
      id,
      object,
      parent,
      children: new Set(),
      createdAt: Date.now(),
      cleanup: [],
    };

    this.entries.set(key, entry);
    this.byKind.get(kind)?.add(entry);
    parent?.children.add(entry);

    const sourceId = this.sourceIdOf(entry);
    if (sourceId !== undefined) {
      let consumers = this.consumersByProducer.get(sourceId);
      if (!consumers) this.consumersByProducer.set(sourceId, (consumers = new Set()));
      consumers.add(entry);
    }

    this.record(kind, id, "created", detail, parent?.id);
    this.emit("change");

    return entry;
  }

  remove(entry: Entry, detail?: string): void {
    if (this.entries.get(entry.key) !== entry) return;

    // mediasoup closes children before their parent, so this is normally a
    // no-op. It guarantees we never keep orphans around.
    for (const child of [...entry.children]) this.remove(child);

    this.entries.delete(entry.key);
    this.byKind.get(entry.kind)?.delete(entry);
    entry.parent?.children.delete(entry);

    const sourceId = this.sourceIdOf(entry);
    if (sourceId !== undefined) {
      const consumers = this.consumersByProducer.get(sourceId);
      consumers?.delete(entry);
      if (consumers?.size === 0) this.consumersByProducer.delete(sourceId);
    }
    if (entry.kind === "transport") this.webRtcServerByTransport.delete(entry.id);

    this.detach(entry);
    this.record(entry.kind, entry.id, "closed", detail, entry.parent?.id);
    this.emit("change");
  }

  /** Detach every listener and forget all objects (used by close()). */
  clear(): void {
    for (const entry of this.entries.values()) this.detach(entry);
    this.entries.clear();
    for (const set of this.byKind.values()) set.clear();
    this.consumersByProducer.clear();
    this.webRtcServerByTransport.clear();
  }

  get(key: string): Entry | undefined {
    return this.entries.get(key);
  }

  all(kind?: ObjectKind): Entry[] {
    return kind ? [...(this.byKind.get(kind) ?? [])] : [...this.entries.values()];
  }

  count(kind: ObjectKind): number {
    return this.byKind.get(kind)?.size ?? 0;
  }

  list(kind: ObjectKind, filter: Filter = {}): Entry[] {
    return this.all(kind).filter((entry) => this.matches(entry, filter));
  }

  childrenOf(entry: Entry, kind?: ObjectKind): Entry[] {
    const children = [...entry.children];
    return kind ? children.filter((c) => c.kind === kind) : children;
  }

  /**
   * Consumers of a producer (or dataConsumers of a dataProducer). A consumer
   * always lives in the same router as what it consumes, which tells a
   * producer apart from its pipe copy in another router.
   */
  consumersOf(entry: Entry): Entry[] {
    const kind = entry.kind === "producer" ? "consumer" : "dataConsumer";
    const router = this.routerOf(entry);
    return [...(this.consumersByProducer.get(entry.id) ?? [])].filter(
      (c) => c.kind === kind && this.routerOf(c) === router
    );
  }

  /** Ancestors of an entry, outermost first. */
  ancestors(entry: Entry): Entry[] {
    const chain: Entry[] = [];
    for (let e = entry.parent; e; e = e.parent) chain.unshift(e);
    return chain;
  }

  matches(entry: Entry, filter: Filter): boolean {
    for (const key of Object.keys(filter) as Array<keyof Filter>) {
      const wanted = filter[key];
      if (wanted === undefined) continue;

      if (key === "producerId" && entry.kind === "consumer") {
        if (entry.object?.producerId !== wanted) return false;
        continue;
      }

      const kind = FILTER_KINDS[key];
      let found = false;
      for (let e: Entry | undefined = entry; e; e = e.parent) {
        if (e.kind === kind && e.id === wanted) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  }

  /**
   * Resolve a full id or a unique id prefix (like git short hashes).
   * Throws a user friendly error when nothing or more than one object matches.
   */
  resolve(idOrPrefix: string, kind?: ObjectKind): Entry {
    const needle = idOrPrefix.trim().toLowerCase();
    const label = kind ?? "object";

    if (!needle) throw new Error(`missing ${label} id`);

    const exact = this.entries.get(idOrPrefix.trim()) ?? this.entries.get(needle);
    if (exact && (!kind || exact.kind === kind)) return exact;

    const candidates = this.all(kind).filter((e) => e.id.toLowerCase().startsWith(needle));
    const ids = new Set(candidates.map((e) => e.id));

    if (ids.size === 1) {
      // A producer and its pipe copy share an id: prefer the original.
      return candidates.find((e) => e.key === e.id) ?? candidates[0];
    }
    if (ids.size === 0) {
      throw new Error(`no ${label} found with id "${idOrPrefix}"`);
    }
    throw new Error(
      `id prefix "${idOrPrefix}" is ambiguous (${ids.size} matches), type more characters`
    );
  }

  record(
    kind: ObjectKind,
    id: string,
    event: string,
    detail?: string,
    parentId?: string
  ): void {
    const record: EventRecord = {
      seq: ++this.seq,
      time: Date.now(),
      kind,
      id,
      event,
    };
    if (parentId !== undefined) record.parentId = parentId;
    if (detail) record.detail = detail;

    this.events.push(record);
    if (this.events.length > this.maxEvents) this.events.shift();
    this.emit("event", record);
  }

  recentEvents(limit = 50, kind?: ObjectKind): EventRecord[] {
    const events = kind ? this.events.filter((e) => e.kind === kind) : this.events;
    return events.slice(-Math.max(0, limit));
  }

  private routerOf(entry: Entry): Entry | undefined {
    let e: Entry | undefined = entry;
    while (e && e.kind !== "router") e = e.parent;
    return e;
  }

  private sourceIdOf(entry: Entry): string | undefined {
    if (entry.kind === "consumer") return entry.object?.producerId;
    if (entry.kind === "dataConsumer") return entry.object?.dataProducerId;
    return undefined;
  }

  private detach(entry: Entry): void {
    for (const off of entry.cleanup.splice(0)) {
      try {
        off();
      } catch {
        // The object is already gone; nothing to detach.
      }
    }
  }
}
