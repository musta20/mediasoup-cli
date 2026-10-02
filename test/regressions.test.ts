import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { after, describe, it } from "node:test";
import { Client, sanitize } from "../src/cli/client";
import { followEvents, truncateLine } from "../src/cli/watch";
import { observer, ObserverHandle } from "../src/server";
import { DataProducerSummary, EventRecord, InspectResult, ProducerSummary } from "../src/shared/protocol";
import { buildScenario, createFakeMediasoup } from "./helpers/fakeMediasoup";

const CLI = path.join(__dirname, "..", "src", "index.js");
const SERVER = path.join(__dirname, "..", "src", "server", "index.js");
const FAKE = path.join(__dirname, "helpers", "fakeMediasoup.js");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const run = (args: string[], input?: string) =>
  new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(process.execPath, [CLI, "--no-color", ...args], {
      env: { ...process.env, HOME: path.join(__dirname, "..") },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(input ?? "");
  });

describe("review regressions", () => {
  const handles: ObserverHandle[] = [];
  const clients: Client[] = [];

  after(async () => {
    clients.forEach((c) => c.close());
    await Promise.all(handles.map((h) => h.close()));
  });

  const start = async (options = {}) => {
    const mediasoup = createFakeMediasoup();
    const handle = observer(mediasoup, { port: 0, ...options });
    handles.push(handle);
    const { port, host } = await handle.ready;
    const client = new Client({ host: "127.0.0.1", port });
    clients.push(client);
    await client.waitForConnection(2000);
    return { mediasoup, handle, client, port, host };
  };

  it("tracks a piped producer that keeps the original id separately", async () => {
    const { mediasoup, client } = await start();
    const s = buildScenario(mediasoup);
    const router2 = s.worker.createRouter();
    const pipe = router2.createTransport("plain");
    const piped = pipe.produce("audio", undefined, s.producer.id);
    router2.createTransport("webrtc").consume(piped);

    let producers = await client.request<ProducerSummary[]>({ cmd: "list", kind: "producer" });
    assert.equal(producers.length, 2);
    assert.deepEqual(producers.map((p) => p.consumers), [1, 1], "each counts its own router's consumers");

    router2.close();
    await sleep(20);

    producers = await client.request<ProducerSummary[]>({ cmd: "list", kind: "producer" });
    assert.deepEqual(producers.map((p) => p.transportId), [s.send.id], "the original survives");

    s.producer.pause();
    await sleep(20);
    const inspect = await client.request<InspectResult>({ cmd: "inspect", id: s.send.id });
    assert.deepEqual(inspect.children.producer, [s.producer.id]);
    assert.equal((inspect.summary as { producers: number }).producers, 1);
  });

  it("treats an empty host as unset instead of binding every interface", async () => {
    const { host } = await start({ host: "" });
    assert.equal(host, "127.0.0.1");
  });

  it("warns when listening beyond loopback without a token", async () => {
    const warnings: string[] = [];
    const warn = console.warn;
    console.warn = (msg: string) => warnings.push(msg);
    try {
      const handle = observer(createFakeMediasoup(), { port: 0, host: "0.0.0.0" });
      handles.push(handle);
      await handle.ready;
    } finally {
      console.warn = warn;
    }
    assert.match(warnings.join("\n"), /without a token/);
  });

  it("neutralises terminal escape sequences coming from peers", async () => {
    const { mediasoup, client } = await start();
    const s = buildScenario(mediasoup);
    s.direct.produceData("\x1b]0;PWNED\x07\x1b[2Jchat", { note: "\x1b[31mred" });

    const list = await client.request<DataProducerSummary[]>({ cmd: "list", kind: "dataProducer" });
    const evil = list.find((d) => d.label.includes("PWNED"))!;
    assert.equal(evil.label, "\\x1b]0;PWNED\\x07\\x1b[2Jchat");
    assert.deepEqual(evil.appData, { note: "\\x1b[31mred" });
    assert.equal(sanitize("tab\there\u009b"), "tab\\x09here\\x9b");
  });

  it("does not keep the host process alive while a CLI is connected", async () => {
    const script = `
      const { observer } = require(${JSON.stringify(SERVER)});
      const { createFakeMediasoup } = require(${JSON.stringify(FAKE)});
      const handle = observer(createFakeMediasoup(), { port: 0 });
      handle.ready.then(({ port }) => console.log(port));
      setTimeout(() => {}, 600); // the app's own work
    `;
    const child = spawn(process.execPath, ["-e", script]);
    const port = await new Promise<number>((resolve) => child.stdout.once("data", (d) => resolve(Number(d))));
    const exited = new Promise<number>((resolve) => child.on("exit", () => resolve(Date.now())));

    const client = new Client({ host: "127.0.0.1", port });
    clients.push(client);
    await client.waitForConnection(2000);
    const connectedAt = Date.now();

    const exitedAt = await Promise.race([exited, sleep(4000).then(() => Infinity)]);
    child.kill();
    assert.ok(exitedAt - connectedAt < 2000, `host stayed alive for ${exitedAt - connectedAt} ms`);
  });

  it("keeps following events after the app restarts", async () => {
    const first = await start();
    const client = new Client({ host: "127.0.0.1", port: first.port });
    clients.push(client);
    await client.waitForConnection(2000);

    let output = "";
    let stop!: () => void;
    const following = followEvents({
      client,
      json: true,
      stop: new Promise<void>((resolve) => (stop = resolve)),
      write: (text) => (output += text),
    });

    await sleep(150);
    for (let i = 0; i < 5; i++) first.mediasoup.createWorker();
    await sleep(150);

    // Restart: a new app on the same port numbers its events from 1 again.
    const reconnected = new Promise((resolve) => client.once("connect", resolve));
    await first.handle.close();
    const mediasoup = createFakeMediasoup();
    const second = observer(mediasoup, { port: first.port });
    handles.push(second);
    await second.ready;
    await reconnected;
    await sleep(300);
    mediasoup.createWorker();
    await sleep(150);

    stop();
    await following;

    const created = output
      .split("\n")
      .filter((line) => line.startsWith("{"))
      .map((line) => JSON.parse(line) as EventRecord)
      .filter((e) => e.event === "created");
    assert.equal(created.length, 6, "5 events before the restart and 1 after");
  });

  it("runs commands piped into the shell once connected", async () => {
    const { mediasoup, port } = await start();
    mediasoup.createWorker();
    const result = await run(["--port", String(port)], "show workers\nexit\n");
    assert.match(result.stdout, /1 worker\n/);
    assert.equal(result.code, 0);
  });

  it("prints --version --json without an app", async () => {
    const result = await run(["--port", "1", "--version", "--json"]);
    assert.equal(result.code, 0);
    assert.match(JSON.parse(result.stdout).cli, /./);
  });
});

describe("truncateLine", () => {
  it("cuts visible characters and keeps colour codes", () => {
    assert.equal(truncateLine("abcdef", 10), "abcdef");
    assert.equal(truncateLine("abcdef", 4), "abc\x1b[0m…");
    assert.equal(truncateLine("\x1b[31mabcdef\x1b[39m", 4), "\x1b[31mabc\x1b[0m…");
    assert.equal(truncateLine("\x1b[31mab\x1b[39m", 2), "\x1b[31mab\x1b[39m", "escapes do not count");
  });
});
