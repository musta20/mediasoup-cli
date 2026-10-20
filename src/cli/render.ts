import chalk from "chalk";
import Table from "cli-table3";
import util from "util";
import {
  ConsumerSummary,
  DataConsumerSummary,
  DataProducerSummary,
  EventRecord,
  FindMatch,
  InspectResult,
  ObjectKind,
  ObjectSummary,
  ProducerSummary,
  RouterSummary,
  StatsResult,
  Summary,
  TransportSummary,
  TreeNode,
  WebRtcServerSummary,
  WorkerSummary,
} from "../shared/protocol";
import {
  age,
  bold,
  dim,
  formatBitrate,
  formatBytes,
  formatDuration,
  formatPercent,
  formatScore,
  formatState,
  formatTime,
  KIND_LABELS,
  kindLabel,
  okText,
  plural,
  shortId,
  warnText,
} from "./format";

const table = (head: string[]) =>
  new Table({
    head: head.map((h) => chalk.cyan(h)),
    style: { head: [], border: [], compact: true },
  });

const yesNo = (value: boolean | undefined, yes = "paused") =>
  value ? chalk.yellow(yes) : chalk.gray("no");

/** Overall connection state of a transport in one word (or two). */
export const transportState = (t: TransportSummary): string => {
  if (t.type === "webrtc") {
    const ice = t.iceState ?? "new";
    const dtls = t.dtlsState ?? "new";
    const iceOk = ice === "connected" || ice === "completed";
    if (iceOk && dtls === "connected") return chalk.green("connected");
    return `ice ${formatState(ice)} dtls ${formatState(dtls)}`;
  }
  if (t.type === "plain" || t.type === "pipe") {
    return t.remoteTuple ? chalk.green("connected") : chalk.yellow("waiting");
  }
  return chalk.gray("-");
};

const consumerState = (c: Pick<ConsumerSummary, "paused" | "producerPaused">): string => {
  if (c.paused && c.producerPaused) return chalk.yellow("paused (both)");
  if (c.paused) return chalk.yellow("paused");
  if (c.producerPaused) return chalk.yellow("producer paused");
  return chalk.green("active");
};

const producerScores = (p: ProducerSummary): string =>
  p.scores.length ? p.scores.map((s) => formatScore(s)).join(" ") : chalk.gray("-");

const consumerScore = (c: ConsumerSummary): string =>
  `${formatScore(c.score)}${chalk.gray("/")}${formatScore(c.producerScore)}`;

const layers = (c: ConsumerSummary): string =>
  c.currentLayers || c.preferredLayers
    ? `${c.currentLayers ?? "-"} ${chalk.gray(`(want ${c.preferredLayers ?? "-"})`)}`
    : chalk.gray("-");

type Columns<T> = Array<[header: string, cell: (row: T) => string]>;

const COLUMNS: { [K in ObjectKind]: Columns<Extract<ObjectSummary, { kind: K }>> } = {
  worker: [
    ["PID", (w) => String(w.pid)],
    ["CPU", (w) => formatPercent(w.cpu)],
    ["Max RSS", (w) => formatBytes(w.memory)],
    ["Routers", (w) => String(w.routers)],
    ["WebRtcServers", (w) => String(w.webRtcServers)],
    ["Age", (w) => age(w.createdAt)],
  ],
  webRtcServer: [
    ["ID", (s) => s.id],
    ["Worker", (s) => s.workerId],
    ["Transports", (s) => String(s.transports)],
    ["Age", (s) => age(s.createdAt)],
  ],
  router: [
    ["ID", (r) => r.id],
    ["Worker", (r) => r.workerId],
    ["Transports", (r) => String(r.transports)],
    ["Age", (r) => age(r.createdAt)],
  ],
  transport: [
    ["ID", (t) => t.id],
    ["Type", (t) => t.type],
    ["State", transportState],
    ["Remote", (t) => t.remoteTuple ?? chalk.gray("-")],
    ["Prod/Cons", (t) => `${t.producers}/${t.consumers}`],
    ["Data P/C", (t) => `${t.dataProducers}/${t.dataConsumers}`],
    ["Router", (t) => shortId(t.routerId)],
    ["Age", (t) => age(t.createdAt)],
  ],
  producer: [
    ["ID", (p) => p.id],
    ["Kind", (p) => p.mediaKind],
    ["Type", (p) => p.type],
    ["Codec", (p) => p.codec ?? "-"],
    ["Paused", (p) => yesNo(p.paused)],
    ["Score", producerScores],
    ["Consumers", (p) => String(p.consumers)],
    ["Transport", (p) => shortId(p.transportId)],
  ],
  consumer: [
    ["ID", (c) => c.id],
    ["Kind", (c) => c.mediaKind],
    ["Type", (c) => c.type],
    ["State", consumerState],
    ["Score", consumerScore],
    ["Layers", layers],
    ["Producer", (c) => shortId(c.producerId)],
    ["Transport", (c) => shortId(c.transportId)],
  ],
  dataProducer: [
    ["ID", (d) => d.id],
    ["Type", (d) => d.type],
    ["Label", (d) => d.label || chalk.gray("-")],
    ["Protocol", (d) => d.protocol || chalk.gray("-")],
    ["Paused", (d) => yesNo(d.paused)],
    ["Consumers", (d) => String(d.dataConsumers)],
    ["Transport", (d) => shortId(d.transportId)],
  ],
  dataConsumer: [
    ["ID", (d) => d.id],
    ["Type", (d) => d.type],
    ["Label", (d) => d.label || chalk.gray("-")],
    ["Paused", (d) => yesNo(d.paused)],
    ["DataProducer", (d) => shortId(d.dataProducerId)],
    ["Transport", (d) => shortId(d.transportId)],
  ],
};

