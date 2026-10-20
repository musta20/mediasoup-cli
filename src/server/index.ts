import crypto from "crypto";
import http from "http";
import { Server, Socket } from "socket.io";
import { ENV, packageVersion, parsePort, writeConfigFile, readConfigFile } from "../shared/config";
import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  PROTOCOL_VERSION,
  Request,
  Response,
  ServerInfo,
} from "../shared/protocol";
import { RequestHandler } from "./handlers";
import { Registry } from "./registry";
import { ReplSession } from "./repl";
import { EmitterLike, track } from "./tracker";

export interface ObserverOptions {
  /** Port to listen on. Default: $MEDIA_SOUP_CLI_PORT or 5462. Use 0 for a random port. */
  port?: number | string;
  /** @deprecated Use `port`. Kept for backward compatibility. */
  PORT?: number | string | null;
  /**
   * Interface to bind. Default: $MEDIA_SOUP_CLI_HOST or "127.0.0.1" (local only).
   * Use "0.0.0.0" to accept remote CLIs, ideally together with `token`.
   */
  host?: string;
  /** Shared secret the CLI must present (--token or $MEDIA_SOUP_CLI_TOKEN). */
  token?: string;
  /** How many lifecycle events to keep for `events`. Default 1000. */
  maxEvents?: number;
  /** Allow logLevel/logTags to call worker.updateSettings(). Default false. */
  allowWorkerSettings?: boolean;
  /** Allow trusted CLI clients to run JavaScript in this process. Default false. */
  allowRepl?: boolean;
}

export interface ObserverHandle {
  /** Resolves once the server listens, rejects if it cannot (e.g. port in use). */
  readonly ready: Promise<{ host: string; port: number }>;
  /** Stop listening and detach every mediasoup listener. */
  close(): Promise<void>;
}

/** Anything exposing mediasoup's root `observer`, i.e. `require("mediasoup")`. */
export interface MediasoupLike {
  observer: EmitterLike;
  version?: string;
}

const active = new WeakMap<object, ObserverHandle>();

