# mediasoup-cli

A live terminal monitor for [mediasoup](https://mediasoup.org) servers. Add one line to your app, then inspect workers, routers, transports, producers and consumers, follow lifecycle events, read RTP stats and search by `appData`, all from a second terminal.

```text
mediasoup ● › tree 6f87e30c
router 6f87e30c  8 transports
├─ transport c7b2d18f  webrtc  connected  ⇄ 203.0.113.7:51234 udp
│  ├─ consumer e69f43ff  audio opus  simple  active  score 10/10  ← producer 5fcedbb0
│  ├─ consumer e091e50d  video VP8  simulcast  paused  score 10/0  layers - (want 2/2)  ← producer 14eca64a
│  └─ dataConsumer 85f8eb01  sctp  "chat"  ← dataProducer f1239762
├─ transport 9055c313  plain  connected  ⇄ 127.0.0.1:38895 udp
│  └─ producer 7f65ddfa  audio opus  simple  score 10  → 1 consumer
└─ transport f071d75d  direct  -
   └─ dataProducer 8eba578d  direct  "chat"
```

## Features

- **Everything mediasoup creates**: workers, WebRTC servers, routers, transports, producers, consumers, data producers and data consumers, each with its state (ICE/DTLS, scores, layers, paused…).
- **`tree`** view of the whole hierarchy.
- **`inspect`** any object: parents, children, consumers of a producer, and its `appData`.
- **`stats`** (mediasoup `getStats()`) and **`dump`** (`dump()`) for any object.
- **`find peerId=alice`**: search ids, labels and `appData` to go from your user to mediasoup ids.
- **`events`**: a log of created/closed objects, pause/resume, ICE/DTLS/tuple changes and layer switches.
- **`summary` / `top`**: object counts, worker CPU and memory, and health warnings.
- **`watch <any command>`**: a live, full-screen refresh (q to quit), pushed as soon as something changes.
- **Short ids**: every id argument accepts a unique prefix (`inspect 1a2b`), and tab completion knows the live ids.
- **Scriptable**: `npx mediasoup-cli show consumers --json | jq …`, with NDJSON output under `watch`.
- **Safe to embed**: it never throws into your app, listens on `127.0.0.1` only by default, supports a token, and rejects browser connections.

## Install

```sh
npm install mediasoup-cli
# or
yarn add mediasoup-cli
```

Requires Node.js 18+ and mediasoup 3.x (tested with 3.12 and 3.28).

## Usage

Call `observer()` once, **before creating workers**:

```js
const mediasoup = require("mediasoup");
const mediasoupCli = require("mediasoup-cli");
// or: import { observer } from "mediasoup-cli";

mediasoupCli.observer(mediasoup);
```

Then, from your app's directory, in another terminal:

```sh
npx mediasoup-cli            # interactive shell (history, tab completion)
npx mediasoup-cli tree       # or run a single command and exit
```

The CLI finds the port automatically: the observer writes it into the installed package's `config.env`.

## Commands

| Command | What it does |
| --- | --- |
| `show <kind> [filters]` | Table of objects. Kinds: `workers` `webrtcservers` `routers` `transports` `producers` `consumers` `dataproducers` `dataconsumers` |
| `show <kind> <id>` | Same as `inspect <id>` |
| `tree [<id>] [filters] [--full]` | Hierarchy, from a given object or from every worker |
| `inspect <id>` | Details, path, children, consumers of a producer, `appData` |
| `stats <id>` | `getStats()` of a transport/producer/consumer/data producer/data consumer, or worker resource usage |
| `dump <id>` | Raw `dump()` of the object |
| `find <text>` / `find key=value` | Search ids, labels and `appData` |
| `events [--limit=50] [--kind=<kind>]` | Recent events |
| `summary` | Counts, worker CPU/memory and warnings |
| `watch <command> [--interval=1s]` | Live view of any command above, `watch events` follows the log |
| `top` | `watch summary` |
| `help [command]`, `version`, `clear`, `exit` | |

**Filters**: `--workerId=<pid>` `--routerId=<id>` `--transportId=<id>` `--producerId=<id>`. They match any ancestor, so `show consumers --routerId=7f3a` works.

**Output**: `--json` for machine-readable output (one JSON document per refresh with `watch`), `--no-color` (or `NO_COLOR=1`).

### Recipes

```sh
# Who is Alice and what does she send/receive?
find peerId=alice

# Is her audio actually flowing? (live bitrate, packet loss, score)
watch stats 7f65ddfa

# Who consumes this producer?
show consumers --producerId=7f65ddfa

# Why did this consumer disappear?
events --kind=consumer --limit=100

# Live dashboard
top

# CI / scripts
npx mediasoup-cli summary --json | jq '.warnings'
npx mediasoup-cli watch show workers --json --interval=5s >> workers.ndjson
```

The 1.x syntax still works: `show routers --workerId=123`, `watch transports --routerId=…`, `show transport routerid=…` and `show transports --transportId=… all`.

## Options

```js
const handle = mediasoupCli.observer(mediasoup, {
  port: 5462,          // 0 = random port. Also $MEDIA_SOUP_CLI_PORT. (`PORT` is still accepted)
  host: "127.0.0.1",   // interface to bind. Also $MEDIA_SOUP_CLI_HOST
  token: "s3cret",     // require the CLI to send this token. Also $MEDIA_SOUP_CLI_TOKEN
  maxEvents: 1000,     // size of the event log
});

await handle.ready;    // { host, port }, rejects if the port is taken (your app keeps running)
await handle.close();  // stop the server and detach every mediasoup listener
```

CLI connection flags: `--host`, `--port`, `--token`. Each falls back to its environment variable, then to `config.env`, then to the default.

### Remote servers and Docker

By default only processes on the same machine can connect. To monitor from elsewhere, bind to another interface and set a token:

```js
mediasoupCli.observer(mediasoup, { host: "0.0.0.0", token: process.env.MEDIA_SOUP_CLI_TOKEN });
```

```sh
npx mediasoup-cli --host 10.0.0.5 --token "$MEDIA_SOUP_CLI_TOKEN"
```

In a container you can also skip the network entirely with `docker exec -it <container> npx mediasoup-cli`.

> The observer only reads state, but `dump`, `stats` and `appData` can reveal internal details. Treat the port like an admin interface.

## Try it without an app

The repository ships a fake SFU that creates rooms and peers, sends fake RTP and keeps peers joining and leaving:

```sh
git clone https://github.com/musta20/mediasoup-cli && cd mediasoup-cli
npm install && npm install --no-save mediasoup
npm run demo          # terminal 1
npm start             # terminal 2
```

## Notes

- Only objects created after `observer()` is called are seen: call it before `createWorker()`.
- The view mirrors your app. An object you never close stays listed, which is often exactly the leak you were looking for.

## Upgrading from 1.x

- The server now binds to `127.0.0.1` instead of all interfaces. Pass `host: "0.0.0.0"` (ideally with a `token`) to keep remote access.
- `observer()` returns a handle (`ready`, `close()`) instead of `undefined`.
- Output is now tables with details instead of plain id lists. Use `--json` for scripts.

## Development

```sh
npm install
npm run build      # or: npm run watch
npm test           # node:test, no mediasoup needed
npm run demo       # needs: npm install --no-save mediasoup
```

## License

MIT