const KIND_PLURALS: Record<ObjectKind, string> = {
  worker: "workers",
  webRtcServer: "WebRTC servers",
  router: "routers",
  transport: "transports",
  producer: "producers",
  consumer: "consumers",
  dataProducer: "data producers",
  dataConsumer: "data consumers",
};

export const renderList = (kind: ObjectKind, items: ObjectSummary[]): string => {
  if (items.length === 0) return dim(`No ${KIND_PLURALS[kind]} found.`);

  const columns = COLUMNS[kind] as Columns<ObjectSummary>;
  const t = table(columns.map(([header]) => header));
  for (const item of items) t.push(columns.map(([, cell]) => cell(item)));

  const count = items.length === 1 ? `1 ${KIND_LABELS[kind]}` : `${items.length} ${KIND_PLURALS[kind]}`;
  return `${bold(count)}\n${t.toString()}`;
};

/** One line description of an object, used by tree, inspect and find. */
export const describeLine = (s: ObjectSummary, full = false): string => {
  const id = full ? s.id : shortId(s.id);
  const head = `${kindLabel(s.kind)} ${bold(id)}`;
  const parts: string[] = [];

  switch (s.kind) {
    case "worker": {
      const w = s as WorkerSummary;
      parts.push(`cpu ${formatPercent(w.cpu)}`, `rss ${formatBytes(w.memory)}`);
      break;
    }
    case "webRtcServer":
      parts.push(plural((s as WebRtcServerSummary).transports, "transport"));
      break;
    case "router":
      parts.push(plural((s as RouterSummary).transports, "transport"));
      break;
    case "transport": {
      const t = s as TransportSummary;
      parts.push(chalk.white(t.type), transportState(t));
      if (t.remoteTuple) parts.push(dim(`⇄ ${t.remoteTuple}`));
      break;
    }
    case "producer": {
      const p = s as ProducerSummary;
      parts.push(`${p.mediaKind} ${p.codec ?? ""}`.trim(), dim(p.type));
      if (p.paused) parts.push(chalk.yellow("paused"));
      parts.push(`score ${producerScores(p)}`, dim(`→ ${plural(p.consumers, "consumer")}`));
      break;
    }
    case "consumer": {
      const c = s as ConsumerSummary;
      parts.push(`${c.mediaKind} ${c.codec ?? ""}`.trim(), dim(c.type), consumerState(c));
      parts.push(`score ${consumerScore(c)}`);
      if (c.currentLayers || c.preferredLayers) parts.push(`layers ${layers(c)}`);
      parts.push(dim(`← producer ${shortId(c.producerId)}`));
      break;
    }
    case "dataProducer": {
      const d = s as DataProducerSummary;
      parts.push(dim(d.type));
      if (d.label) parts.push(`"${d.label}"`);
      if (d.paused) parts.push(chalk.yellow("paused"));
      break;
    }
    case "dataConsumer": {
      const d = s as DataConsumerSummary;
      parts.push(dim(d.type));
      if (d.label) parts.push(`"${d.label}"`);
      parts.push(dim(`← dataProducer ${shortId(d.dataProducerId)}`));
      break;
    }
  }

  return [head, ...parts].join("  ");
};

/** Yield each object once in display order, retaining its branch indentation. */
function* treeRows(node: TreeNode, prefix = "", branch = ""): Generator<{ summary: ObjectSummary; branch: string }> {
  yield { summary: node.summary, branch: prefix + branch };
  const childPrefix = prefix + (branch === "├─ " ? "│  " : branch === "└─ " ? "   " : "");
  for (const [i, child] of node.children.entries()) {
    yield* treeRows(child, childPrefix, i === node.children.length - 1 ? "└─ " : "├─ ");
  }
}

