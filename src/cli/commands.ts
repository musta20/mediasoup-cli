import chalk from "chalk";
import { packageVersion } from "../shared/config";
import {
  EventRecord,
  Filter,
  FILTER_KEYS,
  FindMatch,
  InspectResult,
  ObjectKind,
  ObjectSummary,
  StatsResult,
  Summary,
  TreeNode,
} from "../shared/protocol";
import { KIND_WORDS, parseArgs, parseDuration, parseKind, ParsedArgs } from "./args";
import { Client } from "./client";
import { bold, dim, KIND_LABELS } from "./format";
import {
  renderDump,
  renderEvents,
  renderFind,
  renderInspect,
  renderList,
  renderStats,
  renderSummary,
  renderTree,
} from "./render";

export interface Output {
  data: unknown;
  text: string;
}

export interface CommandContext {
  client: Client;
}

export type Completion = "kind" | "id" | "command";

export interface Command {
  name: string;
  aliases?: string[];
  usage: string;
  summary: string;
  details?: string;
  examples?: string[];
  /** Flags offered by tab completion. */
  flags?: string[];
  /** What each positional argument completes to. */
  complete?: Completion[];
  watchable?: boolean;
  run(ctx: CommandContext, args: ParsedArgs): Promise<Output>;
}

export class UsageError extends Error {
  constructor(message: string, readonly usage?: string) {
    super(message);
  }
}

const FILTER_FLAGS = FILTER_KEYS.map((k) => `--${k}=`);

const filterFrom = (args: ParsedArgs): Filter => {
  const filter: Filter = {};
  for (const key of FILTER_KEYS) {
    const value = args.flags[key];
    if (value === true) throw new UsageError(`--${key} needs a value, e.g. --${key}=1a2b`);
    if (value !== undefined) filter[key] = value;
  }
  return filter;
};

const requireId = (args: ParsedArgs, command: Command, index = 0): string => {
  const id = args.positionals[index];
  if (!id) throw new UsageError("missing id", command.usage);
  return id;
};

const inspect = async (ctx: CommandContext, id: string, kind?: ObjectKind): Promise<Output> => {
  const result = await ctx.client.request<InspectResult>({ cmd: "inspect", id });
  if (kind && result.summary.kind !== kind) {
    throw new Error(`${id} is a ${KIND_LABELS[result.summary.kind]}, not a ${KIND_LABELS[kind]}`);
  }
  return { data: result, text: renderInspect(result) };
};

const show: Command = {
  name: "show",
  aliases: ["ls", "list"],
  usage: "show <kind> [<id>] [--workerId=<pid>] [--routerId=<id>] [--transportId=<id>] [--producerId=<id>]",
  summary: "List objects of a kind, optionally filtered by their parents",
  details: `Kinds: ${KIND_WORDS.join(", ")} (singular works too).\nIds can be shortened to any unique prefix.`,
  examples: [
    "show workers",
    "show routers --workerId=12345",
    "show transports --routerId=7f3a",
    "show consumers --producerId=1a2b",
    "show producer 1a2b3c4d",
  ],
  flags: FILTER_FLAGS,
  complete: ["kind", "id"],
  watchable: true,
  async run(ctx, args) {
    const kind = parseKind(args.positionals[0]);
    if (!kind) {
      throw new UsageError(
        args.positionals[0] ? `unknown kind "${args.positionals[0]}"` : "missing kind",
        `${this.usage}\nkinds: ${KIND_WORDS.join(", ")}`
      );
    }

    const filter = filterFrom(args);
    const id = args.positionals[1];

    // 1.x syntax: show transports --transportId=<id> all
    if (id === "all" && kind === "transport" && filter.transportId) {
      return inspect(ctx, filter.transportId, "transport");
    }
    if (id && id !== "all") return inspect(ctx, id, kind);

    const items = await ctx.client.request<ObjectSummary[]>({ cmd: "list", kind, filter });
    return { data: items, text: renderList(kind, items) };
  },
};

