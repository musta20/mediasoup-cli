import chalk from "chalk";
import fs from "fs";
import os from "os";
import path from "path";
import readline from "readline";
import { FILTER_KEYS, IdEntry, ObjectKind, ServerInfo } from "../shared/protocol";
import { canonicalFlag, KIND_WORDS, parseKind, tokenize } from "./args";
import { Client, formatTarget } from "./client";
import {
  allCommandNames,
  Command,
  COMMANDS,
  findCommand,
  plan,
  Plan,
  SHELL_COMMANDS,
} from "./commands";
import { describeServer, execute, formatError, protocolWarning } from "./execute";
import { dim, okText, warnText } from "./format";

const HISTORY_FILE = path.join(os.homedir(), ".mediasoup_cli_history");
const HISTORY_SIZE = 1000;

const loadHistory = (): string[] => {
  try {
    const lines = fs.readFileSync(HISTORY_FILE, "utf-8").split("\n").filter(Boolean);
    if (lines.length > HISTORY_SIZE * 2) {
      fs.writeFileSync(HISTORY_FILE, lines.slice(-HISTORY_SIZE).join("\n") + "\n");
    }
    // readline wants the most recent entry first.
    return lines.slice(-HISTORY_SIZE).reverse();
  } catch {
    return [];
  }
};

const appendHistory = (line: string) => {
  try {
    fs.appendFileSync(HISTORY_FILE, line + "\n");
  } catch {
    // History is a convenience only.
  }
};

const FLAG_KIND: Record<string, ObjectKind> = {
  workerId: "worker",
  routerId: "router",
  transportId: "transport",
  producerId: "producer",
};

/** Keeps the list of live ids around for tab completion. */
class IdCache {
  private ids: IdEntry[] = [];
  private timer?: NodeJS.Timeout;
  private last = 0;

  constructor(private readonly client: Client) {
    const refresh = () => this.schedule();
    client.on("connect", refresh);
    client.on("changed", refresh);
    if (client.connected) refresh();
  }

  get(kind?: ObjectKind): string[] {
    return this.ids.filter((e) => !kind || e.kind === kind).map((e) => e.id);
  }

  private schedule() {
    if (this.timer) return;
    const wait = Math.max(0, 1000 - (Date.now() - this.last));
    this.timer = setTimeout(async () => {
      this.timer = undefined;
      this.last = Date.now();
      try {
        this.ids = await this.client.request<IdEntry[]>({ cmd: "ids" });
      } catch {
        // Keep the previous list.
      }
    }, wait);
    this.timer.unref();
  }
}

const withSpace = (hits: string[]) =>
  hits.length === 1 && !hits[0].endsWith("=") ? [`${hits[0]} `] : hits;

export const completer = (ids: { get(kind?: ObjectKind): string[] }) =>
  (line: string): [string[], string] => {
    const endsWithSpace = line === "" || /\s$/.test(line);
    const words = tokenize(line);
    const current = endsWithSpace ? "" : words.pop() ?? "";
    const lowerCurrent = current.toLowerCase();
    const startsWith = (candidates: string[]) =>
      [...new Set(candidates)].filter((c) => c.toLowerCase().startsWith(lowerCurrent));

    let watching = false;
    if (words[0]?.toLowerCase() === "watch") {
      watching = true;
      words.shift();
    }

    const command: Partial<Command> | undefined =
      findCommand(words[0]) ??
      SHELL_COMMANDS.find((c) => c.name === words[0]?.toLowerCase()) ??
      (parseKind(words[0]) ? { complete: ["id"], flags: FILTER_KEYS.map((k) => `--${k}=`) } : undefined);

    if (current.startsWith("-")) {
      const eq = current.indexOf("=");
      if (eq > 0) {
        const flag = canonicalFlag(current.slice(0, eq).replace(/^-+/, ""));
        const prefix = current.slice(0, eq + 1);
        const values = flag === "kind" ? KIND_WORDS : FLAG_KIND[flag] ? ids.get(FLAG_KIND[flag]) : [];
        return [withSpace(startsWith(values.map((v) => prefix + v))), current];
      }
      const flags = [...(command?.flags ?? []), "--json", ...(watching ? ["--interval="] : [])];
      return [withSpace(startsWith(flags)), current];
    }

    if (words.length === 0) {
      const names = watching
        ? [...COMMANDS.filter((c) => c.watchable).map((c) => c.name), "events", ...KIND_WORDS]
        : allCommandNames().filter((n) => n.length > 1);
      return [withSpace(startsWith(names)), current];
    }

    if (!command?.complete) return [[], current];

    const positionals = words.slice(1).filter((w) => !w.startsWith("-"));
    const what = command.complete[positionals.length];

    let candidates: string[] = [];
    if (what === "kind") candidates = KIND_WORDS;
    if (what === "command") candidates = allCommandNames().filter((n) => n.length > 1);
    if (what === "id") {
      // `show producers <id>` only offers producer ids.
      const kind = command.name === "show" ? parseKind(positionals[0]) : parseKind(words[0]);
      candidates = ids.get(kind);
    }

    return [withSpace(startsWith(candidates)), current];
  };

