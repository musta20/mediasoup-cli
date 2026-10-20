# Real mediasoup and browser integration test

This opt-in suite runs the official [mediasoup-demo](https://github.com/versatica/mediasoup-demo) server and app with the local mediasoup-cli observer. Two isolated headless Chrome users join the same room with Chrome's synthetic camera and microphone. No physical camera or microphone is used.

Prerequisites: Node.js 22+ (required by the current demo), Google Chrome, OpenSSL and Python 3 (for terminal tests). The normal unit suite remains independent of these tools.

## Install

From this repository:

```sh
npm ci
git clone https://github.com/versatica/mediasoup-demo.git ../mediasoup-demo
# The revision used for the recorded run:
git -C ../mediasoup-demo checkout 899109e4046b45da1623a3e4c65a742040479439
npm ci --prefix ../mediasoup-demo/server
npm ci --legacy-peer-deps --prefix ../mediasoup-demo/app
```

The server installation includes the real mediasoup library and worker executable. Its prepare script compiles the demo server. Playwright is a development dependency of this repository; the test uses installed Google Chrome rather than downloading another browser.

## Run

```sh
MEDIASOUP_DEMO_DIR=../mediasoup-demo npm run test:live
```

Optional environment variables:

- `CHROME_PATH`: Chrome executable if Playwright cannot find the installed Chrome channel.
- `LIVE_TEST_ARTIFACTS`: output directory; defaults to `.live-test-artifacts/`.

The runner generates a short-lived self-signed localhost certificate, preloads the observer before workers are created, starts two workers and the demo app, and launches two browser contexts. Its demo config binds servers to localhost. Ports 4443, 5555 and 44444–44445 must be free. The observer chooses an available port. The runner stops its browsers and servers and restores `config.env` when it finishes.

The demo checkout is separate from this repository. The test supplies its own config and observer preloader without modifying the demo's tracked source.

## Manual mode

```sh
MEDIASOUP_DEMO_DIR=../mediasoup-demo npm run demo:live
```

This opens visible Alice and Bob Chrome windows with synthetic media and keeps the demo running until you press Enter. Use another terminal for the CLI. See [the complete manual testing command guide](MANUAL.md) for all commands and browser actions.

## Checks and evidence

- Worker and WebRTC server discovery.
- Two Opus and two VP8 simulcast producers, with a consumer for each.
- Actual received audio bytes, decoded remote video frames, and visible remote camera elements in both browsers.
- Connected ICE/DTLS transports and their WebRTC server links.
- CLI summary, tree, inspect by short id, search by peer id, producer filters, dumps, tables and nonzero RTP stats.
- NDJSON watch snapshots and streaming CLI events.
- Fullscreen watch in a real PTY: q and Ctrl+C exit cleanly and restore the screen and cursor.
- SCTP chat delivery between browsers.
- Microphone pause/resume in CLI state and events.
- Peer departure and complete room cleanup without stale objects.

Artifacts include `report.json`, screenshots of both users, CLI tables, terminal transcripts, and app/server/watch/event logs. They are ignored by git. This local test does not cover remote networks, TURN, physical devices or every supported mediasoup release.

## Verified run — 2026-10-20

All 12 live checks passed on Node.js 24.22.0, mediasoup 3.30.1, mediasoup-client 3.25.1 and Google Chrome 155.0.8059.84, using the demo revision above. The unit suite also passed all 72 tests after adding the harness.

With Alice and Bob connected, the observer reported 2 workers, 2 WebRTC servers, 1 router, 5 transports, 4 media producers, 4 media consumers, 5 data producers and 6 data consumers. After both left, all room object counts returned to zero, leaving the 2 workers and 2 WebRTC servers. The event subscription captured 102 records; there were no browser runtime errors. The harness stopped its browser and server processes successfully.
