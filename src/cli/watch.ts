import chalk from "chalk";
import { EventRecord, ObjectKind, ServerInfo } from "../shared/protocol";
import { Client } from "./client";
import { Output } from "./commands";
import { dim, errorText, formatTime } from "./format";
import { renderEvent } from "./render";

const ESC = "\x1b[";
const ALT_SCREEN_ON = `${ESC}?1049h`;
const ALT_SCREEN_OFF = `${ESC}?1049l`;
const CURSOR_HIDE = `${ESC}?25l`;
const CURSOR_SHOW = `${ESC}?25h`;
const HOME = `${ESC}H`;
const CLEAR_LINE_END = `${ESC}K`;
const CLEAR_SCREEN_END = `${ESC}J`;

const STOP_KEYS = new Set(["q", "Q", "\x03", "\x1b", "\r", "\n"]);

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * Resolve when the user presses q / Esc / Enter / Ctrl+C (or on SIGINT).
 * Only a TTY stdin is touched: piped input belongs to the shell's readline.
 */
export const waitForStopKey = (): Promise<void> =>
  new Promise((resolve) => {
    const stdin = process.stdin;
    const raw = Boolean(stdin.isTTY);
    const wasFlowing = stdin.readableFlowing === true;

    const onData = (data: Buffer) => {
      if (STOP_KEYS.has(data.toString())) done();
    };
    const done = () => {
      process.off("SIGINT", done);
      if (raw) {
        stdin.off("data", onData);
        stdin.setRawMode(false);
        if (!wasFlowing) stdin.pause();
      }
      resolve();
    };

    if (raw) {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.on("data", onData);
    }
    process.on("SIGINT", done);
  });

