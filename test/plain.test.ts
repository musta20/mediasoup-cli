import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { flatten, toPlain } from "../src/server/plain";

describe("toPlain", () => {
  it("survives cycles, functions, class instances and buffers", () => {
    class Peer {
      id = "p1";
      socket = { huge: true };
    }
    const appData: Record<string, unknown> = {
      peerId: "alice",
      peer: new Peer(),
      onClose: function onClose() {},
      buf: Buffer.from("abc"),
      when: new Date(0),
      nested: { list: [1, 2, { deep: "x" }] },
      big: 10n,
    };
    appData.self = appData;

    assert.deepEqual(toPlain(appData), {
      peerId: "alice",
      peer: "[Peer p1]",
      onClose: "[Function onClose]",
      buf: "[Buffer 3 bytes]",
      when: "1970-01-01T00:00:00.000Z",
      nested: { list: [1, 2, { deep: "x" }] },
      big: "10",
      self: "[Circular]",
    });
  });

  it("repeats shared (non-circular) references", () => {
    const shared = { a: 1 };
    assert.deepEqual(toPlain({ x: shared, y: shared }), { x: { a: 1 }, y: { a: 1 } });
  });

  it("limits depth", () => {
    assert.deepEqual(toPlain({ a: { b: { c: 1 } } }, 2), { a: { b: "[Object]" } });
  });

  it("produces JSON-serialisable output", () => {
    const value = toPlain({ m: new Map([["k", 1]]), s: new Set([1, 2]) });
    assert.deepEqual(JSON.parse(JSON.stringify(value)), { m: { k: 1 }, s: [1, 2] });
  });
});

describe("flatten", () => {
  it("lists primitive leaves with dotted paths", () => {
    assert.deepEqual(flatten({ a: 1, b: { c: "x", d: [true] } }, "appData"), [
      ["appData.a", "1"],
      ["appData.b.c", "x"],
      ["appData.b.d.0", "true"],
    ]);
  });
});