/** Interactive shell with history, completion and live connection status. */
export const startShell = async (client: Client): Promise<void> => {
  const stdin = process.stdin;
  const stdout = process.stdout;
  const terminal = Boolean(stdin.isTTY && stdout.isTTY);
  const history = loadHistory();
  const ids = new IdCache(client);
  const queue: Array<string | null> = [];
  let wake: (() => void) | undefined;
  let rl: readline.Interface | undefined;
  let suspending = false;
  let ended = false;
  let busy = false;
  let lastSigint = 0;
  let waitingNoticeShown = false;

  const prompt = () =>
    `${chalk.bold("mediasoup")}${client.connected ? chalk.green(" ●") : chalk.red(" ○")} ${chalk.gray("›")} `;

  const push = (line: string | null) => {
    queue.push(line);
    wake?.();
  };

  const nextLine = async (): Promise<string | null> => {
    while (queue.length === 0) await new Promise<void>((resolve) => (wake = resolve));
    wake = undefined;
    return queue.shift() as string | null;
  };

  /** Print a notification without breaking the line being typed. */
  const notify = (message: string) => {
    if (!rl) return; // a watch screen is active, it shows the status itself
    if (terminal && !busy) {
      readline.clearLine(stdout, 0);
      readline.cursorTo(stdout, 0);
    }
    stdout.write(message + "\n");
    rl.setPrompt(prompt());
    if (!busy) rl.prompt(true);
  };

  const open = () => {
    rl = readline.createInterface({
      input: stdin,
      output: stdout,
      terminal,
      history,
      historySize: HISTORY_SIZE,
      removeHistoryDuplicates: true,
      completer: completer(ids),
    });
    rl.setPrompt(prompt());
    rl.on("line", push);
    rl.on("close", () => {
      rl = undefined;
      if (suspending) return;
      ended = true;
      push(null);
    });
    rl.on("SIGINT", () => {
      if (!rl) return;
      if (rl.line) {
        stdout.write("\n");
        rl.write(null, { ctrl: true, name: "u" });
        rl.prompt();
        return;
      }
      if (Date.now() - lastSigint < 2000) {
        stdout.write("\n");
        rl.close();
        return;
      }
      lastSigint = Date.now();
      stdout.write(`\n${dim("(press Ctrl+C again, Ctrl+D or type exit to quit)")}\n`);
      rl.prompt();
    });
  };

  const suspend = () => {
    suspending = true;
    rl?.close();
    suspending = false;
  };

  client.on("connect", async () => {
    waitingNoticeShown = false;
    try {
      const info = await client.request<ServerInfo>({ cmd: "hello" }, 3000);
      notify(okText(`connected to ${formatTarget(client.target)} · ${describeServer(info)}`));
      const warning = protocolWarning(info);
      if (warning) notify(warnText(warning));
    } catch (err) {
      notify(warnText(err instanceof Error ? err.message : String(err)));
    }
  });
  client.on("disconnect", () => {
    notify(chalk.red(`○ disconnected from ${formatTarget(client.target)}, reconnecting…`));
  });
  client.on("connect_error", () => {
    if (client.gaveUp) notify(formatError(client.lastError));
    else if (!waitingNoticeShown) {
      waitingNoticeShown = true;
      notify(dim(`waiting for ${formatTarget(client.target)}… start your app with mediasoupCli.observer(mediasoup)`));
    }
  });

  stdout.write(
    `${chalk.bold("mediasoup-cli")} ${dim("· type")} help ${dim("for commands, tab to complete, Ctrl+D to quit")}\n`
  );
  open();
  rl?.prompt();

  for (;;) {
    const line = await nextLine();
    if (line === null) break;

    const trimmed = line.trim();
    if (!trimmed) {
      rl?.prompt();
      continue;
    }
    if (terminal) appendHistory(trimmed);

    let planned: Plan;
    try {
      planned = plan(tokenize(trimmed));
    } catch (err) {
      stdout.write(formatError(err) + "\n");
      rl?.prompt();
      continue;
    }

    if (planned.type === "exit") break;

    // Commands piped in at startup should not race the connection.
    if (!stdin.isTTY && !client.connected && planned.type !== "help" && planned.type !== "clear") {
      await client.waitForConnection(3000).catch(() => undefined);
    }

    // The stop key reader needs stdin to itself whenever it is a TTY, even
    // when stdout is not (e.g. `mediasoup-cli | tee log`).
    const takesOverScreen = planned.type === "watch" || planned.type === "follow-events";
    if (takesOverScreen && stdin.isTTY) suspend();

    busy = true;
    try {
      await execute(planned, { client, mode: "shell" });
    } catch (err) {
      stdout.write(formatError(err) + "\n");
    } finally {
      busy = false;
    }

    if (!rl && !ended) open();
    rl?.setPrompt(prompt());
    rl?.prompt();
  }

  suspend();
  client.close();
};
