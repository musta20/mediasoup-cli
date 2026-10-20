import {
  EventRecord,
  Filter,
  FILTER_KEYS,
  FindMatch,
  IdEntry,
  InspectResult,
  OBJECT_KINDS,
  ObjectKind,
  ObjectSummary,
  Request,
  ServerInfo,
  StatsResult,
  Summary,
  TreeNode,
  WorkerSummary,
  WorkerLogSettings,
  WorkerSettingsResult,
  WORKER_LOG_LEVELS,
  WORKER_LOG_TAGS,
} from "../shared/protocol";
import { describe, UsageSampler, withTimeout } from "./describe";
import { flatten, toPlain } from "./plain";
import { Entry, Registry } from "./registry";

const FILTER_KIND: Record<keyof Filter, ObjectKind> = {
  workerId: "worker",
  routerId: "router",
  transportId: "transport",
  producerId: "producer",
};

const kindOrder = (kind: ObjectKind) => OBJECT_KINDS.indexOf(kind);

const byKindThenAge = (a: Entry, b: Entry) =>
  kindOrder(a.kind) - kindOrder(b.kind) || a.createdAt - b.createdAt;

const isKind = (value: unknown): value is ObjectKind =>
  typeof value === "string" && (OBJECT_KINDS as readonly string[]).includes(value);

export class RequestHandler {
  private readonly sampler = new UsageSampler();

  constructor(
    private readonly registry: Registry,
    private readonly info: ServerInfo
  ) {}

  async handle(request: Request): Promise<unknown> {
    if (!request || typeof request !== "object") throw new Error("invalid request");

    switch (request.cmd) {
      case "hello":
        return this.info;
      case "summary":
        return this.summary();
      case "list":
        return this.list(request.kind, request.filter);
      case "tree":
        return this.tree(request.filter, request.rootId);
      case "inspect":
        return this.inspect(request.id);
      case "stats":
        return this.stats(request.id);
      case "dump":
        return this.dump(request.id);
      case "find":
        return this.find(request.query);
      case "events":
        return this.events(request.limit, request.kind);
      case "ids":
        return this.ids();
      case "workerSettings":
        return this.workerSettings(request.settings, request.workerId);
      default:
        throw new Error(`unknown request "${(request as { cmd?: unknown }).cmd}"`);
    }
  }