const tree: Command = {
  name: "tree",
  usage: "tree [<id>] [--workerId=<pid>] [--routerId=<id>] [--transportId=<id>] [--full]",
  summary: "Show the worker → router → transport → producer/consumer hierarchy",
  details: "Ids are shortened to 8 characters, use --full to see them entirely.",
  examples: ["tree", "tree 7f3a2b1c", "tree --workerId=12345 --full"],
  flags: [...FILTER_FLAGS.filter((f) => f !== "--producerId="), "--full"],
  complete: ["id"],
  watchable: true,
  async run(ctx, args) {
    const roots = await ctx.client.request<TreeNode[]>({
      cmd: "tree",
      filter: filterFrom(args),
      rootId: args.positionals[0],
    });
    return { data: roots, text: renderTree(roots, args.flags.full === true) };
  },
};

const inspectCommand: Command = {
  name: "inspect",
  aliases: ["info", "get"],
  usage: "inspect <id>",
  summary: "Details, parents, children and appData of one object",
  examples: ["inspect 1a2b3c4d", "inspect 12345"],
  complete: ["id"],
  watchable: true,
  run(ctx, args) {
    return inspect(ctx, requireId(args, this));
  },
};

const stats: Command = {
  name: "stats",
  usage: "stats <id>",
  summary: "RTP and transport statistics from mediasoup getStats()",
  details: "Works for transports, producers, consumers, data producers/consumers and workers (resource usage).\nTry `watch stats <id>` for live bitrates.",
  examples: ["stats 1a2b3c4d", "watch stats 1a2b3c4d --interval=2s"],
  complete: ["id"],
  watchable: true,
  async run(ctx, args) {
    const result = await ctx.client.request<StatsResult>({ cmd: "stats", id: requireId(args, this) });
    return { data: result, text: renderStats(result) };
  },
};

const dump: Command = {
  name: "dump",
  usage: "dump <id>",
  summary: "Raw mediasoup dump() of an object (RTP parameters, mappings, …)",
  examples: ["dump 7f3a2b1c", "dump 1a2b3c4d --json > producer.json"],
  complete: ["id"],
  watchable: true,
  async run(ctx, args) {
    const data = await ctx.client.request<unknown>({ cmd: "dump", id: requireId(args, this) });
    return { data, text: renderDump(data) };
  },
};

const find: Command = {
  name: "find",
  aliases: ["search"],
  usage: "find <text | key=value>",
  summary: "Search object ids, labels and appData",
  details: "Plain text matches any id or appData value containing it.\nkey=value matches an appData field exactly (case-insensitive).",
  examples: ["find alice", "find peerId=alice", "find roomId=42"],
  watchable: true,
  async run(ctx, args) {
    const query = args.positionals.join(" ");
    if (!query) throw new UsageError("missing search text", this.usage);
    const matches = await ctx.client.request<FindMatch[]>({ cmd: "find", query });
    return { data: matches, text: renderFind(matches, query) };
  },
};

const events: Command = {
  name: "events",
  aliases: ["log"],
  usage: "events [--limit=50] [--kind=<kind>]",
  summary: "Recent lifecycle events: created/closed, pause/resume, ICE/DTLS changes…",
  details: "Use `watch events` to follow them live.",
  examples: ["events", "events --kind=consumer --limit=100", "watch events"],
  flags: ["--limit=", "--kind="],
  async run(ctx, args) {
    const limit = args.flags.limit === undefined ? 50 : Number(args.flags.limit);
    if (!Number.isFinite(limit) || limit < 1) throw new UsageError("--limit must be a positive number");
    const kind = kindFlag(args);
    const records = await ctx.client.request<EventRecord[]>({ cmd: "events", limit, kind });
    return { data: records, text: renderEvents(records) };
  },
};

export const kindFlag = (args: ParsedArgs): ObjectKind | undefined => {
  const value = args.flags.kind;
  if (value === undefined) return undefined;
  const kind = parseKind(value === true ? undefined : value);
  if (!kind) throw new UsageError(`unknown kind "${value}"`, `kinds: ${KIND_WORDS.join(", ")}`);
  return kind;
};

const summary: Command = {
  name: "summary",
  aliases: ["status", "overview"],
  usage: "summary",
  summary: "Object counts, worker CPU/memory and health warnings",
  examples: ["summary", "top"],
  watchable: true,
  async run(ctx) {
    const data = await ctx.client.request<Summary>({ cmd: "summary" });
    return { data, text: renderSummary(data) };
  },
};

