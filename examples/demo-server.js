/**
 * A small fake "SFU" to try mediasoup-cli without your own app.
 *
 *   npm install --no-save mediasoup   # mediasoup >= 3.14
 *   npm run build && npm run demo
 *
 * then, in another terminal:  npx mediasoup-cli
 *
 * It creates two workers with rooms and peers, sends fake Opus RTP so that
 * scores and bitrates are real, and keeps peers joining and leaving.
 */
const dgram = require("dgram");
const mediasoup = require("mediasoup");
const mediasoupCli = require("..");

const PORT = Number(process.env.MEDIA_SOUP_CLI_PORT) || 5462;
const NAMES = ["alice", "bob", "carol", "dave", "erin", "frank", "grace", "heidi"];

const mediaCodecs = [
  { kind: "audio", mimeType: "audio/opus", clockRate: 48000, channels: 2 },
  { kind: "video", mimeType: "video/VP8", clockRate: 90000 },
];

const audioRtpParameters = (ssrc) => ({
  codecs: [{ mimeType: "audio/opus", payloadType: 100, clockRate: 48000, channels: 2 }],
  encodings: [{ ssrc }],
});

const videoRtpParameters = (ssrc) => ({
  codecs: [{ mimeType: "video/VP8", payloadType: 101, clockRate: 90000 }],
  encodings: [
    { ssrc, scalabilityMode: "L1T3" },
    { ssrc: ssrc + 1, scalabilityMode: "L1T3" },
    { ssrc: ssrc + 2, scalabilityMode: "L1T3" },
  ],
});

/** Send fake Opus packets (50 per second) to a comedia PlainTransport. */
const sendFakeAudio = (port, ssrc) => {
  const socket = dgram.createSocket("udp4");
  // Random starting points, like real senders.
  let seq = Math.floor(Math.random() * 0xffff);
  let timestamp = Math.floor(Math.random() * 0xffffffff);
  const timer = setInterval(() => {
    const packet = Buffer.alloc(12 + 80);
    packet[0] = 0x80; // RTP v2
    packet[1] = 100; // payload type
    packet.writeUInt16BE(seq++ & 0xffff, 2);
    packet.writeUInt32BE((timestamp += 960) >>> 0, 4);
    packet.writeUInt32BE(ssrc, 8);
    packet[12] = 0xfc; // Opus TOC byte
    socket.send(packet, port, "127.0.0.1", () => undefined);
  }, 20);
  return () => {
    clearInterval(timer);
    socket.close();
  };
};

let nextSsrc = 1000;

async function joinPeer(room, name) {
  const { router, webRtcServer } = room;
  const appData = { roomId: room.id, peerId: name, displayName: name[0].toUpperCase() + name.slice(1) };

  const send = await router.createWebRtcTransport(
    webRtcServer
      ? { webRtcServer, appData: { ...appData, direction: "send" } }
      : { listenInfos: [{ protocol: "udp", ip: "127.0.0.1" }], appData: { ...appData, direction: "send" } }
  );
  const recv = await router.createWebRtcTransport(
    webRtcServer
      ? { webRtcServer, enableSctp: true, appData: { ...appData, direction: "recv" } }
      : { listenInfos: [{ protocol: "udp", ip: "127.0.0.1" }], enableSctp: true, appData: { ...appData, direction: "recv" } }
  );

  // Microphone: a PlainTransport receiving our fake RTP.
  const mic = await router.createPlainTransport({
    listenInfo: { protocol: "udp", ip: "127.0.0.1" },
    rtcpMux: true,
    comedia: true,
    appData: { ...appData, source: "mic" },
  });
  const audioSsrc = nextSsrc++;
  const audio = await mic.produce({
    kind: "audio",
    rtpParameters: audioRtpParameters(audioSsrc),
    appData: { ...appData, source: "mic" },
  });
  const stopAudio = sendFakeAudio(mic.tuple.localPort, audioSsrc);

  // Camera: simulcast producer that never gets media (shows score "-").
  const video = await send.produce({
    kind: "video",
    rtpParameters: videoRtpParameters((nextSsrc += 3)),
    appData: { ...appData, source: "webcam" },
  });

  // Chat over a DirectTransport.
  const direct = await router.createDirectTransport({ appData });
  const chat = await direct.produceData({ label: "chat", protocol: "json", appData });

  const peer = { name, room, transports: [send, recv, mic, direct], audio, video, chat, recv, stopAudio };

  // Consume everybody else, and let everybody else consume us.
  for (const other of room.peers.values()) {
    await consume(peer, other);
    await consume(other, peer);
  }
  room.peers.set(name, peer);
  return peer;
}

async function consume(consumer, producerPeer) {
  const { router } = consumer.room;
  for (const producer of [producerPeer.audio, producerPeer.video]) {
    if (producer.closed || !router.canConsume({ producerId: producer.id, rtpCapabilities: router.rtpCapabilities })) {
      continue;
    }
    await consumer.recv.consume({
      producerId: producer.id,
      rtpCapabilities: router.rtpCapabilities,
      paused: producer.kind === "video",
      appData: { peerId: consumer.name, from: producerPeer.name },
    });
  }
  if (!producerPeer.chat.closed) {
    await consumer.recv.consumeData({
      dataProducerId: producerPeer.chat.id,
      appData: { peerId: consumer.name, from: producerPeer.name },
    });
  }
}

function leavePeer(peer) {
  peer.stopAudio();
  for (const transport of peer.transports) transport.close();
  peer.room.peers.delete(peer.name);
}

async function main() {
  const cli = mediasoupCli.observer(mediasoup, { port: PORT });
  const { port } = await cli.ready;

  const rooms = [];
  for (let w = 0; w < 2; w++) {
    const worker = await mediasoup.createWorker({ logLevel: "warn", appData: { index: w } });
    worker.on("died", () => process.exit(1));

    const webRtcServer =
      w === 0
        ? await worker.createWebRtcServer({
            listenInfos: [
              { protocol: "udp", ip: "127.0.0.1", port: 0 },
              { protocol: "tcp", ip: "127.0.0.1", port: 0 },
            ],
          })
        : undefined;

    for (let r = 0; r < 2; r++) {
      const id = `room-${w * 2 + r + 1}`;
      const router = await worker.createRouter({ mediaCodecs, appData: { roomId: id } });
      rooms.push({ id, router, webRtcServer, peers: new Map() });
    }
  }

  for (const [i, name] of NAMES.slice(0, 6).entries()) {
    await joinPeer(rooms[i % rooms.length], name);
  }

  console.log(`demo running with ${rooms.length} rooms on mediasoup ${mediasoup.version}`);
  console.log(`observer listening on 127.0.0.1:${port}, now run:  npx mediasoup-cli`);

  // Churn: peers leave and join, cameras pause and resume.
  setInterval(async () => {
    try {
      const room = rooms[Math.floor(Math.random() * rooms.length)];
      const peers = [...room.peers.values()];
      if (peers.length > 1 && Math.random() < 0.5) {
        leavePeer(peers[Math.floor(Math.random() * peers.length)]);
      } else {
        const free = NAMES.filter((n) => !rooms.some((r) => r.peers.has(n)));
        if (free.length) await joinPeer(room, free[0]);
      }
      for (const peer of room.peers.values()) {
        if (Math.random() < 0.3) await (peer.video.paused ? peer.video.resume() : peer.video.pause());
      }
    } catch (err) {
      console.error("demo churn error:", err.message);
    }
  }, 4000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
