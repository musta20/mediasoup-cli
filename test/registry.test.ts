import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Registry } from "../src/server/registry";

const build = () => {
  const registry = new Registry(5);
  registry.add("worker", "100", {});
  registry.add("router", "aaaa-1111", {}, "100");
  registry.add("router", "aaaa-2222", {}, "100");
  registry.add("transport", "bbbb-1111", {}, "aaaa-1111");
  registry.add("producer", "cccc-1111", {}, "bbbb-1111");
  registry.add("consumer", "dddd-1111", { producerId: "cccc-1111" }, "bbbb-1111");
  return registry;
};

describe("Registry", () => {
  it("tracks parents and children", () => {
    const registry = build();
    const router = registry.get("aaaa-1111");
    assert.ok(router);
    assert.equal(router.parent?.id, "100");
    assert.deepEqual(registry.childrenOf(router).map((e) => e.id), ["bbbb-1111"]);
    assert.deepEqual(
      registry.ancestors(registry.get("cccc-1111")!).map((e) => e.id),
      ["100", "aaaa-1111", "bbbb-1111"]
    );
  });

  it("filters by any ancestor", () => {
    const registry = build();
    assert.equal(registry.list("producer", { workerId: "100" }).length, 1);
    assert.equal(registry.list("producer", { routerId: "aaaa-2222" }).length, 0);
    assert.equal(registry.list("consumer", { transportId: "bbbb-1111" }).length, 1);
    assert.equal(registry.list("consumer", { producerId: "cccc-1111" }).length, 1);
    assert.equal(registry.list("consumer", { producerId: "other" }).length, 0);
  });

  it("removes an entry and every remaining descendant", () => {
    const registry = build();
    registry.remove(registry.get("aaaa-1111")!);
    assert.equal(registry.get("bbbb-1111"), undefined);
    assert.equal(registry.get("cccc-1111"), undefined);
    assert.equal(registry.childrenOf(registry.get("100")!).length, 1);
  });

  it("ignores entries it does not hold instead of deleting something else", () => {
    const registry = build();
    const stale = registry.get("cccc-1111")!;
    registry.remove(stale);
    const before = registry.all().length;
    registry.remove(stale);
    assert.equal(registry.all().length, before);
  });

  it("keeps objects that share an id (pipeToRouter) apart", () => {
    const registry = build();
    registry.add("router", "rr-2", {}, "100");
    registry.add("transport", "pipe-t", {}, "rr-2");
    const original = registry.get("cccc-1111")!;
    const pipe = registry.add("producer", "cccc-1111", { piped: true }, "pipe-t");
    registry.add("consumer", "dddd-2222", { producerId: "cccc-1111" }, "pipe-t");

    assert.notEqual(pipe, original);
    assert.equal(registry.all("producer").length, 2);
    assert.equal(registry.resolve("cccc-1111"), original, "the full id finds the original");
    assert.equal(registry.resolve("cccc"), original, "a shared id is not ambiguous");
    assert.deepEqual(registry.consumersOf(original).map((c) => c.id), ["dddd-1111"]);
    assert.deepEqual(registry.consumersOf(pipe).map((c) => c.id), ["dddd-2222"]);

    registry.remove(pipe);
    assert.equal(registry.get("cccc-1111"), original, "closing the pipe copy keeps the original");
    assert.equal(registry.all("producer").length, 1);
  });

  it("runs cleanup callbacks when an entry goes away", () => {
    const registry = build();
    let detached = 0;
    registry.get("cccc-1111")!.cleanup.push(() => detached++);
    registry.remove(registry.get("cccc-1111")!);
    assert.equal(detached, 1);
  });

  it("resolves exact ids and unique prefixes", () => {
    const registry = build();
    assert.equal(registry.resolve("cccc-1111").id, "cccc-1111");
    assert.equal(registry.resolve("ccc").id, "cccc-1111");
    assert.equal(registry.resolve("CCCC").id, "cccc-1111", "case-insensitive");
    assert.equal(registry.resolve("aaaa-2", "router").id, "aaaa-2222");
    assert.throws(() => registry.resolve("aaaa"), /ambiguous/);
    assert.throws(() => registry.resolve("zzz"), /no object found/);
    assert.throws(() => registry.resolve("cccc", "router"), /no router found/);
    assert.throws(() => registry.resolve(""), /missing/);
  });

  it("keeps a bounded event log", () => {
    const registry = build(); // 6 "created" events, max 5
    const events = registry.recentEvents(100);
    assert.equal(events.length, 5);
    assert.equal(events[events.length - 1].id, "dddd-1111");
    assert.ok(events.every((e, i) => i === 0 || e.seq > events[i - 1].seq));
    assert.equal(registry.recentEvents(100, "worker").length, 0, "the oldest (worker) event was evicted");
    assert.equal(registry.recentEvents(100, "router").length, 2);
  });

  it("emits change and event notifications", () => {
    const registry = new Registry();
    const seen: string[] = [];
    registry.on("change", () => seen.push("change"));
    registry.on("event", (e) => seen.push(e.event));
    registry.remove(registry.add("worker", "1", {}));
    assert.deepEqual(seen, ["created", "change", "closed", "change"]);
  });
});
