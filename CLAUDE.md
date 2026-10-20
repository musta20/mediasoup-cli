# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mediasoup-cli is a live terminal monitor for mediasoup server applications. A small observer is embedded in the user's app and serves the state of every mediasoup object (workers, WebRTC servers, routers, transports, producers, consumers, data producers/consumers) over Socket.IO. The CLI connects to it to list, inspect, watch, search and read stats.

## Commands

```bash
npm run build        # tsc -> dist/
npm run watch        # tsc -w
npm test             # compiles src + test into .test-build/ and runs node:test
npm start            # node dist/index.js (the CLI)
npm run demo         # fake SFU on real mediasoup; needs `npm install --no-save mediasoup`
```

`npm test` does not need mediasoup: tests use `test/helpers/fakeMediasoup.ts`, which mimics mediasoup's observer events and child-first close order.

## Architecture

### Two processes

1. **Observer (library)**, `src/server/`, embedded in the user's app via `observer(mediasoup, options)` (package `main`). It listens on `127.0.0.1:5462` by default.
2. **CLI**, `src/index.ts` -> `src/cli/app.ts` (package `bin`), run with `npx mediasoup-cli`. It works as an interactive shell or runs a single command.

`src/shared/protocol.ts` is the contract between them: one `request` event with an ack callback (`Request` -> `Response`), plus server pushes `changed` (throttled) and `event` (only to sockets that subscribed to the `events` topic). Bump `PROTOCOL_VERSION` on incompatible changes.

### Server (`src/server/`)

- `index.ts`: `observer()`. It resolves options, creates its own `http` server (so `EADDRINUSE` is reported, not thrown), adds the Socket.IO token and Origin checks, and writes the bound port to `config.env` for CLI discovery. It returns `{ ready, close() }`. The http server is `unref()`'d.
- `tracker.ts`: subscribes to mediasoup observer events (`newworker` -> `newrouter` -> `newtransport` -> `newproducer`/...) and mirrors them into the registry. Every listener is wrapped in try/catch and registered in its entry's `cleanup` list so it is detached on close.
- `registry.ts`: `Map` of entries keyed by id (workers by pid) with parent/children links, per-kind sets, a producer -> consumers index, ancestor filters, unique-prefix id resolution (`resolve()`) and a bounded event log. `pipeToRouter()` reuses producer ids, so an entry's `key` can differ from its `id` (`<id>@<transportId>`). Always remove entries by object, never by id. Keep request handling linear: no per-object scans of the whole registry.
- `describe.ts`: turns live objects into plain summaries. Duck-typed on purpose, so it works across mediasoup 3.x versions (e.g. `transportType()` falls back to the class name before 3.15). `UsageSampler` computes worker CPU %.
- `handlers.ts`: `RequestHandler`, pure request logic (list/tree/inspect/stats/dump/find/events/summary/ids), easy to unit test.
- `repl.ts`: opt-in native Node REPL per socket, with live object lookup/collections, separate output/prompt events and cleanup on disconnect. This runs trusted code with host privileges; it is not a sandbox.
- `plain.ts`: `toPlain()` makes `appData`/dumps safe to send (cycles, class instances, depth). `flatten()` is used by `find`.

Hard rules for server code: never throw into the host app, never keep its process alive (the http server, accepted sockets, engine.io heartbeats and timeouts are all `unref()`'d), and never import `mediasoup` (the user passes the module in, and types are structural).

### CLI (`src/cli/`)

- `args.ts`: tokenizer and flag parser (case-insensitive flags, `--a=b` and `--a b`, the 1.x `routerid=X` form), plus `parseKind` and `parseDuration`.
- `commands.ts`: command definitions. Each `run()` returns `{ data, text }`, so `--json` and `watch` work for every command. `plan()` turns tokens into a `Plan` (run / watch / follow-events / help / ...) and keeps the 1.x syntax (`watch routers --workerId=1`).
- `execute.ts`: runs a `Plan`. Shared by the shell and one-shot mode.
- `shell.ts`: readline shell with persistent history (`~/.mediasoup_cli_history`), tab completion (`completer`, live ids via `IdCache`) and connection status. It closes readline while a watch owns the terminal and reopens it afterwards.
- `watch.ts`: `runWatch` (alt screen, flicker-free redraw, refresh on timer and on `changed`, stops on q/Esc/Enter/Ctrl+C) and `followEvents`.
- `repl.ts` in the CLI: local readline with remote JavaScript evaluation/completion; `.exit` or Ctrl+D/Ctrl+C hands input back to the shell.
- `render.ts` / `format.ts`: tables (cli-table3), tree, stats grid, inspect, colors (chalk 4, CommonJS).
- `client.ts`: Socket.IO client with `request()` timeouts and friendly connection/auth errors. `sanitize()` escapes control characters in everything received, because labels and `appData` come from remote peers.

### Configuration

- Observer options: `port` (or legacy `PORT`), `host`, `token`, `maxEvents`, `allowWorkerSettings`, `allowRepl`. Both control flags default false and are checked server-side. Env: `MEDIA_SOUP_CLI_PORT`, `MEDIA_SOUP_CLI_HOST`, `MEDIA_SOUP_CLI_TOKEN`.
- CLI resolution order: flags (`--port/--host/--token`) > env > `config.env` (written by the observer into the installed package root) > defaults.

### Command structure

`show <kind> [<id>] [filters]`, `tree`, `inspect <id>`, `stats <id>`, `dump <id>`, `find <text|key=value>`, `events`, `summary`, `watch <command>`, `top`, `help`, `version`, `clear`, `exit`. Filters: `--workerId --routerId --transportId --producerId`, which match any ancestor. Ids accept unique prefixes.

## Usage

```javascript
const mediasoup = require("mediasoup");
require("mediasoup-cli").observer(mediasoup); // before createWorker()
```

```bash
npx mediasoup-cli            # shell
npx mediasoup-cli tree       # one-shot
npx mediasoup-cli show consumers --json | jq .
```

## Dependencies

Runtime: `socket.io` (observer), `socket.io-client` (CLI), `chalk@4` (stay on 4: v5 is ESM-only), `cli-table3`. Dev: `typescript`, `@types/node`. `mediasoup` is an optional peer dependency and is never imported.

## Entry points

- Library: `dist/server/index.js` (`main`/`types`). `dist/bin/observerEventsLIstener.js` is a deprecated re-export kept for 1.x deep imports.
- CLI: `dist/index.js` (`bin`).
