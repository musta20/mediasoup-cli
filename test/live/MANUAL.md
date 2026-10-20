# Manual testing with fake browser users

The installed official demo is beside this repository at `../mediasoup-demo`. Use Node.js 22+ and installed Google Chrome.

## Start the demo (terminal 1)

From `mediasoup-cli`:

```sh
MEDIASOUP_DEMO_DIR=../mediasoup-demo npm run demo:live
```

This builds the CLI, starts the demo server and app, attaches the observer before creating workers, and opens Alice and Bob in separate visible Chrome windows. Both users send synthetic camera and microphone streams; no physical devices are used. Leave this terminal running.

The startup output prints the observer port and the exact CLI connection command. Open that command in terminal 2, or use automatic port discovery from this repository:

```sh
node dist/index.js
```

You should see 2 workers, 2 WebRTC servers, 1 router, 5 transports, 4 media producers, 4 media consumers, 5 data producers and 6 data consumers. A short startup delay is normal.

## Commands inside the CLI (terminal 2)

Run one command at a time. Replace `WORKER_PID`, `ROUTER_ID`, `TRANSPORT_ID`, `PRODUCER_ID`, `CONSUMER_ID`, `DATA_PRODUCER_ID`, `DATA_CONSUMER_ID` and `PEER_ID` with actual values. `show` lists ids; `inspect` shows appData including peer ids. IDs also accept any unique prefix, usually the first 8 characters. Tab completes commands, kinds, flags and live ids.

### Help and overview

```text
help
help show
help watch
version
summary
top
```

Press q, Esc, Enter or Ctrl+C to stop a watch/top and return to the CLI prompt.

### List every object kind

```text
show workers
show webrtcservers
show routers
show transports
show producers
show consumers
show dataproducers
show dataconsumers
```

Singular kinds work too. `show producer PRODUCER_ID` opens the inspection view.

### Hierarchy, details, statistics and dumps

```text
tree
tree --full
tree --table
tree --table --full
tree --table --routerId=ROUTER_ID
tree ROUTER_ID
tree TRANSPORT_ID
inspect WORKER_PID
inspect PRODUCER_ID
inspect CONSUMER_ID
stats WORKER_PID
stats TRANSPORT_ID
stats PRODUCER_ID
stats CONSUMER_ID
stats DATA_PRODUCER_ID
stats DATA_CONSUMER_ID
dump WORKER_PID
dump ROUTER_ID
dump TRANSPORT_ID
dump PRODUCER_ID
```

`stats` is available for workers, transports, producers, consumers and data producers/consumers. Routers and WebRTC servers do not expose these stats.

### Filters and search

```text
show routers --workerId=WORKER_PID
show webrtcservers --workerId=WORKER_PID
show transports --routerId=ROUTER_ID
show producers --transportId=TRANSPORT_ID
show consumers --producerId=PRODUCER_ID
show dataproducers --transportId=TRANSPORT_ID
show dataconsumers --routerId=ROUTER_ID
tree --workerId=WORKER_PID
tree --routerId=ROUTER_ID
find chat
find bot
find source=video
find peerId=PEER_ID
```

Filters match ancestors, so `show consumers --routerId=ROUTER_ID` works too. Browser display names are not stored on every mediasoup object; use the `peerId` from appData to locate a user.

### Events and live views

```text
events
events --limit=100
events --kind=producer --limit=100
watch events
watch events --kind=producer
watch summary
watch tree
watch tree --table
watch show transports
watch producers
watch consumers --routerId=ROUTER_ID
watch inspect PRODUCER_ID
watch stats PRODUCER_ID --interval=500ms
watch stats TRANSPORT_ID --interval=2s
watch find source=video
watch dump PRODUCER_ID
```

`top` is an alias for `watch summary`. `watch producers` is shorthand for `watch show producers`.

### JSON output

```text
summary --json
show producers --json
inspect PRODUCER_ID --json
stats PRODUCER_ID --json
events --kind=producer --json
watch producers --json --interval=1s
watch events --json
```

Watch JSON output is newline-delimited JSON: one complete JSON value per line.

### Worker logging

The live demo harness enables both server controls. Change worker logging from the CLI:

```text
logLevel debug
logTags ice dtls rtp
logTags score bwe --workerId=WORKER_PID
logLevel warn --workerId=WORKER_PID
logTags --clear
logLevel error
logLevel warn --json
```

Watch `.live-test-artifacts/server.log` for logs emitted by the demo's configured logger. Log tags replace the previous list. These settings apply to existing workers.

### JavaScript console

Enter `repl` in the CLI, or run `node dist/index.js repl` from another terminal. At `js>`:

```js
workers.size
await worker.dump()
[...producers.keys()]
const p = get("PRODUCER_ID") // replace with an actual id
await p.getStats()
await p.pause()
p.paused
await p.resume()
```

Use `inspect PRODUCER_ID` or `watch events` in another CLI to see those changes. `.exit`, Ctrl+D or Ctrl+C returns to the normal CLI. This is JavaScript in the demo server process, so its changes affect the running demo. In your own app, enable these features with `observer(mediasoup, { allowWorkerSettings: true, allowRepl: true })`.

### Shell controls and aliases

```text
clear
exit
```

| Command | Aliases |
| --- | --- |
| `show` | `ls`, `list` |
| `inspect` | `info`, `get` |
| `find` | `search` |
| `events` | `log` |
| `summary` | `status`, `overview` |
| `repl` | `js` |
| `help` | `?` |
| `clear` | `cls` |
| `exit` | `quit`, `q` |

### One-shot commands from bash

Outside the interactive CLI, prefix the command with `node dist/index.js`:

```sh
node dist/index.js tree
node dist/index.js show producers --json
node dist/index.js watch events --kind=producer
node dist/index.js dump PRODUCER_ID --json > producer.json
node dist/index.js --help
node dist/index.js --version
```

Connection options: `--host`, `--port`, `--token`. Output options: `--json`, `--no-color`; tree supports `--full` and `--table`; watch supports `--interval=500ms` or `--interval=2s`. For example, using the port printed by the demo:

```sh
node dist/index.js --host 127.0.0.1 --port OBSERVER_PORT summary
```

## Browser actions to test

Use `watch events --kind=producer` in one CLI and `watch tree` or `top` in another if you want both views.

1. Mute Alice's microphone: expect a producer `pause` event and `paused: true` in inspection. Unmute: expect `resume` and `paused: false`.
2. Disable Alice's camera: its video producer and corresponding consumer should disappear. Enable it: new objects and ids should appear.
3. Send chat from Alice: Bob should receive it. Use `show dataproducers`, `show dataconsumers` and their stats to inspect SCTP traffic.
4. Close Bob's browser window or leave the room: his producers/transports and Alice's consumers of his media should disappear.
5. Leave with Alice too: router, transport, producer, consumer and data object counts should return to zero; workers and WebRTC servers remain.
6. In a fullscreen watch, press q or Ctrl+C: the CLI prompt and terminal cursor should return normally.

## Stop

Exit the CLI with `exit`. In terminal 1, press Enter to close the demo's browser windows and stop its servers. Ctrl+C also stops it once the manual session is ready.

Logs are in `.live-test-artifacts/server.log` and `.live-test-artifacts/app.log`. Ports 4443, 5555 and 44444–44445 must be free. If the demo checkout is missing, follow the installation instructions in [README.md](README.md).
