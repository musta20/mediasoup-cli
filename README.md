# mediasoup-cli

JavaScript CLI tool for monitoring mediasoup server applications.

## Features

- Display current workers, routers, transports, producers, consumers, etc.
- Real-time logging and monitoring of mediasoup objects
- WebRTC server monitoring
- Data producer/consumer monitoring

**Note**: This tool only reflects data based on your app - if you didn't close a router, it will still appear in the CLI.
**Note**: This tool requires mediasoup 3.x
## Installation

```sh
npm install mediasoup-cli
# or
yarn add mediasoup-cli
```

## Usage


```javascript
const mediasoup = require("mediasoup");
const mediaSoupCli = require("mediasoup-cli");
// or
import mediaSoupCli from "mediasoup-cli";

// Pass mediasoup instance to observer function
mediaSoupCli.observer(mediasoup);
```

### Custom Port Configuration

This tool uses Socket.IO on port 5462 by default. If this conflicts with your setup, you can specify a custom port:

```javascript
mediaSoupCli.observer(mediasoup, {
  PORT: "4568"
});
```

### Starting the CLI

Open a new terminal window in the same app root directory and start the CLI:

```sh
npx mediasoup-cli
```


## Commands

### Showing Current State

```sh
show workers                           # Display all current active workers
show routers                           # Display all current active routers
show transports --routerId=2546855     # Display transports for a specific router
show consumers --transportId=2546855   # Display consumers for a specific transport
show producers --transportId=2546855   # Display producers for a specific transport
show webrtcservers                     # Display all WebRTC servers
show dataproducers                     # Display all data producers
show dataconsumers                     # Display all data consumers
```

### Real-Time Monitoring

```sh
watch routers                          # Monitor routers in real-time
watch transports --routerId=2546855    # Monitor transports for a specific router
watch consumers --transportId=2546855  # Monitor consumers for a specific transport
watch producers --transportId=2546855  # Monitor producers for a specific transport
watch webrtcservers                    # Monitor WebRTC servers in real-time
```

## Command Syntax

```
[action] [object] [--arguments]
```

### Actions
- `show` - Display list of current objects
- `watch` - Monitor objects in real-time

### Arguments
- `--workerId=<id>` - Filter by worker ID (e.g., `show routers --workerId=565422`)
- `--routerId=<id>` - Filter by router ID (e.g., `show transports --routerId=565422`)
- `--transportId=<id>` - Filter by transport ID (e.g., `show consumers --transportId=123456`)

## Development

```sh
npm run build         # Build TypeScript
npm run watch         # Watch mode for development
npm run lint          # Run ESLint
npm run format        # Format code with Prettier
npm run clean         # Clean dist folder
```

## License

MIT

