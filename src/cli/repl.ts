import readline from "node:readline";
import { ReplEvent, ServerInfo } from "../shared/protocol";
import { Client } from "./client";

/** Local line editing, with evaluation and completion in the server's Node REPL. */
export const runRepl = async (client: Client): Promise<void> => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("repl needs an interactive terminal; run mediasoup-cli repl in a terminal");
  }
  const info = await client.request<ServerInfo>({ cmd: "hello" });
  if (!info.capabilities?.repl) {
    throw new Error("JavaScript REPL is unavailable; update the observer and enable allowRepl: true");
  }
  process.stdout.write("JavaScript on the server · .exit or Ctrl+D/Ctrl+C returns · changes affect the running app\n");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    completer: (line, callback) => {
      client.request<[string[], string]>({ cmd: "replComplete", line })
        .then((result) => callback(null, result), () => callback(null, [[], line]));
    },
  });
  let finished = false;
  let readyForInput = false;
  let finish!: (err?: Error) => void;
  const done = new Promise<void>((resolve, reject) => {
    finish = (err) => {
      if (finished) return;
      finished = true;
      if (err) reject(err);
      else resolve();
    };
  });
  // A disconnect can happen while replStart is still awaiting its ack.
  void done.catch(() => undefined);
  const onEvent = (event: ReplEvent) => {
    if (finished) return;
    if (event.type === "closed") {
      finish();
    } else if (event.type === "prompt") {
      readyForInput = true;
      rl.setPrompt(event.prompt);
      rl.prompt(true);
    } else {
      if (readyForInput) {
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
      }
      process.stdout.write(event.text);
      if (readyForInput) rl.prompt(true);
    }
  };
  const onDisconnect = () => finish(new Error("REPL connection lost; run repl again for a new session"));
  client.on("repl", onEvent);
  client.on("disconnect", onDisconnect);
  rl.on("line", (line) => {
    readyForInput = false;
    client.request({ cmd: "replInput", line }).catch((err: Error) => finish(err));
  });
  rl.on("close", () => finish());
  rl.on("SIGINT", () => {
    process.stdout.write("\n");
    finish();
  });
  try {
    await client.request({ cmd: "replStart" });
    await done;
  } finally {
    finished = true;
    client.off("repl", onEvent);
    client.off("disconnect", onDisconnect);
    rl.close();
    if (client.connected) await client.request({ cmd: "replStop" }, 2000).catch(() => undefined);
  }
};
