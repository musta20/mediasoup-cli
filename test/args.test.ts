import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseArgs, parseDuration, parseKind, tokenize } from "../src/cli/args";

describe("tokenize", () => {
  it("splits on whitespace and honours quotes", () => {
    assert.deepEqual(tokenize(`  find "peer one"  'x y' z `), ["find", "peer one", "x y", "z"]);
    assert.deepEqual(tokenize(`find ""`), ["find", ""]);
    assert.deepEqual(tokenize(""), []);
  });
});

describe("parseArgs", () => {
  it("parses --flag=value, --flag value and booleans", () => {
    const args = parseArgs(["show", "routers", "--workerId=123", "--json"]);
    assert.deepEqual(args.positionals, ["show", "routers"]);
    assert.deepEqual(args.flags, { workerId: "123", json: true });

    assert.deepEqual(parseArgs(["--routerId", "abc", "tree"]).flags, { routerId: "abc" });
  });

  it("is case-insensitive for flag names", () => {
    assert.deepEqual(parseArgs(["--WORKERID=1", "--transportid=t"]).flags, {
      workerId: "1",
      transportId: "t",
    });
  });

  it("accepts the 1.x README syntax without dashes", () => {
    const args = parseArgs(["show", "transport", "routerid=2546855"]);
    assert.deepEqual(args.positionals, ["show", "transport"]);
    assert.deepEqual(args.flags, { routerId: "2546855" });
  });

  it("keeps UUID values intact (1.x stripped anything but [A-Za-z0-9-])", () => {
    const id = "6f87e30c-2d2c-4f43-b1d6-a06d6841c672";
    assert.equal(parseArgs([`--routerId=${id}`]).flags.routerId, id);
  });

  it("does not take a flag as the value of another flag", () => {
    assert.deepEqual(parseArgs(["--routerId", "--json"]).flags, { routerId: true, json: true });
  });

  it("maps short flags", () => {
    assert.deepEqual(parseArgs(["-h", "-v", "-n", "2"]).flags, { help: true, version: true, interval: "2" });
  });
});

describe("parseKind", () => {
  it("accepts singular, plural, any case and dashed forms", () => {
    assert.equal(parseKind("workers"), "worker");
    assert.equal(parseKind("Router"), "router");
    assert.equal(parseKind("dataproducers"), "dataProducer");
    assert.equal(parseKind("data-consumer"), "dataConsumer");
    assert.equal(parseKind("webrtcservers"), "webRtcServer");
    assert.equal(parseKind("nope"), undefined);
    assert.equal(parseKind(undefined), undefined);
  });
});

describe("parseDuration", () => {
  it("parses ms, s and bare numbers", () => {
    assert.equal(parseDuration("500ms"), 500);
    assert.equal(parseDuration("2s"), 2000);
    assert.equal(parseDuration("1.5s"), 1500);
    assert.equal(parseDuration("2"), 2000, "small bare numbers are seconds, like watch -n 2");
    assert.equal(parseDuration("750"), 750);
    assert.equal(parseDuration("10ms"), 100, "clamped to 100ms");
    assert.equal(parseDuration("soon"), undefined);
    assert.equal(parseDuration(true), undefined);
  });
});