/** Commands that talk to the server, in help order. */
export const COMMANDS: Command[] = [show, tree, inspectCommand, stats, dump, find, events, summary];

/** Commands handled by the shell itself (help/watch/exit…), for help and completion. */
export const SHELL_COMMANDS: Array<Pick<Command, "name" | "aliases" | "usage" | "summary" | "details" | "examples" | "flags" | "complete">> = [
  {
    name: "watch",
    usage: "watch <command> [args] [--interval=1s]",
    summary: "Re-run a command live, press q, Esc, Enter or Ctrl+C to stop",
    details: "`watch events` follows the event log instead of redrawing.\n1.x syntax `watch <kind> [filters]` still works.",
    examples: ["watch tree", "watch show consumers --transportId=1a2b", "watch stats 1a2b3c4d", "watch events"],
    flags: ["--interval="],
    complete: ["command"],
  },
  {
    name: "top",
    usage: "top",
    summary: "Live summary, same as `watch summary`",
  },
  { name: "help", aliases: ["?"], usage: "help [command]", summary: "Show help", complete: ["command"] },
  { name: "version", usage: "version", summary: "Show the CLI and server versions" },
  { name: "clear", aliases: ["cls"], usage: "clear", summary: "Clear the screen" },
  { name: "exit", aliases: ["quit", "q"], usage: "exit", summary: "Leave the shell" },
];

export const findCommand = (name: string | undefined): Command | undefined => {
  if (!name) return undefined;
  const lower = name.toLowerCase();
  return COMMANDS.find((c) => c.name === lower || c.aliases?.includes(lower));
};

const findAnyCommand = (name: string | undefined) => {
  if (!name) return undefined;
  const lower = name.toLowerCase();
  return [...COMMANDS, ...SHELL_COMMANDS].find((c) => c.name === lower || c.aliases?.includes(lower));
};

export const allCommandNames = (): string[] =>
  [...COMMANDS, ...SHELL_COMMANDS].flatMap((c) => [c.name, ...(c.aliases ?? [])]);

export type Plan =
  | { type: "run"; command: Command; args: ParsedArgs; json: boolean }
  | { type: "watch"; command: Command; args: ParsedArgs; json: boolean; intervalMs: number; title: string }
  | { type: "follow-events"; args: ParsedArgs; json: boolean; kind?: ObjectKind }
  | { type: "help"; topic?: string }
  | { type: "version"; json: boolean }
  | { type: "clear" }
  | { type: "exit" }
  | { type: "noop" };

/** Turn tokens into what should happen. Throws UsageError on bad input. */
export const plan = (tokens: string[]): Plan => {
  const args = parseArgs(tokens);
  const [first, ...rest] = args.positionals;
  const json = args.flags.json === true;

  if (!first) {
    if (args.flags.help) return { type: "help" };
    if (args.flags.version) return { type: "version", json };
    return { type: "noop" };
  }

  const name = first.toLowerCase();
  const restArgs: ParsedArgs = { positionals: rest, flags: args.flags };

  if (args.flags.help) return { type: "help", topic: name };

  switch (name) {
    case "help":
    case "?":
      return { type: "help", topic: rest[0] };
    case "version":
      return { type: "version", json };
    case "clear":
    case "cls":
      return { type: "clear" };
    case "exit":
    case "quit":
    case "q":
      return { type: "exit" };
    case "top":
      return planWatch({ positionals: ["summary"], flags: args.flags }, json);
    case "watch":
      return planWatch(restArgs, json);
  }

  const command = findCommand(name);
  if (!command) {
    // 1.x allowed the kind as the command: `routers` -> `show routers`.
    if (parseKind(name)) return { type: "run", command: show, args, json };
    throw new UsageError(`unknown command "${first}"`, "type `help` to list commands");
  }

  return { type: "run", command, args: restArgs, json };
};