  private async workerSettings(settings: WorkerLogSettings, workerId?: string): Promise<WorkerSettingsResult> {
    if (!this.info.capabilities?.workerSettings) {
      throw new Error("worker logging controls are disabled; enable observer(mediasoup, { allowWorkerSettings: true })");
    }
    if (!settings || typeof settings !== "object" || Array.isArray(settings) ||
        !Object.keys(settings).length || Object.keys(settings).some((key) => key !== "logLevel" && key !== "logTags")) {
      throw new Error("settings must contain logLevel and/or logTags");
    }
    if ("logLevel" in settings && !WORKER_LOG_LEVELS.includes(settings.logLevel!)) {
      throw new Error(`invalid logLevel; choose ${WORKER_LOG_LEVELS.join(", ")}`);
    }
    if ("logTags" in settings && (!Array.isArray(settings.logTags) ||
        settings.logTags.some((tag) => !WORKER_LOG_TAGS.includes(tag)))) {
      throw new Error(`invalid logTags; choose ${WORKER_LOG_TAGS.join(", ")}`);
    }
    if (workerId !== undefined && (typeof workerId !== "string" || !workerId.trim())) {
      throw new Error("workerId must be a nonempty string");
    }
    const entries = workerId === undefined ? this.registry.all("worker") : [this.registry.resolve(workerId, "worker")];
    if (!entries.length) throw new Error("no workers found");
    const applied: WorkerLogSettings = {
      ...(settings.logLevel !== undefined ? { logLevel: settings.logLevel } : {}),
      ...(settings.logTags !== undefined ? { logTags: [...new Set(settings.logTags)] } : {}),
    };
    const workers = await Promise.all(entries.map(async (entry) => {
      try {
        await withTimeout(entry.object.updateSettings(applied), 5000, "updateSettings (the update may still complete)");
        this.registry.record("worker", entry.id, "settings", JSON.stringify(applied));
        return { workerId: entry.id, ok: true };
      } catch (err) {
        return { workerId: entry.id, ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }));
    return { settings: applied, workers };
  }

  private async describeAll(entries: Entry[]): Promise<ObjectSummary[]> {
    return Promise.all(entries.map((entry) => this.describe(entry)));
  }

  private async describe(entry: Entry): Promise<ObjectSummary> {
    const summary = describe(entry, this.registry);
    if (summary.kind === "worker") {
      Object.assign(summary, await this.sampler.sample(entry));
    }
    return summary;
  }

  /** Replace id prefixes in a filter by the full ids they resolve to. */
  private resolveFilter(filter: Filter = {}): Filter {
    const resolved: Filter = {};
    for (const key of FILTER_KEYS) {
      const value = filter[key];
      if (value !== undefined && value !== "") {
        resolved[key] = this.registry.resolve(String(value), FILTER_KIND[key]).id;
      }
    }
    return resolved;
  }

  private async list(kind: ObjectKind, filter?: Filter): Promise<ObjectSummary[]> {
    if (!isKind(kind)) throw new Error(`unknown object kind "${kind}"`);
    const entries = this.registry
      .list(kind, this.resolveFilter(filter))
      .sort((a, b) => a.createdAt - b.createdAt);
    return this.describeAll(entries);
  }

  private async tree(filter?: Filter, rootId?: string): Promise<TreeNode[]> {
    const { workerId, routerId, transportId } = this.resolveFilter(filter);
    const root = rootId
      ? this.registry.resolve(String(rootId))
      : this.registry.get(transportId ?? routerId ?? workerId ?? "");
    const roots = root ? [root] : this.registry.all("worker").sort(byKindThenAge);

    const build = async (entry: Entry): Promise<TreeNode> => ({
      summary: await this.describe(entry),
      children: await Promise.all(
        this.registry.childrenOf(entry).sort(byKindThenAge).map(build)
      ),
    });

    return Promise.all(roots.map(build));
  }

  private async inspect(id: string): Promise<InspectResult> {
    const entry = this.registry.resolve(String(id ?? ""));
    const children: InspectResult["children"] = {};

    for (const child of this.registry.childrenOf(entry).sort(byKindThenAge)) {
      (children[child.kind] ??= []).push(child.id);
    }

    // Consumers are not children of their producer but it is what you want to see.
    if (entry.kind === "producer" || entry.kind === "dataProducer") {
      const consumers = this.registry.consumersOf(entry).map((c) => c.id);
      if (consumers.length) children[entry.kind === "producer" ? "consumer" : "dataConsumer"] = consumers;
    }

    return {
      summary: await this.describe(entry),
      path: this.registry.ancestors(entry).map((e) => ({ kind: e.kind, id: e.id })),
      children,
    };
  }

  private async stats(id: string): Promise<StatsResult> {
    const entry = this.registry.resolve(String(id ?? ""));
    const object = entry.object;
    let stats: unknown;

    if (entry.kind === "worker" && typeof object?.getResourceUsage === "function") {
      stats = [await withTimeout(object.getResourceUsage(), 5000, "getResourceUsage")];
    } else if (typeof object?.getStats === "function") {
      stats = await withTimeout(object.getStats(), 5000, "getStats");
    } else {
      throw new Error(`stats are not available for a ${entry.kind}, try "dump ${entry.id}"`);
    }

    const plain = toPlain(stats);
    return {
      kind: entry.kind,
      id: entry.id,
      stats: (Array.isArray(plain) ? plain : [plain]) as Array<Record<string, unknown>>,
    };
  }

  private async dump(id: string): Promise<unknown> {
    const entry = this.registry.resolve(String(id ?? ""));
    if (typeof entry.object?.dump !== "function") {
      throw new Error(`dump is not available for a ${entry.kind}`);
    }
    return toPlain(await withTimeout(entry.object.dump(), 5000, "dump"), 12);
  }

  private async find(query: string): Promise<FindMatch[]> {
    const q = String(query ?? "").trim();
    if (!q) throw new Error("missing search text, e.g. find peerId=alice");

    const eq = q.indexOf("=");
    const key = eq > 0 ? q.slice(0, eq).trim().toLowerCase() : undefined;
    const value = (eq > 0 ? q.slice(eq + 1) : q).trim().toLowerCase();

    const matches: FindMatch[] = [];

    for (const entry of this.registry.all().sort(byKindThenAge)) {
      const summary = describe(entry, this.registry);
      const fields: Array<[string, string]> = [["id", entry.id]];
      if ("label" in summary && summary.label) fields.push(["label", summary.label]);
      flatten(summary.appData, "appData", fields);

      const hit = fields.find(([field, fieldValue]) => {
        const v = fieldValue.toLowerCase();
        if (key === undefined) return v.includes(value);
        const path = field.toLowerCase();
        const name = path.split(".").pop();
        return (name === key || path === key || path === `appdata.${key}`) && v === value;
      });

      if (hit) {
        matches.push({ summary, field: hit[0], value: hit[1] });
        if (matches.length >= 200) break;
      }
    }

    return matches;
  }

  private events(limit?: number, kind?: ObjectKind): EventRecord[] {
    if (kind !== undefined && !isKind(kind)) throw new Error(`unknown object kind "${kind}"`);
    const n = Number.isFinite(Number(limit)) ? Number(limit) : 50;
    return this.registry.recentEvents(Math.min(Math.max(n, 1), 1000), kind);
  }

  private ids(): IdEntry[] {
    return this.registry.all().map((e) => ({ kind: e.kind, id: e.id }));
  }

  private async summary(): Promise<Summary> {
    const counts = Object.fromEntries(
      OBJECT_KINDS.map((k) => [k, this.registry.count(k)])
    ) as Record<ObjectKind, number>;

    const workers = (await this.describeAll(
      this.registry.all("worker").sort(byKindThenAge)
    )) as WorkerSummary[];
    const memory = process.memoryUsage();

    return {
      server: this.info,
      process: { rss: memory.rss, heapUsed: memory.heapUsed, uptime: process.uptime() },
      counts,
      workers,
      warnings: this.warnings(workers),
    };
  }

  private warnings(workers: WorkerSummary[]): string[] {
    const warnings: string[] = [];
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

    for (const worker of workers) {
      if (typeof worker.cpu === "number" && worker.cpu >= 80) {
        warnings.push(`worker ${worker.pid} is using ${worker.cpu.toFixed(0)}% CPU`);
      }
    }

    let badIce = 0;
    let badDtls = 0;
    for (const entry of this.registry.all("transport")) {
      const { iceState, dtlsState } = entry.object ?? {};
      if (iceState === "disconnected" || iceState === "failed") badIce++;
      if (dtlsState === "failed") badDtls++;
    }
    if (badIce) warnings.push(`${plural(badIce, "transport")} with ICE disconnected/failed`);
    if (badDtls) warnings.push(`${plural(badDtls, "transport")} with DTLS failed`);

    let weakConsumers = 0;
    for (const entry of this.registry.all("consumer")) {
      const c = entry.object ?? {};
      if (!c.paused && !c.producerPaused && typeof c.score?.score === "number" && c.score.score < 5) {
        weakConsumers++;
      }
    }
    if (weakConsumers) warnings.push(`${plural(weakConsumers, "consumer")} with score < 5`);

    let silentProducers = 0;
    for (const entry of this.registry.all("producer")) {
      const p = entry.object ?? {};
      const scores = Array.isArray(p.score) ? p.score : [];
      if (!p.paused && scores.length > 0 && scores.every((s: { score?: number }) => !s?.score)) {
        silentProducers++;
      }
    }
    if (silentProducers) {
      warnings.push(`${plural(silentProducers, "producer")} not receiving media (score 0)`);
    }

    return warnings;
  }
}
