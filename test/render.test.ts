import assert from "node:assert/strict";
import { describe, it } from "node:test";
import chalk from "chalk";
import { renderTree, renderTreeTable } from "../src/cli/render";
import { ConsumerSummary, TreeNode } from "../src/shared/protocol";

chalk.level = 0;

const fixture = (): TreeNode => ({
  summary: { kind: "worker", id: "41000", pid: 41000, createdAt: 0, died: false, routers: 1, webRtcServers: 1, cpu: 12.5, memory: 20971520 },
  children: [
    {
      summary: { kind: "webRtcServer", id: "server-123456789", workerId: "41000", createdAt: 0, transports: 1 },
      children: [],
    },
    {
      summary: { kind: "router", id: "router-123456789", workerId: "41000", createdAt: 0, transports: 1 },
      children: [{
        summary: { kind: "transport", id: "transport-123456789", routerId: "router-123456789", createdAt: 0, type: "webrtc", iceState: "completed", dtlsState: "connected", sctpState: "connected", remoteTuple: "127.0.0.1:5000 udp", producers: 1, consumers: 1, dataProducers: 1, dataConsumers: 1 },
        children: [
          {
            summary: { kind: "producer", id: "producer-123456789", transportId: "transport-123456789", createdAt: 0, mediaKind: "video", codec: "VP8", type: "simulcast", paused: false, scores: [10, 9, 8], consumers: 1 },
            children: [],
          },
          {
            summary: { kind: "consumer", id: "consumer-123456789", transportId: "transport-123456789", producerId: "producer-123456789", createdAt: 0, mediaKind: "video", codec: "VP8", type: "simulcast", paused: false, producerPaused: true, score: 10, producerScore: 0, currentLayers: "1/2", preferredLayers: "2/2" },
            children: [],
          },
          {
            summary: { kind: "dataProducer", id: "data-producer-123456789", transportId: "transport-123456789", createdAt: 0, type: "sctp", label: "chat", protocol: "json", dataConsumers: 1 },
            children: [],
          },
          {
            summary: { kind: "dataConsumer", id: "data-consumer-123456789", transportId: "transport-123456789", dataProducerId: "data-producer-123456789", createdAt: 0, type: "sctp", label: "chat", protocol: "json", paused: true, dataProducerPaused: true },
            children: [],
          },
        ],
      }],
    },
  ],
});

const leaves = (root: TreeNode) => root.children[1].children[0].children;

const rowFor = (text: string, id: string) => {
  const row = text.split("\n").find((line) => line.includes(id));
  assert.ok(row, `missing row for ${id}`);
  return row;
};

describe("tree table", () => {
  it("aligns mixed kinds in columns and retains branch structure and traversal order", () => {
    const text = renderTreeTable([fixture()]);
    for (const header of ["Object", "Type / Codec", "State", "Score", "Details"]) assert.ok(text.includes(header));
    for (const label of ["worker 41000", "├─ webRtcServer server-1", "└─ router router-1", "   └─ transport transpor", "      ├─ producer producer", "      └─ dataConsumer data-con"]) {
      assert.ok(text.includes(label), label);
    }
    assert.ok(text.indexOf("worker 41000") < text.indexOf("webRtcServer"));
    assert.ok(text.indexOf("webRtcServer") < text.indexOf("router router-1"));
    assert.ok(text.indexOf("router router-1") < text.indexOf("transport transpor"));
    assert.ok(text.indexOf("producer producer") < text.indexOf("consumer consumer"));
    assert.doesNotMatch(text, /\x1b\[/, "NO_COLOR/chalk level 0 is respected");
  });

  it("shows transport health, CPU, memory, scores, layers and data channels", () => {
    const text = renderTreeTable([fixture()]);
    assert.match(rowFor(text, "worker 41000"), /running.*cpu 12\.5%.*rss 20\.0 MB/);
    assert.match(rowFor(text, "transport transpor"), /webrtc.*connected.*127\.0\.0\.1:5000 udp.*sctp connected/);
    assert.match(rowFor(text, "producer producer"), /video VP8.*active.*10 9 8.*simulcast.*1 consumer/);
    assert.match(rowFor(text, "consumer consumer"), /video VP8.*producer paused.*10\/0.*layers 1\/2.*want 2\/2.*← producer producer/);
    assert.match(rowFor(text, "dataProducer data-pro"), /sctp.*active.*"chat".*protocol json.*1 data consumer/);
    assert.match(rowFor(text, "dataConsumer data-con"), /sctp.*paused \(both\).*"chat".*← dataProducer data-pro/);
  });

  it("supports full object and reference ids for a subtree", () => {
    const router = fixture().children[1];
    const short = renderTreeTable([router]);
    assert.ok(!short.includes("producer-123456789"));
    const full = renderTreeTable([router], true);
    assert.ok(full.includes("router router-123456789"));
    assert.ok(full.includes("producer producer-123456789"));
    assert.ok(full.includes("← producer producer-123456789"));
    assert.ok(full.includes("← dataProducer data-producer-123456789"));
    assert.ok(!full.includes("worker 41000"), "subtree does not invent ancestors");
    assert.ok(!full.includes("└─ router"), "subtree root is not indented");
  });

  it("handles multiple workers and an empty tree", () => {
    const second: TreeNode = {
      summary: { kind: "worker", id: "42000", pid: 42000, createdAt: 0, died: true, routers: 0, webRtcServers: 0 },
      children: [],
    };
    const text = renderTreeTable([fixture(), second]);
    assert.match(rowFor(text, "worker 42000"), /died.*cpu -.*rss -/);
    assert.ok(text.indexOf("worker 42000") > text.indexOf("dataConsumer"));
    assert.equal(renderTreeTable([]), renderTree([]));
  });

  it("shows missing scores and codecs without hiding paused state", () => {
    const root = fixture();
    const consumer = leaves(root)[1].summary as ConsumerSummary;
    consumer.codec = undefined;
    consumer.score = undefined;
    consumer.producerScore = undefined;
    consumer.currentLayers = undefined;
    consumer.preferredLayers = undefined;
    const text = renderTreeTable([root]);
    assert.match(rowFor(text, "consumer consumer"), /video.*producer paused.*-\/-/);
    assert.doesNotMatch(text, /undefined|NaN/);
  });

  it("keeps normal tree output and colors available", () => {
    const root = fixture();
    const text = renderTree([root]);
    assert.ok(text.startsWith("worker 41000  cpu 12.5%  rss 20.0 MB\n├─ webRtcServer"));
    assert.ok(text.includes("   └─ transport transpor  webrtc  connected"));
    chalk.level = 1;
    try {
      const colored = renderTreeTable([root]);
      assert.match(colored, /\x1b\[95mworker/);
      assert.match(colored, /\x1b\[32mconnected/);
      assert.match(colored, /\x1b\[31m0/);
    } finally {
      chalk.level = 0;
    }
  });
});