const ANSI_SEQUENCE = /\x1b\[[0-9;?]*[ -/]*[@-~]/y;
const ANSI_GLOBAL = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;

/** Cut a line to `width` visible columns, keeping colour codes intact. */
export const truncateLine = (line: string, width: number): string => {
  if (width <= 1 || line.replace(ANSI_GLOBAL, "").length <= width) return line;

  let out = "";
  let visible = 0;
  for (let i = 0; i < line.length; ) {
    ANSI_SEQUENCE.lastIndex = i;
    const escape = ANSI_SEQUENCE.exec(line);
    if (escape) {
      out += escape[0];
      i += escape[0].length;
      continue;
    }
    if (visible === width - 1) break;
    const char = String.fromCodePoint(line.codePointAt(i) as number);
    out += char;
    visible++;
    i += char.length;
  }
  return `${out}\x1b[0m…`;
};

export interface WatchOptions {
  client: Client;
  title: string;
  intervalMs: number;
  json: boolean;
  render: () => Promise<Output>;
  stop?: Promise<void>;
}

/** Re-render a command until stopped, refreshing on a timer and on server changes. */
export const runWatch = async (options: WatchOptions): Promise<void> => {
  const { client, title, intervalMs, json } = options;
  const out = process.stdout;
  const fullscreen = Boolean(out.isTTY) && !json;

  let stopped = false;
  let running = false;
  let queued = false;

  const draw = (body: string) => {
    if (!fullscreen) {
      out.write(`${dim(`--- ${formatTime(Date.now())} ${title} ---`)}\n${body}\n`);
      return;
    }

    const interval = intervalMs >= 1000 ? `${intervalMs / 1000}s` : `${intervalMs}ms`;
    const status = client.connected ? chalk.green("● live") : chalk.red("○ disconnected");
    const header = `${chalk.bold(`Every ${interval}: ${title}`)}  ${status}  ${dim(formatTime(Date.now()))}`;
    const footer = dim("q / Esc / Enter / Ctrl+C to stop");

    // Lines wider than the terminal would wrap and push the header away.
    let lines = [header, "", ...body.split("\n")].map((l) => truncateLine(l, out.columns || 0));
    const rows = out.rows || 0;
    if (rows > 3 && lines.length > rows - 1) {
      const hidden = lines.length - (rows - 2);
      lines = [...lines.slice(0, rows - 2), dim(`… ${hidden} more lines, enlarge the terminal or narrow with filters`)];
    }

    out.write(
      HOME + lines.map((l) => l + CLEAR_LINE_END).join("\n") + "\n" + footer + CLEAR_LINE_END + CLEAR_SCREEN_END
    );
  };

  const frame = async (): Promise<void> => {
    if (stopped) return;
    if (running) {
      queued = true;
      return;
    }
    running = true;

    try {
      let body: string;
      try {
        const output = await options.render();
        body = json ? JSON.stringify(output.data) : output.text;
      } catch (err) {
        body = json ? JSON.stringify({ error: errorMessage(err) }) : errorText(errorMessage(err));
      }
      if (!stopped) {
        if (json) out.write(body + "\n");
        else draw(body);
      }
    } finally {
      running = false;
      if (queued && !stopped) {
        queued = false;
        void frame();
      }
    }
  };

  const refresh = () => void frame();
  const restoreScreen = () => out.write(CURSOR_SHOW + ALT_SCREEN_OFF);

  // Listen for the stop key before anything slow happens, so Ctrl+C during
  // the first (possibly slow) request stops the watch instead of the process.
  const stop = options.stop ?? waitForStopKey();

  if (fullscreen) {
    out.write(ALT_SCREEN_ON + CURSOR_HIDE);
    process.on("exit", restoreScreen);
  }

  const timer = setInterval(refresh, intervalMs);
  client.on("changed", refresh);
  client.on("connect", refresh);
  client.on("disconnect", refresh);
  out.on("resize", refresh);

  void frame();
  await stop;

  stopped = true;
  clearInterval(timer);
  client.off("changed", refresh);
  client.off("connect", refresh);
  client.off("disconnect", refresh);
  out.off("resize", refresh);

  if (fullscreen) {
    restoreScreen();
    process.off("exit", restoreScreen);
  }
};

export interface FollowOptions {
  client: Client;
  json: boolean;
  kind?: ObjectKind;
  backlog?: number;
  stop?: Promise<void>;
  write?: (text: string) => void;
}

/** Print the recent event log, then stream new events as they happen. */
export const followEvents = async (options: FollowOptions): Promise<void> => {
  const { client, json, kind } = options;
  const out = { write: options.write ?? ((text: string) => process.stdout.write(text)) };
  const stop = options.stop ?? waitForStopKey();
  let lastSeq = 0;
  let server: string | undefined;
  // Live events that arrive while the backlog is loading are held back so
  // everything prints in order.
  let buffer: EventRecord[] | undefined;

  const print = (record: EventRecord) => {
    if (record.seq <= lastSeq) return;
    lastSeq = record.seq;
    if (kind && record.kind !== kind) return;
    out.write((json ? JSON.stringify(record) : renderEvent(record)) + "\n");
  };

  const onEvent = (record: EventRecord) => {
    if (buffer) buffer.push(record);
    else print(record);
  };

  const subscribe = async () => {
    buffer = [];
    try {
      // A restarted app numbers its events from 1 again.
      const info = await client.request<ServerInfo>({ cmd: "hello" });
      const identity = `${info.pid}:${info.startedAt}`;
      if (server !== undefined && server !== identity) lastSeq = 0;
      server = identity;

      await client.request({ cmd: "subscribe", topic: "events" });
      // Catch up with anything that happened while we were (re)connecting.
      const recent = await client.request<EventRecord[]>({
        cmd: "events",
        limit: lastSeq ? 1000 : options.backlog ?? 20,
        kind,
      });
      [...recent, ...buffer].sort((a, b) => a.seq - b.seq).forEach(print);
    } catch (err) {
      out.write(errorText(errorMessage(err)) + "\n");
    } finally {
      buffer = undefined;
    }
  };

  const onDisconnect = () => {
    if (!json) out.write(chalk.red("○ disconnected, waiting for the server…") + "\n");
  };

  if (!json) out.write(dim(`Following events${kind ? ` for ${kind}s` : ""}, press q / Esc / Enter / Ctrl+C to stop.`) + "\n");

  let pending: Promise<void> | undefined;
  const onConnect = () => {
    pending = subscribe();
  };

  client.on("event", onEvent);
  client.on("connect", onConnect);
  client.on("disconnect", onDisconnect);

  if (client.connected) onConnect();
  else out.write(errorText(client.notConnectedMessage()) + "\n");

  await stop;

  client.off("event", onEvent);
  client.off("connect", onConnect);
  client.off("disconnect", onDisconnect);
  // Do not leave a subscription behind if we stopped mid-subscribe.
  await pending?.catch(() => undefined);
  if (client.connected) {
    await client.request({ cmd: "unsubscribe", topic: "events" }).catch(() => undefined);
  }
};
