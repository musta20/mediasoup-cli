# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

mediasoup-cli is a CLI monitoring tool for mediasoup server applications. It provides real-time observation and logging of mediasoup objects (workers, routers, transports, producers, consumers, etc.) via a Socket.IO-based architecture.

## Build & Development Commands

```bash
# Build TypeScript to JavaScript
tsc

# Watch mode (rebuilds on file changes)
npm run watch

# Start the compiled CLI
npm start

# Run the CLI tool (after building)
npx mediasoup-cli
```

## Architecture

### Dual-Process Model

The tool operates as two separate processes:

1. **Server Process** ([src/bin/observerEventsLIstener.ts](src/bin/observerEventsLIstener.ts)): Embedded in the user's mediasoup application, listens to mediasoup observer events and serves data via Socket.IO on port 5462 (configurable)
2. **CLI Client** ([src/index.ts](src/index.ts)): Standalone CLI that connects to the server process to display and monitor mediasoup objects

### Key Components

**Store** ([src/bin/store.ts](src/bin/store.ts)): Central state management with arrays for workers, routers, transports, producers, consumers, etc. Maintains hierarchical relationships (workers → routers → transports → producers/consumers).

**Observer Event Listener** ([src/bin/observerEventsLIstener.ts](src/bin/observerEventsLIstener.ts)): Hooks into mediasoup's observer pattern to track lifecycle events (newworker, newrouter, newtransport, newproducer, etc.) and CLOSE events. Updates the store and broadcasts changes via Socket.IO.

**CLI Command Interface** ([src/cli/cmd.ts](src/cli/cmd.ts)): REPL-style interface that parses user commands via [mainResolver.ts](src/cli/CliResolvers/mainResolver.ts) and routes to appropriate resolvers.

**Resolvers**: Two types exist:
- Server-side ([src/Resolvers/](src/Resolvers/)): Socket.IO event handlers that respond to CLI requests
- Client-side ([src/cli/CliResolvers/](src/cli/CliResolvers/)): Parse CLI commands and send Socket.IO requests

**Live Loggers** ([src/utils/liveLogger.ts](src/utils/liveLogger.ts)): Real-time event streaming for `watch` commands.

### Configuration

- Port configuration stored in [config.env](config.env) (MEDIA_SOUP_CLI_PORT, default 5462)
- Can be overridden when calling `observer()` with `{PORT: "custom_port"}`
- [src/config.ts](src/config.ts) loads and validates environment variables

### Command Structure

Commands follow the pattern: `[action] [object] [--arguments]`

- Actions: `show` (one-time display), `watch` (real-time monitoring)
- Objects: workers, routers, transports, producers, consumers, dataproducers, dataconsumers, webrtcservers
- Arguments: `--workerId=<id>`, `--routerId=<id>`, `--transportId=<id>`

## Usage Pattern

In a mediasoup application:
```javascript
const mediasoup = require("mediasoup");
const mediaSoupCli = require("mediasoup-cli");

mediaSoupCli.observer(mediasoup, { PORT: "5462" });
```

Then in a separate terminal:
```bash
npx mediasoup-cli
# mediaSoup-Cli: show workers
# mediaSoup-Cli: watch routers --workerId=12345
```

## Dependencies

- **mediasoup 3.x**: Peer dependency (required in host application)
- **socket.io/socket.io-client 4.5.1**: Client-server communication
- **chalk 4.1.2**: CLI colorization
- **cli-table3**: Table formatting for output
- **typescript 4.7.4**: Compilation

## Entry Points

- Main binary: [dist/index.js](dist/index.js) (built from [src/index.ts](src/index.ts))
- Server library: [dist/bin/observerEventsLIstener.js](dist/bin/observerEventsLIstener.js)
