import { OBJECT_KINDS, ObjectKind } from "../shared/protocol";

export interface ParsedArgs {
  positionals: string[];
  flags: Record<string, string | true>;
}

/** Canonical flag names, looked up case-insensitively. */
const FLAG_NAMES: Record<string, string> = {
  workerid: "workerId",
  routerid: "routerId",
  transportid: "transportId",
  producerid: "producerId",
  limit: "limit",
  kind: "kind",
  interval: "interval",
  n: "interval",
  port: "port",
  host: "host",
  token: "token",
  json: "json",
  full: "full",
  help: "help",
  h: "help",
  version: "version",
  v: "version",
  "no-color": "noColor",
};

const VALUE_FLAGS = new Set([
  "workerId",
  "routerId",
  "transportId",
  "producerId",
  "limit",
  "kind",
  "interval",
  "port",
  "host",
  "token",
]);

/** Flags that may also be written without dashes, as in the 1.x README. */
const LEGACY_KEY_VALUE = new Set(["workerId", "routerId", "transportId", "producerId"]);

export const canonicalFlag = (name: string): string =>
  FLAG_NAMES[name.toLowerCase()] ?? name;

/** Split a command line into words, honouring single and double quotes. */
export const tokenize = (line: string): string[] => {
  const tokens: string[] = [];
  let current = "";
  let quote: string | undefined;
  let inToken = false;

  for (const char of line) {
    if (quote) {
      if (char === quote) quote = undefined;
      else current += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      inToken = true;
    } else if (/\s/.test(char)) {
      if (inToken) tokens.push(current);
      current = "";
      inToken = false;
    } else {
      current += char;
      inToken = true;
    }
  }
  if (inToken) tokens.push(current);

  return tokens;
};

export const parseArgs = (tokens: string[]): ParsedArgs => {
  const positionals: string[] = [];
  const flags: Record<string, string | true> = {};

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    const dashed = /^--?([^=]+)(?:=(.*))?$/s.exec(token);
    if (dashed && token !== "-" && token !== "--") {
      const name = canonicalFlag(dashed[1]);
      if (dashed[2] !== undefined) {
        flags[name] = dashed[2];
      } else if (VALUE_FLAGS.has(name) && i + 1 < tokens.length && !tokens[i + 1].startsWith("-")) {
        flags[name] = tokens[++i];
      } else {
        flags[name] = true;
      }
      continue;
    }

    const legacy = /^([A-Za-z]+)=(.*)$/s.exec(token);
    if (legacy && LEGACY_KEY_VALUE.has(canonicalFlag(legacy[1]))) {
      flags[canonicalFlag(legacy[1])] = legacy[2];
      continue;
    }

    positionals.push(token);
  }

  return { positionals, flags };
};

const KIND_ALIASES: Record<string, ObjectKind> = {};
for (const kind of OBJECT_KINDS) {
  const lower = kind.toLowerCase();
  KIND_ALIASES[lower] = kind;
  KIND_ALIASES[`${lower}s`] = kind;
}
Object.assign(KIND_ALIASES, {
  "data-producer": "dataProducer",
  "data-producers": "dataProducer",
  "data-consumer": "dataConsumer",
  "data-consumers": "dataConsumer",
  "webrtc-server": "webRtcServer",
  "webrtc-servers": "webRtcServer",
});

/** "routers", "Router", "data-producers"… -> ObjectKind. */
export const parseKind = (word: string | undefined): ObjectKind | undefined =>
  word ? KIND_ALIASES[word.toLowerCase()] : undefined;

export const KIND_WORDS = OBJECT_KINDS.map((k) => `${k.toLowerCase()}s`);

/** "500", "500ms", "2s", "1.5s" -> milliseconds. */
export const parseDuration = (value: string | true | undefined): number | undefined => {
  if (value === undefined || value === true) return undefined;
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s)?$/i.exec(value.trim());
  if (!match) return undefined;
  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  // A bare number below 100 is taken as seconds, like `watch -n 2`.
  const ms = unit === "s" || (!unit && amount < 100) ? amount * 1000 : amount;
  return Math.max(100, Math.round(ms));
};