export const renderTree = (roots: TreeNode[], full = false): string => {
  if (roots.length === 0) {
    return dim("No workers yet. Did you call observer(mediasoup) before createWorker()?");
  }
  return roots.map((root) =>
    [...treeRows(root)].map(({ summary, branch }) => dim(branch) + describeLine(summary, full)).join("\n")
  ).join("\n\n");
};

/** Shared columns keep mixed object kinds comparable without losing their tree path. */
const treeCells = (s: ObjectSummary, full: boolean): [string, string, string, string] => {
  const empty = dim("-");
  const id = (value: string) => full ? value : shortId(value);
  const details = (...parts: Array<string | undefined>) => parts.filter(Boolean).join(dim(" · ")) || empty;
  const mediaType = (value: ProducerSummary | ConsumerSummary) => `${value.mediaKind} ${value.codec ?? ""}`.trim();

  switch (s.kind) {
    case "worker":
      return [empty, s.died ? chalk.red("died") : chalk.green("running"), empty,
        `cpu ${formatPercent(s.cpu)}${dim(" · ")}rss ${formatBytes(s.memory)}`];
    case "webRtcServer":
    case "router":
      return [empty, empty, empty, plural(s.transports, "transport")];
    case "transport":
      return [s.type, transportState(s), empty, details(
        s.remoteTuple && dim(`⇄ ${s.remoteTuple}`),
        s.sctpState && `sctp ${formatState(s.sctpState)}`
      )];
    case "producer":
      return [mediaType(s), s.paused ? chalk.yellow("paused") : chalk.green("active"), producerScores(s),
        details(dim(s.type), dim(`→ ${plural(s.consumers, "consumer")}`))];
    case "consumer":
      return [mediaType(s), consumerState(s), consumerScore(s), details(
        dim(s.type),
        s.currentLayers || s.preferredLayers ? `layers ${layers(s)}` : undefined,
        dim(`← producer ${id(s.producerId)}`)
      )];
    case "dataProducer":
      return [s.type, s.paused ? chalk.yellow("paused") : chalk.green("active"), empty, details(
        s.label && `"${s.label}"`,
        s.protocol && dim(`protocol ${s.protocol}`),
        dim(`→ ${plural(s.dataConsumers, "data consumer")}`)
      )];
    case "dataConsumer":
      return [s.type, consumerState({ paused: Boolean(s.paused), producerPaused: Boolean(s.dataProducerPaused) }), empty,
        details(s.label && `"${s.label}"`, s.protocol && dim(`protocol ${s.protocol}`), dim(`← dataProducer ${id(s.dataProducerId)}`))];
  }
};

/** Render the same tree as a table, keeping branches beside colored kinds and ids. */
export const renderTreeTable = (roots: TreeNode[], full = false): string => {
  if (roots.length === 0) return renderTree(roots, full);
  const t = table(["Object", "Type / Codec", "State", "Score", "Details"]);
  for (const root of roots) {
    for (const { summary, branch } of treeRows(root)) {
      const label = `${dim(branch)}${kindLabel(summary.kind)} ${bold(full ? summary.id : shortId(summary.id))}`;
      t.push([label, ...treeCells(summary, full)]);
    }
  }
  return t.toString();
};

const formatValue = (key: string, value: unknown): string => {
  if (value === undefined || value === null || value === "") return chalk.gray("-");
  if (typeof value === "number") {
    if (/bitrate/i.test(key)) return formatBitrate(value);
    if (/bytes|byteCount/i.test(key)) return `${formatBytes(value)} ${dim(`(${value})`)}`;
    if (/^ru_[us]time$/.test(key)) return `${(value / 1000).toFixed(2)} s`;
    if (key === "ru_maxrss") return formatBytes(value * 1024);
    return Number.isInteger(value) ? String(value) : value.toFixed(3);
  }
  if (typeof value === "boolean") return value ? chalk.green("true") : chalk.gray("false");
  if (typeof value === "object") return util.inspect(value, { depth: 3, colors: chalk.level > 0, breakLength: 60 });
  return String(value);
};

export const renderStats = (result: StatsResult): string => {
  const { stats } = result;
  const title = `${kindLabel(result.kind)} ${bold(result.id)} ${dim("stats")}`;
  if (stats.length === 0) {
    return `${title}\n${dim("No stats yet (no RTP has flowed through this object).")}`;
  }

  // One column per stats entry, one row per field: easy to compare streams.
  const keys: string[] = [];
  for (const entry of stats) {
    for (const key of Object.keys(entry)) if (!keys.includes(key) && key !== "type") keys.push(key);
  }

  const headers = stats.map((s, i) => String(s.type ?? `#${i + 1}`));
  const t = table(["", ...headers]);
  for (const key of keys) {
    t.push([chalk.cyan(key), ...stats.map((s) => formatValue(key, s[key]))]);
  }

  return `${title}\n${t.toString()}`;
};

const SKIP_FIELDS = new Set(["kind", "id", "appData"]);

