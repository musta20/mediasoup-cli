import chalk from "chalk";
import { ObjectKind } from "../shared/protocol";

export const KIND_LABELS: Record<ObjectKind, string> = {
  worker: "worker",
  webRtcServer: "webRtcServer",
  router: "router",
  transport: "transport",
  producer: "producer",
  consumer: "consumer",
  dataProducer: "dataProducer",
  dataConsumer: "dataConsumer",
};

const KIND_COLORS: Record<ObjectKind, (s: string) => string> = {
  worker: chalk.magentaBright,
  webRtcServer: chalk.magenta,
  router: chalk.blueBright,
  transport: chalk.cyanBright,
  producer: chalk.greenBright,
  consumer: chalk.yellowBright,
  dataProducer: chalk.green,
  dataConsumer: chalk.yellow,
};

export const kindLabel = (kind: ObjectKind): string => KIND_COLORS[kind](KIND_LABELS[kind]);

export const plural = (n: number, word: string): string =>
  `${n} ${word}${n === 1 ? "" : "s"}`;

export const shortId = (id: string | undefined, length = 8): string =>
  !id ? "-" : id.length > length + 1 ? id.slice(0, length) : id;

export const formatBytes = (bytes: number | null | undefined): string => {
  if (typeof bytes !== "number" || !Number.isFinite(bytes)) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (Math.abs(value) >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
};

export const formatBitrate = (bps: number | null | undefined): string => {
  if (typeof bps !== "number" || !Number.isFinite(bps)) return "-";
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(2)} Mbps`;
  if (bps >= 1e3) return `${(bps / 1e3).toFixed(1)} kbps`;
  return `${bps.toFixed(0)} bps`;
};

export const formatDuration = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
};

export const age = (createdAt: number, now = Date.now()): string =>
  formatDuration(now - createdAt);

export const formatTime = (time: number): string => {
  const d = new Date(time);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(
    d.getMilliseconds(),
    3
  )}`;
};

export const formatPercent = (value: number | null | undefined): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  const text = `${value.toFixed(1)}%`;
  if (value >= 80) return chalk.red(text);
  if (value >= 50) return chalk.yellow(text);
  return text;
};

/** mediasoup scores go from 0 (bad) to 10 (perfect). */
export const formatScore = (score: number | undefined): string => {
  if (typeof score !== "number") return chalk.gray("-");
  if (score >= 8) return chalk.green(String(score));
  if (score >= 5) return chalk.yellow(String(score));
  return chalk.red(String(score));
};

const GOOD_STATES = new Set(["connected", "completed"]);
const BAD_STATES = new Set(["failed", "disconnected", "closed"]);

export const formatState = (state: string | undefined): string => {
  if (!state) return chalk.gray("-");
  if (GOOD_STATES.has(state)) return chalk.green(state);
  if (BAD_STATES.has(state)) return chalk.red(state);
  return chalk.yellow(state);
};

export const dim = (text: string): string => chalk.gray(text);
export const bold = (text: string): string => chalk.bold(text);
export const errorText = (text: string): string => chalk.red(`✖ ${text}`);
export const warnText = (text: string): string => chalk.yellow(`⚠ ${text}`);
export const okText = (text: string): string => chalk.green(`✔ ${text}`);