const planWatch = (args: ParsedArgs, json: boolean): Plan => {
  const [first, ...rest] = args.positionals;
  if (!first) throw new UsageError("what should I watch?", SHELL_COMMANDS[0].usage);

  const intervalMs = args.flags.interval === undefined ? 1000 : parseDuration(args.flags.interval);
  if (intervalMs === undefined) {
    throw new UsageError(`invalid interval "${args.flags.interval}"`, "e.g. --interval=500ms or --interval=2s");
  }

  if (first.toLowerCase() === "events" || first.toLowerCase() === "log") {
    return { type: "follow-events", args: { positionals: rest, flags: args.flags }, json, kind: kindFlag(args) };
  }

  let command = findCommand(first);
  let commandArgs: ParsedArgs = { positionals: rest, flags: args.flags };

  // 1.x syntax: `watch routers --workerId=1`.
  if (!command && parseKind(first)) {
    command = show;
    commandArgs = args;
  }
  if (!command) throw new UsageError(`unknown command "${first}"`, "type `help` to list commands");
  if (!command.watchable) throw new UsageError(`"${command.name}" cannot be watched`);

  const title = [command.name, ...commandArgs.positionals].join(" ");
  return { type: "watch", command, args: commandArgs, json, intervalMs, title };
};

const pad = (text: string, width: number) => text + " ".repeat(Math.max(1, width - text.length));

export const helpText = (topic?: string, mode: "shell" | "argv" = "shell"): string => {
  if (topic) {
    const command = findAnyCommand(topic) ?? (parseKind(topic) ? show : undefined);
    if (!command) return chalk.yellow(`unknown command "${topic}"`);
    const lines = [`${bold("Usage:")} ${command.usage}`, "", command.summary];
    if (command.aliases?.length) lines.push(dim(`aliases: ${command.aliases.join(", ")}`));
    if (command.details) lines.push("", command.details);
    if (command.examples?.length) {
      lines.push("", bold("Examples:"), ...command.examples.map((e) => `  ${e}`));
    }
    return lines.join("\n");
  }

  const rows = [...COMMANDS, ...SHELL_COMMANDS].map(
    (c) => `  ${pad(c.usage.split(" [--")[0].replace(" [<id>]", ""), 30)}${dim(c.summary)}`
  );

  const lines = [
    mode === "argv"
      ? `${bold("Usage:")} mediasoup-cli [options] [command]\n\nWithout a command, an interactive shell starts.`
      : `${bold("Commands")} ${dim("(tab completes commands, kinds and ids)")}`,
    "",
    ...(mode === "argv" ? [bold("Commands:")] : []),
    ...rows,
    "",
    bold("Filters:"),
    "  --workerId=<pid>  --routerId=<id>  --transportId=<id>  --producerId=<id>",
    dim("  Ids can be shortened to any unique prefix: inspect 1a2b"),
    "",
    bold("Output:"),
    `  ${pad("--json", 18)}${dim("machine readable output (one JSON line per refresh with watch)")}`,
    `  ${pad("--interval=<t>", 18)}${dim("watch refresh interval, e.g. 500ms or 2s (default 1s)")}`,
  ];

  if (mode === "argv") {
    lines.push(
      `  ${pad("--no-color", 18)}${dim("disable colors (NO_COLOR=1 works too)")}`,
      "",
      bold("Connection:"),
      `  ${pad("--host <host>", 18)}${dim("default 127.0.0.1 ($MEDIA_SOUP_CLI_HOST)")}`,
      `  ${pad("--port <port>", 18)}${dim("default from config.env, $MEDIA_SOUP_CLI_PORT or 5462")}`,
      `  ${pad("--token <token>", 18)}${dim("shared secret if the server sets one ($MEDIA_SOUP_CLI_TOKEN)")}`,
      "",
      `  ${pad("-h, --help", 18)}${dim("show help, `mediasoup-cli help <command>` for details")}`,
      `  ${pad("-v, --version", 18)}${dim("show version")}`,
      "",
      bold("Examples:"),
      `  npx mediasoup-cli ${dim("# interactive shell")}`,
      "  npx mediasoup-cli tree",
      "  npx mediasoup-cli watch stats 1a2b3c4d",
      "  npx mediasoup-cli show consumers --json | jq '.[].score'"
    );
  } else {
    lines.push("", dim("Type `help <command>` for details and examples."));
  }

  return lines.join("\n");
};

export const versionText = (): string => `mediasoup-cli ${packageVersion()}`;