export const renderInspect = (result: InspectResult): string => {
  const { summary, path, children } = result;
  const lines: string[] = [`${kindLabel(summary.kind)} ${bold(summary.id)}`];

  if (path.length) {
    lines.push(
      dim("path ") +
        [...path.map((p) => `${KIND_LABELS[p.kind]} ${shortId(p.id)}`), KIND_LABELS[summary.kind]].join(
          dim(" › ")
        )
    );
  }

  const t = new Table({ style: { head: [], border: [], compact: true } });
  for (const [key, value] of Object.entries(summary)) {
    if (SKIP_FIELDS.has(key)) continue;
    let text: string;
    if (key === "createdAt") text = `${new Date(value as number).toLocaleString()} ${dim(`(${age(value as number)} ago)`)}`;
    else if (key === "cpu") text = formatPercent(value as number);
    else if (key === "memory") text = formatBytes(value as number);
    else if (key === "iceState" || key === "dtlsState" || key === "sctpState") text = formatState(value as string);
    else if (key === "scores") text = (value as number[]).map((s) => formatScore(s)).join(" ") || chalk.gray("-");
    else if (key === "score" || key === "producerScore") text = formatScore(value as number);
    else text = formatValue(key, value);
    t.push({ [chalk.cyan(key)]: text });
  }
  lines.push(t.toString());

  for (const [kind, ids] of Object.entries(children) as Array<[ObjectKind, string[]]>) {
    const shown = ids.slice(0, 20);
    lines.push(`${bold(KIND_PLURALS[kind])} ${dim(`(${ids.length})`)}`);
    for (const id of shown) lines.push(`  ${id}`);
    if (ids.length > shown.length) lines.push(dim(`  … and ${ids.length - shown.length} more`));
  }

  if (summary.appData !== undefined) {
    lines.push(bold("appData"));
    lines.push(util.inspect(summary.appData, { depth: 6, colors: chalk.level > 0 }));
  }

  return lines.join("\n");
};

export const renderDump = (data: unknown): string =>
  util.inspect(data, { depth: null, colors: chalk.level > 0, maxArrayLength: 500 });

const EVENT_SYMBOLS: Record<string, string> = {
  created: chalk.green("+"),
  closed: chalk.red("-"),
};

export const renderEvent = (e: EventRecord): string => {
  const symbol = EVENT_SYMBOLS[e.event] ?? chalk.yellow("~");
  const name = e.event === "created" || e.event === "closed" ? e.event : chalk.yellow(e.event);
  const kind = kindLabel(e.kind) + " ".repeat(Math.max(0, 13 - KIND_LABELS[e.kind].length));
  const parent = e.parentId ? dim(` (in ${shortId(e.parentId)})`) : "";
  const detail = e.detail ? ` ${e.detail}` : "";
  return `${dim(formatTime(e.time))} ${symbol} ${kind}${shortId(e.id)}  ${name}${detail}${parent}`;
};

export const renderEvents = (events: EventRecord[]): string =>
  events.length ? events.map(renderEvent).join("\n") : dim("No events recorded yet.");

export const renderFind = (matches: FindMatch[], query: string): string => {
  if (matches.length === 0) return dim(`Nothing matches "${query}".`);
  const lines = [bold(matches.length === 1 ? "1 match" : `${matches.length} matches`)];
  for (const m of matches) {
    lines.push(`${describeLine(m.summary, true)}\n    ${dim(`${m.field} = ${m.value}`)}`);
  }
  return lines.join("\n");
};

export const renderSummary = (s: Summary): string => {
  const { server, counts } = s;
  const lines: string[] = [];

  lines.push(
    `${bold("app")} pid ${server.pid}  ${dim("·")}  node ${server.nodeVersion}  ${dim("·")}  mediasoup ${
      server.mediasoupVersion ?? "?"
    }  ${dim("·")}  mediasoup-cli ${server.version}`
  );
  lines.push(
    `${bold("process")} rss ${formatBytes(s.process.rss)}  ${dim("·")}  heap ${formatBytes(
      s.process.heapUsed
    )}  ${dim("·")}  observed for ${formatDuration(Date.now() - server.startedAt)}`
  );
  lines.push("");

  const order: ObjectKind[] = [
    "worker",
    "webRtcServer",
    "router",
    "transport",
    "producer",
    "consumer",
    "dataProducer",
    "dataConsumer",
  ];
  const t = table(order.map((k) => KIND_PLURALS[k]));
  t.push(order.map((k) => String(counts[k] ?? 0)));
  lines.push(t.toString());

  if (s.workers.length) {
    lines.push("");
    lines.push(renderList("worker", s.workers));
  }

  lines.push("");
  if (s.warnings.length) for (const w of s.warnings) lines.push(warnText(w));
  else lines.push(okText("no issues detected"));

  return lines.join("\n");
};
