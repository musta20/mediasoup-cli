import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { after, afterEach, beforeEach, describe, it } from "node:test";
import { io } from "socket.io-client";
import { Client } from "../src/cli/client";
import { observer, ObserverHandle } from "../src/server";
import {
  ConsumerSummary,
  EventRecord,
  FindMatch,
  InspectResult,
  ObjectSummary,
  ProducerSummary,
  ServerInfo,
  StatsResult,
  Summary,
  TransportSummary,
  TreeNode,
} from "../src/shared/protocol";
import { buildScenario, createFakeMediasoup } from "./helpers/fakeMediasoup";

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 20));

const once = <T = unknown>(emitter: EventEmitter, event: string, timeoutMs = 2000) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for "${event}"`)), timeoutMs);
    emitter.once(event, (value: T) => {
      clearTimeout(timer);
      resolve(value);
    });
  });

describe("observer server", () => {
  let mediasoup: ReturnType<typeof createFakeMediasoup>;
  let handle: ObserverHandle;
  let client: Client;
  let port: number;

  beforeEach(async () => {
    mediasoup = createFakeMediasoup();
    handle = observer(mediasoup, { port: 0 });
    port = (await handle.ready).port;
    client = new Client({ host: "127.0.0.1", port });
    await client.waitForConnection(2000);
  });

  afterEach(async () => {
    client.close();
    await handle.close();
  });

  it("answers hello with versions", async () => {
    const info = await client.request<ServerInfo>({ cmd: "hello" });
    assert.equal(info.protocol, 2);
    assert.equal(info.mediasoupVersion, "3.99.0-fake");
    assert.equal(info.pid, process.pid);
  });

  it("lists objects with details and filters by id prefix", async () => {
    const s = buildScenario(mediasoup);
    const producers = await client.request<ProducerSummary[]>({ cmd: "list", kind: "producer" });
    assert.equal(producers.length, 1);
    assert.deepEqual(
      { id: producers[0].id, kind: producers[0].mediaKind, codec: producers[0].codec, consumers: producers[0].consumers, scores: producers[0].scores },
      { id: s.producer.id, kind: "audio", codec: "opus", consumers: 1, scores: [10] }
    );
    assert.deepEqual(producers[0].appData, { peerId: "alice", source: "mic" });

    const transports = await client.request<TransportSummary[]>({
      cmd: "list",
      kind: "transport",
      filter: { routerId: s.router.id.slice(0, 6) },
    });
    assert.equal(transports.length, 3);

    const consumers = await client.request<ConsumerSummary[]>({
      cmd: "list",
      kind: "consumer",
      filter: { producerId: s.producer.id },
    });
    assert.deepEqual(consumers.map((c) => c.id), [s.consumer.id]);

    await assert.rejects(
      client.request({ cmd: "list", kind: "router", filter: { workerId: "999999" } }),
      /no worker found/
    );
  });

  it("forgets closed objects (1.x kept them in per-transport lists forever)", async () => {
    const s = buildScenario(mediasoup);
    s.producer.close();
    await nextTick();

    const transport = await client.request<InspectResult>({ cmd: "inspect", id: s.send.id });
    assert.equal(transport.children.producer, undefined);
    assert.equal((transport.summary as TransportSummary).producers, 0);

    s.worker.close();
    await nextTick();
    const all = await client.request<{ id: string }[]>({ cmd: "ids" });
    assert.deepEqual(all, []);
  });

  it("builds the tree in kind order", async () => {
    const s = buildScenario(mediasoup);
    const [root] = await client.request<TreeNode[]>({ cmd: "tree" });
    assert.equal(root.summary.id, String(s.worker.pid));
    assert.deepEqual(root.children.map((c) => c.summary.kind), ["webRtcServer", "router"]);
    const recv = root.children[1].children.find((c) => c.summary.id === s.recv.id)!;
    assert.deepEqual(recv.children.map((c) => c.summary.kind), ["consumer", "dataConsumer"]);

    const sub = await client.request<TreeNode[]>({ cmd: "tree", rootId: s.recv.id.slice(0, 8) });
    assert.equal(sub[0].summary.id, s.recv.id);
  });

  it("inspects with path, children and the consumers of a producer", async () => {
    const s = buildScenario(mediasoup);
    const result = await client.request<InspectResult>({ cmd: "inspect", id: s.producer.id.slice(0, 5) });
    assert.equal(result.summary.id, s.producer.id);
    assert.deepEqual(result.path.map((p) => p.kind), ["worker", "router", "transport"]);
    assert.deepEqual(result.children.consumer, [s.consumer.id]);
  });

  it("returns stats, worker resource usage and dumps", async () => {
    const s = buildScenario(mediasoup);
    const stats = await client.request<StatsResult>({ cmd: "stats", id: s.producer.id });
    assert.equal(stats.stats[0].bitrate, 32000);

    const usage = await client.request<StatsResult>({ cmd: "stats", id: String(s.worker.pid) });
    assert.equal(usage.stats[0].ru_maxrss, 20480);

    await assert.rejects(client.request({ cmd: "stats", id: s.router.id }), /not available for a router/);

    const dump = await client.request<{ routerIds: string[] }>({ cmd: "dump", id: String(s.worker.pid) });
    assert.deepEqual(dump.routerIds, [s.router.id]);
  });

  it("reports worker memory, and no CPU until there is a meaningful window", async () => {
    buildScenario(mediasoup);
    const [worker] = await client.request<Array<ObjectSummary & { cpu: number | null; memory: number }>>({
      cmd: "list",
      kind: "worker",
    });
    assert.equal(worker.memory, 20480 * 1024);
    assert.equal(worker.cpu, null);
  });

  it("finds objects by appData", async () => {
    const s = buildScenario(mediasoup);
    const byKey = await client.request<FindMatch[]>({ cmd: "find", query: "peerId=alice" });
    assert.deepEqual(
      byKey.map((m) => m.summary.id).sort(),
      [s.send.id, s.producer.id].sort()
    );

    const byText = await client.request<FindMatch[]>({ cmd: "find", query: "BOB" });
    assert.ok(byText.some((m) => m.summary.id === s.consumer.id));

    const byLabel = await client.request<FindMatch[]>({ cmd: "find", query: "chat" });
    assert.ok(byLabel.some((m) => m.summary.id === s.chat.id && m.field === "label"));
  });

  it("records lifecycle and state change events", async () => {
    const s = buildScenario(mediasoup);
    s.send.setIceState("connected");
    s.producer.pause();
    s.producer.close();
    await nextTick();

    const events = await client.request<EventRecord[]>({ cmd: "events", limit: 3 });
    assert.deepEqual(
      events.map((e) => [e.kind, e.event, e.detail]),
      [
        ["transport", "icestatechange", "connected"],
        ["producer", "pause", undefined],
        ["producer", "closed", undefined],
      ]
    );

    const onlyRouters = await client.request<EventRecord[]>({ cmd: "events", kind: "router" });
    assert.deepEqual(onlyRouters.map((e) => e.id), [s.router.id]);
  });

  it("pushes change notifications and subscribed events", async () => {
    await client.request({ cmd: "subscribe", topic: "events" });
    const changed = once(client, "changed");
    const event = once<EventRecord>(client, "event");
    mediasoup.createWorker();
    await changed;
    assert.equal((await event).event, "created");
  });

  it("summarises counts and health warnings", async () => {
    const s = buildScenario(mediasoup);
    s.recv.setIceState("failed");
    s.consumer.score = { score: 2, producerScore: 10, producerScores: [10] };
    s.producer.score = [{ encodingIdx: 0, ssrc: 1, score: 0 }];

    const summary = await client.request<Summary>({ cmd: "summary" });
    assert.equal(summary.counts.transport, 3);
    assert.equal(summary.counts.dataConsumer, 1);
    assert.deepEqual(summary.warnings, [
      "1 transport with ICE disconnected/failed",
      "1 consumer with score < 5",
      "1 producer not receiving media (score 0)",
    ]);
  });

  it("rejects unknown requests and kinds", async () => {
    await assert.rejects(client.request({ cmd: "nope" } as never), /unknown request/);
    await assert.rejects(client.request({ cmd: "list", kind: "bogus" } as never), /unknown object kind/);
  });

  it("returns the running handle when called twice", () => {
    const warn = console.warn;
    console.warn = () => undefined;
    try {
      assert.equal(observer(mediasoup, { port: 0 }), handle);
    } finally {
      console.warn = warn;
    }
  });

  it("detaches every mediasoup listener on close()", async () => {
    const s = buildScenario(mediasoup);
    await handle.close();
    // The fakes never listen to these events themselves.
    assert.equal(mediasoup.observer.listenerCount("newworker"), 0);
    assert.equal(s.worker.observer.listenerCount("newrouter"), 0);
    assert.equal(s.send.observer.listenerCount("newproducer"), 0);
    assert.equal(s.send.observer.listenerCount("icestatechange"), 0);
    assert.equal(s.producer.observer.listenerCount("pause"), 0);
  });
});

describe("observer robustness", () => {
  const warn = console.warn;
  const handles: ObserverHandle[] = [];
  after(async () => {
    console.warn = warn;
    await Promise.all(handles.map((h) => h.close()));
  });

  it("throws a helpful error when not given mediasoup", () => {
    assert.throws(() => observer({} as never), /expects the mediasoup module/);
  });

  it("does not crash the app when the port is taken", async () => {
    const warnings: string[] = [];
    console.warn = (msg: string) => warnings.push(msg);

    const first = observer(createFakeMediasoup(), { port: 0 });
    handles.push(first);
    const { port } = await first.ready;

    const second = observer(createFakeMediasoup(), { port });
    handles.push(second);
    await assert.rejects(second.ready, /EADDRINUSE/);
    assert.match(warnings.join("\n"), /already in use/);
    console.warn = warn;
  });

  it("survives malformed objects emitted by the observer", async () => {
    const warnings: unknown[] = [];
    console.warn = (...args: unknown[]) => warnings.push(args);
    const mediasoup = createFakeMediasoup();
    const handle = observer(mediasoup, { port: 0 });
    handles.push(handle);
    await handle.ready;

    assert.doesNotThrow(() => mediasoup.observer.emit("newworker", null));
    assert.doesNotThrow(() => mediasoup.observer.emit("newworker", { pid: 1 }));
    console.warn = warn;
  });

  it("requires the token when one is configured", async () => {
    const handle = observer(createFakeMediasoup(), { port: 0, token: "s3cret" });
    handles.push(handle);
    const { port } = await handle.ready;

    const wrong = new Client({ host: "127.0.0.1", port, token: "nope" });
    await assert.rejects(wrong.waitForConnection(2000), /authentication failed/);
    wrong.close();

    const right = new Client({ host: "127.0.0.1", port, token: "s3cret" });
    await right.waitForConnection(2000);
    assert.equal((await right.request<ServerInfo>({ cmd: "hello" })).protocol, 2);
    right.close();
  });

  it("refuses browser connections (Origin header)", async () => {
    const handle = observer(createFakeMediasoup(), { port: 0 });
    handles.push(handle);
    const { port } = await handle.ready;

    const socket = io(`http://127.0.0.1:${port}`, {
      transports: ["websocket"],
      reconnection: false,
      extraHeaders: { Origin: "https://evil.example" },
    });
    await once(socket as unknown as EventEmitter, "connect_error");
    assert.equal(socket.connected, false);
    socket.close();
  });
});
