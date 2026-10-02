import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { codecName, formatTuple, transportType, UsageSampler } from "../src/server/describe";
import { Entry } from "../src/server/registry";

const workerEntry = (usage: { ru_utime: number; ru_stime: number }, ageMs: number): Entry => ({
  key: "1",
  kind: "worker",
  id: "1",
  object: { pid: 1, getResourceUsage: async () => ({ ...usage, ru_maxrss: 1024 }) },
  children: new Set(),
  createdAt: Date.now() - ageMs,
  cleanup: [],
});

describe("UsageSampler", () => {
  it("computes CPU % over the window since the previous sample", async () => {
    const sampler = new UsageSampler();
    // 1.5 s of CPU over the 10 s since the worker started.
    const result = await sampler.sample(workerEntry({ ru_utime: 1000, ru_stime: 500 }, 10_000));
    assert.ok(result.cpu !== null && Math.abs(result.cpu - 15) < 0.5, `cpu=${result.cpu}`);
    assert.equal(result.memory, 1024 * 1024);
  });

  it("returns nulls when the worker cannot report usage", async () => {
    const sampler = new UsageSampler();
    const entry = workerEntry({ ru_utime: 0, ru_stime: 0 }, 5000);
    entry.object.getResourceUsage = async () => {
      throw new Error("closed");
    };
    assert.deepEqual(await sampler.sample(entry), { cpu: null, memory: null });
  });
});

describe("describe helpers", () => {
  it("detects the transport type on old and new mediasoup", () => {
    assert.equal(transportType({ type: "webrtc" }), "webrtc");
    class PlainTransport {}
    class PipeTransportImpl {}
    assert.equal(transportType(new PlainTransport()), "plain");
    assert.equal(transportType(new PipeTransportImpl()), "pipe");
  });

  it("formats codecs and tuples", () => {
    assert.equal(codecName({ codecs: [{ mimeType: "video/VP8" }, { mimeType: "video/rtx" }] }), "VP8");
    assert.equal(codecName(undefined), undefined);
    const tuple = { localAddress: "10.0.0.1", localPort: 4000, remoteIp: "::1", remotePort: 5000, protocol: "udp" };
    assert.equal(formatTuple(tuple, "local"), "10.0.0.1:4000 udp");
    assert.equal(formatTuple(tuple, "remote"), "[::1]:5000 udp");
    assert.equal(formatTuple({ localIp: "1.2.3.4", localPort: 1, protocol: "tcp" }, "remote"), undefined);
  });
});
