import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import chalk from "chalk";
import { tokenize } from "../src/cli/args";
import { Client } from "../src/cli/client";
import { findCommand, helpText, plan } from "../src/cli/commands";
import { formatBitrate, formatBytes, formatDuration, shortId } from "../src/cli/format";
import { completer } from "../src/cli/shell";
import { observer, ObserverHandle } from "../src/server";
import { buildScenario, createFakeMediasoup } from "./helpers/fakeMediasoup";

chalk.level = 0;

const planOf = (line: string) => plan(tokenize(line));

describe("plan", () => {
  it("routes commands, aliases and flags", () => {
    const p = planOf("ls producers --transportId=abc --json");
    assert.equal(p.type, "run");
    if (p.type !== "run") return;
    assert.equal(p.command.name, "show");
    assert.deepEqual(p.args.positionals, ["producers"]);
    assert.equal(p.args.flags.transportId, "abc");
    assert.equal(p.json, true);
  });

  it("supports the 1.x `watch <kind> [filters]` syntax", () => {
    const p = planOf("watch routers --workerId=12");
    assert.equal(p.type, "watch");
    if (p.type !== "watch") return;
    assert.equal(p.command.name, "show");
    assert.deepEqual(p.args.positionals, ["routers"]);
    assert.equal(p.intervalMs, 1000);
  });

  it("plans watch with a custom interval, top and watch events", () => {
    const w = planOf("watch stats 1a2b --interval=2s");
    assert.equal(w.type === "watch" && w.intervalMs, 2000);
    assert.equal(w.type === "watch" && w.title, "stats 1a2b");

    const top = planOf("top");
    assert.equal(top.type === "watch" && top.command.name, "summary");

    const events = planOf("watch events --kind=consumers");
    assert.equal(events.type === "follow-events" && events.kind, "consumer");
  });

  it("handles shell built-ins and help", () => {
    assert.equal(planOf("exit").type, "exit");
    assert.equal(planOf("quit").type, "exit");
    assert.equal(planOf("").type, "noop");
    assert.deepEqual(planOf("help tree"), { type: "help", topic: "tree" });
    assert.deepEqual(planOf("tree --help"), { type: "help", topic: "tree" });
    assert.equal(planOf("-v").type, "version");
    assert.equal(planOf("--help").type, "help");
  });

  it("rejects bad input with usage errors", () => {
    assert.throws(() => planOf("frobnicate"), /unknown command/);
    assert.throws(() => planOf("watch"), /what should I watch/);
    assert.throws(() => planOf("watch events --kind=bogus"), /unknown kind/);
    assert.throws(() => planOf("watch tree --interval=soon"), /invalid interval/);
  });

  it("has help for every command", () => {
    for (const name of ["show", "tree", "inspect", "stats", "dump", "find", "events", "summary", "watch", "top"]) {
      assert.match(helpText(name), /Usage:/, name);
    }
    assert.match(helpText(undefined, "argv"), /--port/);
  });
});

describe("format", () => {
  it("formats numbers for humans", () => {
    assert.equal(formatBytes(1536), "1.5 KB");
    assert.equal(formatBytes(undefined), "-");
    assert.equal(formatBitrate(2_500_000), "2.50 Mbps");
    assert.equal(formatBitrate(64_000), "64.0 kbps");
    assert.equal(formatDuration(3_725_000), "1h 2m");
    assert.equal(formatDuration(65_000), "1m 5s");
    assert.equal(shortId("6f87e30c-2d2c-4f43-b1d6-a06d6841c672"), "6f87e30c");
    assert.equal(shortId("12345"), "12345");
  });
});

describe("completer", () => {
  const complete = completer({
    get: (kind) => (kind === "worker" ? ["101", "102"] : kind === "producer" ? ["abcd-1"] : ["abcd-1", "efgh-2"]),
  });

  it("completes commands, kinds, flags and ids", () => {
    assert.deepEqual(complete("tr"), [["tree "], "tr"]);
    assert.deepEqual(complete("show cons"), [["consumers "], "cons"]);
    assert.deepEqual(complete("show routers --work"), [["--workerId="], "--work"]);
    assert.deepEqual(complete("show routers --workerId=10"), [["--workerId=101", "--workerId=102"], "--workerId=10"]);
    assert.deepEqual(complete("inspect ef"), [["efgh-2 "], "ef"]);
    assert.deepEqual(complete("show producers "), [["abcd-1 "], ""]);
    assert.deepEqual(complete("watch st"), [["stats "], "st"]);
    assert.deepEqual(complete("watch tree --int"), [["--interval="], "--int"]);
    assert.deepEqual(complete("find "), [[], ""]);
  });
});

describe("commands against a server", () => {
  let handle: ObserverHandle;
  let client: Client;
  let scenario: ReturnType<typeof buildScenario>;

  before(async () => {
    const mediasoup = createFakeMediasoup();
    handle = observer(mediasoup, { port: 0 });
    const { port } = await handle.ready;
    scenario = buildScenario(mediasoup);
    client = new Client({ host: "127.0.0.1", port });
    await client.waitForConnection(2000);
  });

  after(async () => {
    client.close();
    await handle.close();
  });

  const run = async (line: string) => {
    const p = planOf(line);
    assert.equal(p.type, "run", line);
    if (p.type !== "run") throw new Error("not a run plan");
    return p.command.run({ client }, p.args);
  };

  it("show renders a table with a count", async () => {
    const { text, data } = await run("show producers");
    assert.match(text, /^1 producer\n/);
    assert.match(text, new RegExp(scenario.producer.id));
    assert.match(text, /opus/);
    assert.equal((data as unknown[]).length, 1);
  });

  it("show <kind> <id> inspects and checks the kind", async () => {
    const { text } = await run(`show producer ${scenario.producer.id.slice(0, 6)}`);
    assert.match(text, /appData/);
    await assert.rejects(run(`show router ${scenario.producer.id}`), /is a producer, not a router/);
  });

  it("legacy `show transports --transportId=<id> all` shows its content", async () => {
    const { text } = await run(`show transports --transportId=${scenario.recv.id} all`);
    assert.match(text, /consumers \(1\)/);
    assert.match(text, /dataConsumers|data consumers \(1\)/);
  });

  it("tree, stats, find, events and summary render", async () => {
    assert.match((await run("tree")).text, /└─ transport/);
    assert.match((await run(`stats ${scenario.producer.id}`)).text, /32\.0 kbps/);
    assert.match((await run("find peerId=bob")).text, /2 matches/);
    assert.match((await run("events --limit=2")).text, /created/);
    assert.match((await run("summary")).text, /no issues detected/);
    assert.match((await run("show workers")).text, /20\.0 MB/);
  });

  it("reports empty lists nicely", async () => {
    assert.equal((await run("show dataproducers --transportId=" + scenario.send.id)).text, "No data producers found.");
  });

  it("knows every server command", () => {
    for (const name of ["show", "ls", "tree", "inspect", "info", "stats", "dump", "find", "events", "summary", "status"]) {
      assert.ok(findCommand(name), name);
    }
  });
});
