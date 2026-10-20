# Changelog

## 2.1.0 — 2026-10-20

### Added

- `tree --table` aligns object types, connection states, scores and details in columns while preserving hierarchy. Works with filters, `--full`, `watch` and tab completion; JSON output retains its existing structure.
- Opt-in worker logging commands: `logLevel` and `logTags`, all workers or `--workerId`, explicit `--clear`, JSON results, per-worker errors and settings events. Enable with `allowWorkerSettings: true`.
- Opt-in `repl` (`js`) with Node's native evaluator, top-level `await`, multiline input, completion and live mediasoup objects. Sessions are scoped to each connection, support `.exit` back to the CLI, and end on disconnect. Enable server-side JavaScript execution with `allowRepl: true`.

## 2.0.0 — 2026-10-20

A rewrite of both the observer and the CLI. The `observer(mediasoup, { PORT })` API and the 1.x command syntax keep working.

### Breaking

- The observer binds to `127.0.0.1` by default instead of every interface. Use `host: "0.0.0.0"` (and `token`) for remote access.
- `show` and `watch` print tables with details instead of bare id lists. Use `--json` for scripts.
- Node.js 18+ is required.

### Added

- Opt-in `npm run test:live`: official mediasoup-demo, two synthetic-camera Chrome users, RTP/SCTP checks, CLI commands, watch/events, PTY controls and lifecycle cleanup.

- Rich tables for every kind: ICE/DTLS state, tuples, codecs, scores, simulcast layers, paused state, children counts, age.
- `tree`, `inspect`, `stats`, `dump`, `find`, `events`, `summary` and `top` commands.
- `watch` for any command: full-screen refresh pushed on changes, `--interval`, stop with q/Esc/Enter/Ctrl+C. `watch events` follows the event log.
- Event log of lifecycle and state changes (pause/resume, ICE/DTLS/SCTP, tuples, layer changes, worker deaths).
- Worker CPU and memory, and health warnings (failed ICE, low scores, silent producers, busy workers).
- Unique id prefixes everywhere (`inspect 1a2b`) and filters that match any ancestor (`show consumers --routerId=…`), plus `--producerId`.
- One-shot mode (`npx mediasoup-cli tree`), `--json` output (NDJSON with `watch`), exit codes.
- Interactive shell: tab completion of commands, kinds, flags and live ids, persistent history (`~/.mediasoup_cli_history`), connection status in the prompt, automatic reconnection.
- Options `port`, `host`, `token`, `maxEvents`. CLI flags `--host`, `--port`, `--token`, `--no-color`.
- `observer()` returns `{ ready, close() }`, and TypeScript typings for the public API.
- Objects that `pipeToRouter()` creates under the same id as the original are tracked as separate objects.
- Strings from peers (data channel labels, `appData`) are stripped of terminal control sequences before printing.
- The observer warns when it listens beyond loopback without a token.
- `npm run demo`, a fake SFU to try the tool. A test suite and CI.

### Fixed

- Help and version commands work even when connection settings contain an invalid port.
- Plain data conversion and CLI sanitization preserve `__proto__` keys without changing object prototypes.
- The test runner passes explicit file paths so `npm test` works on Node.js 18 as well as newer releases.

- Closed producers, consumers, data producers and data consumers stayed listed under their transport forever.
- `watch workers` and `watch webrtcservers` never received updates, and `watch dataproducers` never streamed.
- Watch filters were global server state: one client's filter applied to every client and could never be cleared. Repeated `watch` calls stacked listeners and duplicated output.
- `show webrtcservers --workerId=…` never matched (it compared a string pid with a number).
- `show routers` and `show webrtcservers` computed their count but never printed it.
- `-v`/`-h` also printed "unknown command", and `exit` left the process hanging.
- The observer could crash the host app when the port was taken, when `config.env` was missing, or on out-of-order close events (`splice(-1)` removed the wrong item).
- `import x from "mediasoup-cli"` returned `undefined`, and the published typings were empty.
- Deep imports of `mediasoup/node/lib/*` types broke on mediasoup ≥ 3.15, whose `exports` map hides those paths.

### Removed

- Unused runtime dependencies: `class-validator`, `reflect-metadata`, `dotenv`, `typescript`, and the `@types/*` packages.
- `dist/` and `yarn.lock` from git. `dist/` is built by `npm run build` and on `prepare`.