const tokensMatch = (expected: string, received: unknown): boolean => {
  if (typeof received !== "string") return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const isLoopback = (host: string) =>
  host === "localhost" || host === "::1" || host.startsWith("127.");

/**
 * A connected CLI must not keep the app alive either. The TCP socket is
 * unref'd by the http server; engine.io's heartbeat timers are private, so
 * this is best effort and silently does nothing if their names change.
 */
const unrefHeartbeat = (rawSocket: any) => {
  const unref = () => {
    rawSocket.pingIntervalTimer?.unref?.();
    rawSocket.pingTimeoutTimer?.unref?.();
  };
  for (const method of ["schedulePing", "resetPingTimeout"]) {
    const original = rawSocket[method];
    if (typeof original !== "function") continue;
    rawSocket[method] = function (this: unknown, ...args: unknown[]) {
      const result = original.apply(this, args);
      unref();
      return result;
    };
  }
  unref();
};

/** Throttle "changed" notifications so bursts of events cost one refresh. */
const throttle = (callback: () => void, ms: number) => {
  let timer: NodeJS.Timeout | undefined;
  let pending = false;
  const fn = () => {
    try {
      callback();
    } catch (err) {
      console.warn("[mediasoup-cli] internal error (your app is not affected):", err);
    }
  };
  return () => {
    if (timer) {
      pending = true;
      return;
    }
    fn();
    const tick = () => {
      if (pending) {
        pending = false;
        fn();
        timer = setTimeout(tick, ms);
        timer.unref();
      } else {
        timer = undefined;
      }
    };
    timer = setTimeout(tick, ms);
    timer.unref();
  };
};

/**
 * Start observing mediasoup and serve its state to `npx mediasoup-cli`.
 *
 * Call it once, before creating workers:
 *
 * ```js
 * const mediasoup = require("mediasoup");
 * require("mediasoup-cli").observer(mediasoup);
 * ```
 */
export function observer(mediasoup: MediasoupLike, options: ObserverOptions = {}): ObserverHandle {
  if (!mediasoup || typeof mediasoup.observer?.on !== "function") {
    throw new TypeError(
      'mediasoup-cli: observer() expects the mediasoup module, e.g. observer(require("mediasoup"))'
    );
  }

  const existing = active.get(mediasoup.observer);
  if (existing) {
    console.warn("[mediasoup-cli] observer() was already called, reusing the running server");
    return existing;
  }

  const port =
    parsePort(options.port) ??
    parsePort(options.PORT) ??
    parsePort(process.env[ENV.PORT]) ??
    DEFAULT_PORT;
  // Empty strings (e.g. `MEDIA_SOUP_CLI_HOST=` in an env file) mean "unset":
  // listen(port, "") would bind every interface.
  const host = options.host?.trim() || process.env[ENV.HOST]?.trim() || DEFAULT_HOST;
  const token = options.token || process.env[ENV.TOKEN] || undefined;

  if (!isLoopback(host) && !token) {
    console.warn(
      `[mediasoup-cli] the observer listens on ${host} without a token: anyone who can reach it can read your mediasoup state${options.allowRepl || options.allowWorkerSettings ? " and use enabled server controls" : ""}. Set the "token" option.`
    );
  }

  const registry = new Registry(options.maxEvents);
  const untrack = track(registry, mediasoup.observer);

  const info: ServerInfo = {
    protocol: PROTOCOL_VERSION,
    version: packageVersion(),
    mediasoupVersion: typeof mediasoup.version === "string" ? mediasoup.version : undefined,
    pid: process.pid,
    nodeVersion: process.version,
    startedAt: Date.now(),
    capabilities: {
      workerSettings: options.allowWorkerSettings === true,
      repl: options.allowRepl === true,
    },
  };
  const handler = new RequestHandler(registry, info);

  const httpServer = http.createServer((_req, res) => {
    res.writeHead(404).end();
  });
  httpServer.on("connection", (socket) => socket.unref());

  const io = new Server(httpServer, {
    serveClient: false,
    transports: ["websocket"],
    // Browsers always send an Origin header, the CLI never does. Rejecting
    // them prevents any web page from reading your server state.
    allowRequest: (req, callback) => callback(null, !req.headers.origin),
  });

  if (token) {
    io.use((socket, next) => {
      if (tokensMatch(token, socket.handshake.auth?.token)) next();
      else next(new Error("unauthorized"));
    });
  }

  io.engine.on("connection", unrefHeartbeat);

  io.on("connection", (socket: Socket) => {
    let repl: ReplSession | undefined;
    const closeRepl = () => {
      const previous = repl;
      repl = undefined;
      previous?.close();
    };
    socket.on("disconnect", closeRepl);
    socket.on("request", async (request: Request, ack?: (res: Response) => void) => {
      if (typeof ack !== "function") return;
      try {
        if (["replStart", "replInput", "replComplete", "replStop"].includes(request?.cmd)) {
          if (!info.capabilities?.repl) {
            throw new Error("JavaScript REPL is disabled; enable observer(mediasoup, { allowRepl: true })");
          }
          switch (request.cmd) {
            case "replStart":
              if (repl) throw new Error("a REPL session is already open on this connection");
              repl = new ReplSession(registry, mediasoup, (event) => {
                socket.emit("repl", event);
                if (event.type === "closed") repl = undefined;
              });
              repl.start();
              ack({ ok: true, data: null });
              return;
            case "replStop":
              closeRepl();
              ack({ ok: true, data: null });
              return;
            case "replInput":
            case "replComplete":
              if (!repl) throw new Error("no REPL session; run repl first");
              ack({
                ok: true,
                data: request.cmd === "replInput" ? (repl.write(request.line), null) : await repl.complete(request.line),
              });
              return;
          }
        }
        if (request?.cmd === "subscribe" || request?.cmd === "unsubscribe") {
          if (request.topic !== "events") throw new Error(`unknown topic "${request.topic}"`);
          if (request.cmd === "subscribe") await socket.join("events");
          else await socket.leave("events");
          ack({ ok: true, data: null });
          return;
        }
        ack({ ok: true, data: await handler.handle(request) });
      } catch (err) {
        ack({ ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    });
  });

  const notifyChange = throttle(() => io.emit("changed"), 200);
  const onChange = () => notifyChange();
  const onEvent = (record: unknown) => io.to("events").emit("event", record);
  registry.on("change", onChange);
  registry.on("event", onEvent);

  let listening = false;

  const ready = new Promise<{ host: string; port: number }>((resolve, reject) => {
    httpServer.on("error", (err: NodeJS.ErrnoException) => {
      if (listening) {
        // e.g. EMFILE on accept: keep serving, the next connection may work.
        console.warn(`[mediasoup-cli] observer server error: ${err.message}`);
        return;
      }
      const reason =
        err.code === "EADDRINUSE"
          ? `port ${port} is already in use, pass another one with observer(mediasoup, { port })`
          : err.message;
      console.warn(`[mediasoup-cli] could not start the observer server: ${reason}`);
      void handle.close();
      reject(err);
    });

    httpServer.listen(port, host, () => {
      listening = true;
      const address = httpServer.address();
      const actualPort = typeof address === "object" && address ? address.port : port;

      // Let `npx mediasoup-cli` from this project find us without flags.
      const connectHost = host === "0.0.0.0" || host === "::" ? DEFAULT_HOST : host;
      const saved = readConfigFile();
      const updates: Record<string, string> = { [ENV.PORT]: String(actualPort) };
      if (connectHost !== DEFAULT_HOST || saved[ENV.HOST] !== undefined) {
        updates[ENV.HOST] = connectHost;
      }
      if (Object.entries(updates).some(([key, value]) => saved[key] !== value)) {
        writeConfigFile(updates);
      }

      resolve({ host, port: actualPort });
    });

    // The monitor must never keep the host process alive on its own.
    httpServer.unref();
  });
  // Callers that never await `ready` must not get an unhandled rejection.
  ready.catch(() => undefined);

  let closing: Promise<void> | undefined;

  const handle: ObserverHandle = {
    ready,
    close: () => {
      closing ??= new Promise<void>((resolve) => {
        active.delete(mediasoup.observer);
        registry.off("change", onChange);
        registry.off("event", onEvent);
        untrack();
        io.close(() => resolve());
        if (!httpServer.listening) resolve();
      });
      return closing;
    },
  };

  active.set(mediasoup.observer, handle);
  return handle;
}

export default { observer };
