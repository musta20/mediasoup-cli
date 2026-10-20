import { createRequire } from "node:module";
import path from "node:path";
import type { REPLServer } from "node:repl";
import { PassThrough, Writable } from "node:stream";
import { inspect } from "node:util";
import { OBJECT_KINDS, ReplEvent } from "../shared/protocol";
import { Registry } from "./registry";

const MAX_LINE_LENGTH = 64 * 1024;

/** A native Node REPL per connection. This is trusted code execution, not a sandbox. */
export class ReplSession {
  private readonly input = new PassThrough();
  private readonly output: Writable;
  private readonly repl: REPLServer;
  private closed = false;

  constructor(
    registry: Registry,
    mediasoup: unknown,
    private readonly send: (event: ReplEvent) => void
  ) {
    this.output = new Writable({
      write: (chunk, _encoding, done) => {
        if (!this.closed) this.send({ type: "output", text: chunk.toString() });
        done();
      },
    });
    // Load Node's REPL only when explicitly enabled and opened.
    const { start } = require("node:repl") as typeof import("node:repl");
    this.repl = start({
      input: this.input,
      output: this.output,
      terminal: false,
      prompt: "",
      useGlobal: false,
      useColors: false,
      writer: (value) => inspect(value, {
        colors: false, depth: 4, maxArrayLength: 100, maxStringLength: 10000,
        customInspect: false, getters: false,
      }),
    });
    const populate = () => {
      const context = this.repl.context;
      context.mediasoup = mediasoup;
      context.require = createRequire(path.join(process.cwd(), "__mediasoup_cli_repl__.js"));
      context.get = (id: string | number) => {
        if (typeof id !== "string" && typeof id !== "number") throw new Error("get(id) needs an object id or worker pid");
        return registry.resolve(String(id)).object;
      };
      for (const kind of OBJECT_KINDS) {
        Object.defineProperty(context, `${kind}s`, {
          configurable: true,
          get: () => new Map(registry.all(kind).map((entry) => [entry.key, entry.object])),
        });
        Object.defineProperty(context, kind, {
          configurable: true,
          get: () => registry.all(kind).at(-1)?.object,
        });
      }
    };
    populate();
    this.repl.on("reset", populate);
    // displayPrompt() sets the normal/multiline prompt, then calls prompt().
    // Keep prompts separate from arbitrary output, for the client's readline.
    this.repl.prompt = () => {
      // Node versions use different continuation markers; keep the CLI stable.
      if (!this.closed) this.send({ type: "prompt", prompt: this.repl.getPrompt() === "js> " ? "js> " : "... " });
    };
    this.repl.setPrompt("js> ");
    this.repl.once("exit", () => this.close());
  }

  start(): void {
    this.repl.displayPrompt();
  }

  write(line: string): void {
    this.validateLine(line);
    this.input.write(`${line}\n`);
  }

  complete(line: string): Promise<[string[], string]> {
    this.validateLine(line);
    return new Promise((resolve, reject) => {
      this.repl.completer(line, (err, result) => err ? reject(err) : resolve(result ?? [[], line]));
    });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.repl.close();
    this.input.destroy();
    this.output.end();
    this.send({ type: "closed" });
  }

  private validateLine(line: string): void {
    if (this.closed) throw new Error("REPL session is closed; run repl again");
    if (typeof line !== "string" || line.length > MAX_LINE_LENGTH || /[\r\n]/.test(line)) {
      throw new Error("REPL input must be one line, at most 64 KiB");
    }
  }
}
