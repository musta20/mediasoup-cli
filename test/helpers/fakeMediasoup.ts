import { randomUUID } from "crypto";
import { EventEmitter } from "events";

/**
 * Minimal stand-ins for mediasoup objects. They expose the same observer
 * events and close their children before themselves, like mediasoup does.
 */
abstract class FakeObject {
  id: string = randomUUID();
  readonly observer = new EventEmitter();
  closed = false;

  constructor(public appData: Record<string, unknown> = {}) {}

  protected abstract closeChildren(): void;

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.closeChildren();
    this.observer.emit("close");
  }

  async dump(): Promise<unknown> {
    return { id: this.id };
  }
}

export class FakeProducer extends FakeObject {
  paused = false;
  type = "simple";
  score = [{ encodingIdx: 0, ssrc: 1111, score: 10 }];
  rtpParameters: { codecs: Array<{ mimeType: string }> };

  constructor(readonly kind: "audio" | "video", appData?: Record<string, unknown>) {
    super(appData);
    this.rtpParameters = { codecs: [{ mimeType: kind === "audio" ? "audio/opus" : "video/VP8" }] };
  }

  protected closeChildren(): void {}

  pause(): void {
    this.paused = true;
    this.observer.emit("pause");
  }

  async getStats() {
    return [{ type: "inbound-rtp", ssrc: 1111, bitrate: 32000, byteCount: 4096 }];
  }
}

export class FakeConsumer extends FakeObject {
  paused = false;
  producerPaused = false;
  type = "simple";
  score = { score: 10, producerScore: 10, producerScores: [10] };
  rtpParameters: { codecs: Array<{ mimeType: string }> };

  constructor(readonly producerId: string, readonly kind: "audio" | "video", appData?: Record<string, unknown>) {
    super(appData);
    this.rtpParameters = { codecs: [{ mimeType: kind === "audio" ? "audio/opus" : "video/VP8" }] };
  }

  protected closeChildren(): void {}

  async getStats() {
    return [{ type: "outbound-rtp", bitrate: 31000 }];
  }
}

export class FakeDataProducer extends FakeObject {
  type = "sctp";
  protocol = "json";
  constructor(readonly label: string, appData?: Record<string, unknown>) {
    super(appData);
  }
  protected closeChildren(): void {}
}

export class FakeDataConsumer extends FakeObject {
  type = "sctp";
  protocol = "json";
  constructor(readonly dataProducerId: string, readonly label: string) {
    super();
  }
  protected closeChildren(): void {}
}

export class FakeTransport extends FakeObject {
  iceState = "new";
  dtlsState = "new";
  iceSelectedTuple?: Record<string, unknown>;
  readonly children = new Set<FakeObject>();

  constructor(readonly type: "webrtc" | "plain" | "direct", appData?: Record<string, unknown>) {
    super(appData);
  }

  protected closeChildren(): void {
    for (const child of this.children) child.close();
  }

  private adopt<T extends FakeObject>(child: T, event: string): T {
    this.children.add(child);
    child.observer.once("close", () => this.children.delete(child));
    this.observer.emit(event, child);
    return child;
  }

  /** Pass `id` to mimic pipeToRouter(), which reuses the original producer id. */
  produce(kind: "audio" | "video", appData?: Record<string, unknown>, id?: string) {
    const producer = new FakeProducer(kind, appData);
    if (id) producer.id = id;
    return this.adopt(producer, "newproducer");
  }

  consume(producer: FakeProducer, appData?: Record<string, unknown>) {
    return this.adopt(new FakeConsumer(producer.id, producer.kind, appData), "newconsumer");
  }

  produceData(label: string, appData?: Record<string, unknown>) {
    return this.adopt(new FakeDataProducer(label, appData), "newdataproducer");
  }

  consumeData(dataProducer: FakeDataProducer) {
    return this.adopt(new FakeDataConsumer(dataProducer.id, dataProducer.label), "newdataconsumer");
  }

  setIceState(state: string) {
    this.iceState = state;
    this.observer.emit("icestatechange", state);
  }

  async getStats() {
    return [{ type: this.type === "webrtc" ? "webrtc-transport" : "plain-rtp-transport", recvBitrate: 64000 }];
  }
}

export class FakeRouter extends FakeObject {
  readonly transports = new Set<FakeTransport>();

  protected closeChildren(): void {
    for (const t of this.transports) t.close();
  }

  createTransport(type: "webrtc" | "plain" | "direct", appData?: Record<string, unknown>) {
    const transport = new FakeTransport(type, appData);
    this.transports.add(transport);
    transport.observer.once("close", () => this.transports.delete(transport));
    this.observer.emit("newtransport", transport);
    return transport;
  }
}

export class FakeWebRtcServer extends FakeObject {
  protected closeChildren(): void {}
}

let nextPid = 40000;

export class FakeWorker extends FakeObject {
  readonly pid = nextPid++;
  died = false;
  readonly routers = new Set<FakeRouter>();
  readonly servers = new Set<FakeWebRtcServer>();

  protected closeChildren(): void {
    for (const r of this.routers) r.close();
    for (const s of this.servers) s.close();
  }

  createRouter(appData?: Record<string, unknown>) {
    const router = new FakeRouter(appData);
    this.routers.add(router);
    router.observer.once("close", () => this.routers.delete(router));
    this.observer.emit("newrouter", router);
    return router;
  }

  createWebRtcServer() {
    const server = new FakeWebRtcServer();
    this.servers.add(server);
    this.observer.emit("newwebrtcserver", server);
    return server;
  }

  async getResourceUsage() {
    return { ru_utime: 120, ru_stime: 30, ru_maxrss: 20480 };
  }

  async dump() {
    return { pid: this.pid, routerIds: [...this.routers].map((r) => r.id) };
  }
}

export const createFakeMediasoup = () => {
  const observer = new EventEmitter();
  return {
    version: "3.99.0-fake",
    observer,
    createWorker(appData?: Record<string, unknown>) {
      const worker = new FakeWorker(appData);
      observer.emit("newworker", worker);
      return worker;
    },
  };
};

/** A worker with one router, a send and a recv transport, audio flowing between them. */
export const buildScenario = (mediasoup: ReturnType<typeof createFakeMediasoup>) => {
  const worker = mediasoup.createWorker();
  const server = worker.createWebRtcServer();
  const router = worker.createRouter({ roomId: "room-1" });
  const send = router.createTransport("webrtc", { peerId: "alice", direction: "send" });
  const recv = router.createTransport("webrtc", { peerId: "bob", direction: "recv" });
  const producer = send.produce("audio", { peerId: "alice", source: "mic" });
  const consumer = recv.consume(producer, { peerId: "bob" });
  const direct = router.createTransport("direct");
  const chat = direct.produceData("chat");
  const chatConsumer = recv.consumeData(chat);
  return { worker, server, router, send, recv, producer, consumer, direct, chat, chatConsumer };
};
