import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { Client, sanitizeReplOutput } from "../src/cli/client";
import { plan } from "../src/cli/commands";
import { tokenize } from "../src/cli/args";
import { execute } from "../src/cli/execute";
import { observer, ObserverHandle, ObserverOptions } from "../src/server";
import { ReplEvent, Request, ServerInfo, WorkerSettingsResult } from "../src/shared/protocol";
import { buildScenario, createFakeMediasoup } from "./helpers/fakeMediasoup";

/** Collect one native REPL interaction through its next prompt or exit. */
const exchange = async (client: Client, request: Request) => {
  let text = "";
  let listener!: (event: ReplEvent) => void;
  let timer: NodeJS.Timeout;
  const result = new Promise<{ text: string; prompt?: string; closed?: boolean }>((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`REPL did not finish ${JSON.stringify(request)}: ${text}`)), 3000);
    listener = (event) => {
      if (event.type === "output") text += event.text;
      else resolve({ text, ...(event.type === "prompt" ? { prompt: event.prompt } : { closed: true }) });
    };
    client.on("repl", listener);
  });
  try {
    const [output] = await Promise.all([result, client.request(request)]);
    return output;
  } finally {
    clearTimeout(timer!);
    client.off("repl", listener);
  }
};

describe("optional server controls", () => {
  const handles: ObserverHandle[] = [];
  const clients: Client[] = [];

  afterEach(async () => {
    clients.splice(0).forEach((client) => client.close());
    await Promise.all(handles.splice(0).map((handle) => handle.close()));
  });

  const start = async (options: ObserverOptions = { allowWorkerSettings: true, allowRepl: true }) => {
    const mediasoup = createFakeMediasoup();
    const handle = observer(mediasoup, { port: 0, ...options });
    handles.push(handle);
    const target = { host: "127.0.0.1", port: (await handle.ready).port, token: options.token };
    const client = new Client(target);
    clients.push(client);
    await client.waitForConnection(2000);
    return { mediasoup, handle, client, target };
  };
  const line = (client: Client, code: string) => exchange(client, { cmd: "replInput", line: code });

  it("denies both controls by default, including direct wire requests", async () => {
    const { client, mediasoup } = await start({});
    const worker = mediasoup.createWorker();
    const info = await client.request<ServerInfo>({ cmd: "hello" });
    assert.deepEqual(info.capabilities, { workerSettings: false, repl: false });
    await assert.rejects(client.request({ cmd: "workerSettings", settings: { logLevel: "debug" } }), /allowWorkerSettings/);
    for (const request of [
      { cmd: "replStart" }, { cmd: "replInput", line: "process.pid" },
      { cmd: "replComplete", line: "worker." }, { cmd: "replStop" },
    ] as Request[]) {
      await assert.rejects(client.request(request), /allowRepl/);
    }
    assert.equal(worker.settingsUpdates.length, 0);
  });

  it("enables the controls separately and keeps token authentication", async () => {
    const { client, target } = await start({ allowWorkerSettings: true, token: "test-control-token" });
    assert.deepEqual((await client.request<ServerInfo>({ cmd: "hello" })).capabilities, { workerSettings: true, repl: false });
    await assert.rejects(client.request({ cmd: "replStart" }), /disabled/);
    const denied = new Client({ ...target, token: "wrong" });
    clients.push(denied);
    await assert.rejects(denied.waitForConnection(2000), /authentication failed/);
    const other = await start({ allowRepl: true });
    await exchange(other.client, { cmd: "replStart" });
    await assert.rejects(other.client.request({ cmd: "workerSettings", settings: { logLevel: "debug" } }), /disabled/);
  });

  it("updates all workers or a unique worker prefix and records successful changes", async () => {
    const { client, mediasoup } = await start();
    const first = mediasoup.createWorker();
    const second = mediasoup.createWorker();
    let result = await client.request<WorkerSettingsResult>({ cmd: "workerSettings", settings: { logLevel: "debug" } });
    assert.equal(result.workers.length, 2);
    assert.ok(result.workers.every((worker) => worker.ok));
    const uniquePrefix = String(first.pid); // Pids are already short; the resolver also accepts unique prefixes.
    result = await client.request({ cmd: "workerSettings", workerId: uniquePrefix, settings: { logTags: ["ice", "dtls", "ice"] } });
    assert.deepEqual(result.settings, { logTags: ["ice", "dtls"] });
    assert.deepEqual(first.logSettings, { logLevel: "debug", logTags: ["ice", "dtls"] });
    assert.deepEqual(second.logSettings, { logLevel: "debug", logTags: [] });
    await client.request({ cmd: "workerSettings", workerId: String(first.pid), settings: { logTags: [] } });
    assert.deepEqual(first.logSettings.logTags, []);
    const records = await client.request<Array<{ event: string }>>({ cmd: "events" });
    assert.equal(records.filter((record) => record.event === "settings").length, 4);
    assert.equal(mediasoup.createWorker().logSettings.logLevel, "error", "future workers use application settings");
  });

  it("validates settings and targets before changing any worker", async () => {
    const { client, mediasoup } = await start();
    const { worker, router } = buildScenario(mediasoup);
    for (const settings of [null, [], {}, { logLevel: "trace" }, { logTags: "ice" }, { logTags: ["bogus"] }, { rtcMinPort: 10 }]) {
      await assert.rejects(client.request({ cmd: "workerSettings", settings } as Request));
    }
    for (const workerId of ["", "missing", router.id]) {
      await assert.rejects(client.request({ cmd: "workerSettings", workerId, settings: { logLevel: "none" } }));
    }
    mediasoup.createWorker();
    await assert.rejects(client.request({
      cmd: "workerSettings", workerId: String(worker.pid).slice(0, 2), settings: { logLevel: "none" },
    }), /ambiguous/);
    assert.deepEqual(worker.settingsUpdates, []);
  });

  it("reports partial failure per worker and makes CLI execution fail after printing results", async () => {
    const { client, mediasoup } = await start();
    const first = mediasoup.createWorker();
    const second = mediasoup.createWorker();
    second.updateSettings = async () => { throw new Error("worker channel closed"); };
    const output: string[] = [];
    await assert.rejects(execute(plan(tokenize("logLevel warn --json")), {
      client, mode: "argv", print: (text) => output.push(text),
    }), /one or more workers/);
    const result = JSON.parse(output[0]) as WorkerSettingsResult;
    assert.deepEqual(result.workers, [
      { workerId: String(first.pid), ok: true },
      { workerId: String(second.pid), ok: false, error: "worker channel closed" },
    ]);
    assert.equal(first.logSettings.logLevel, "warn");
    assert.equal(second.logSettings.logLevel, "error");
  });

  it("reports no workers and rejects unsupported scopes instead of updating everyone", async () => {
    const { client, mediasoup } = await start();
    await assert.rejects(client.request({ cmd: "workerSettings", settings: { logLevel: "error" } }), /no workers/);
    const worker = mediasoup.createWorker();
    for (const command of ["logLevel debug --routerId=abc", "logLevel debug --workerId", "logTags ice --workerID=",
      "logTags --clear ice", "logTags", "logTags unknown", "logLevel debug extra", "logTags --clear=false"]) {
      await assert.rejects(execute(plan(tokenize(command)), { client, mode: "argv" }), command);
    }
    assert.equal(worker.settingsUpdates.length, 0);
  });

  it("runs native JavaScript, top-level await, declarations and multiline input", async () => {
    const { client, mediasoup } = await start();
    buildScenario(mediasoup);
    assert.equal((await exchange(client, { cmd: "replStart" })).prompt, "js> ");
    await line(client, "const count = await Promise.resolve(workers.size)");
    assert.match((await line(client, "count + 40")).text, /41/);
    assert.match((await line(client, "await worker.dump()")).text, /routerIds/);
    assert.match((await line(client, "({")).prompt!, /\.\.\./);
    assert.match((await line(client, 'name: "a quoted value",')).prompt!, /\.\.\./);
    const result = await line(client, "count })");
    assert.equal(result.prompt, "js> ");
    assert.match(result.text, /a quoted value/);
    assert.match(result.text, /count: 1/);
    const completions = await client.request<[string[], string]>({ cmd: "replComplete", line: "work" });
    assert.ok(completions[0].includes("workers"));
  });

  it("exposes live objects and disambiguated pipe copies, and observes REPL mutations", async () => {
    const { client, mediasoup } = await start();
    const s = buildScenario(mediasoup);
    const pipe = s.worker.createRouter().createTransport("plain");
    pipe.produce("audio", undefined, s.producer.id);
    await exchange(client, { cmd: "replStart" });
    assert.match((await line(client, "producers.size")).text, /2/);
    assert.match((await line(client, `producers.has("${s.producer.id}@${pipe.id}")`)).text, /true/);
    await line(client, `await get("${s.producer.id.slice(0, 8)}").pause()`);
    assert.equal(s.producer.paused, true);
    const worker2 = mediasoup.createWorker();
    assert.match((await line(client, "worker.pid")).text, new RegExp(String(worker2.pid)));
    worker2.close();
    assert.match((await line(client, "workers.size")).text, /1/);
    await line(client, `get("${s.producer.id}").close()`);
    const ids = await client.request<Array<{ id: string; kind: string }>>({ cmd: "ids" });
    assert.equal(ids.filter((entry) => entry.id === s.producer.id && entry.kind === "producer").length, 1);
  });

  it("contains sync/async JavaScript errors, preserves output layout and blocks terminal escapes", async () => {
    const { client } = await start();
    await exchange(client, { cmd: "replStart" });
    assert.match((await line(client, "throw new Error('test sync error')")).text, /test sync error/);
    assert.match((await line(client, "await Promise.reject(new Error('test await error'))")).text, /test await error/);
    const output = await line(client, String.raw`console.log("first\nsecond\t\x1b[2J")`);
    assert.match(output.text, /first\nsecond\t\\x1b\[2J/);
    assert.ok(!output.text.includes("\x1b"));
    assert.match((await line(client, "1 + 2")).text, /3/);
    assert.equal((await client.request<ServerInfo>({ cmd: "hello" })).pid, process.pid);
    assert.equal(sanitizeReplOutput("\r\x1b]52;c;x\x07\n\t"), "\\x0d\\x1b]52;c;x\\x07\n\t");
  });

  it("isolates variables per client, resets globals, and reopens a fresh session after exit", async () => {
    const { client, target, mediasoup } = await start();
    mediasoup.createWorker();
    const other = new Client(target);
    clients.push(other);
    await other.waitForConnection(2000);
    await exchange(client, { cmd: "replStart" });
    await exchange(other, { cmd: "replStart" });
    await line(client, "const onlyHere = 17; globalThis.onlyThisContext = true");
    assert.match((await line(other, "typeof onlyHere")).text, /undefined/);
    assert.equal((globalThis as Record<string, unknown>).onlyThisContext, undefined);
    assert.match((await line(client, ".clear")).text, /Clearing context/);
    assert.match((await line(client, "typeof onlyHere")).text, /undefined/);
    assert.match((await line(client, "workers.size")).text, /1/);
    assert.equal((await line(client, ".exit")).closed, true);
    await assert.rejects(client.request({ cmd: "replInput", line: "1" }), /no REPL session/);
    await exchange(client, { cmd: "replStart" });
    assert.match((await line(client, "get(worker.pid) === worker")).text, /true/);
    assert.equal((await exchange(client, { cmd: "replStop" })).closed, true);
  });

  it("rejects invalid input, does not replay sessions after reconnect, and leaves no connection listeners", async () => {
    const { client } = await start();
    await exchange(client, { cmd: "replStart" });
    await assert.rejects(client.request({ cmd: "replStart" }), /already open/);
    for (const input of ["1\n2", "x".repeat(65537), null]) {
      await assert.rejects(client.request({ cmd: "replInput", line: input } as Request), /one line/);
    }
    await line(client, "const lostOnDisconnect = true");
    client.socket.disconnect();
    const connected = new Promise<void>((resolve) => client.once("connect", resolve));
    client.socket.connect();
    await connected;
    await assert.rejects(client.request({ cmd: "replInput", line: "1" }), /no REPL session/);
    await exchange(client, { cmd: "replStart" });
    assert.match((await line(client, "typeof lostOnDisconnect")).text, /undefined/);
    assert.equal(client.listenerCount("repl"), 0);
  });

  it("discards late output when closing a session during an awaited operation", async () => {
    const { client } = await start();
    await exchange(client, { cmd: "replStart" });
    await client.request({
      cmd: "replInput",
      line: "await new Promise(resolve => setTimeout(() => resolve('old-session-result'), 100))",
    });
    await exchange(client, { cmd: "replStop" });
    await exchange(client, { cmd: "replStart" });
    const events: ReplEvent[] = [];
    const record = (event: ReplEvent) => events.push(event);
    client.on("repl", record);
    await new Promise((resolve) => setTimeout(resolve, 200));
    client.off("repl", record);
    assert.deepEqual(events, [], "a closed session must not write into the new REPL");
    assert.match((await line(client, "2 + 2")).text, /4/);
  });
});
