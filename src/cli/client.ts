import { EventEmitter } from "events";
import { io, Socket } from "socket.io-client";
import { Request, Response } from "../shared/protocol";

export interface Target {
  host: string;
  port: number;
  token?: string;
}

export const formatTarget = ({ host, port }: Target): string =>
  `${host.includes(":") ? `[${host}]` : host}:${port}`;

export class NotConnectedError extends Error {}

const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;

/**
 * Strings come from the app and, through data channel labels or appData, from
 * remote peers. Escape control characters so nobody can drive the operator's
 * terminal (retitle it, clear it, write the clipboard with OSC 52…).
 */
export const sanitize = (value: unknown): unknown => {
  if (typeof value === "string") {
    return value.replace(CONTROL_CHARS, (c) => `\\x${c.charCodeAt(0).toString(16).padStart(2, "0")}`);
  }
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [sanitize(key) as string, sanitize(item)])
    );
  }
  return value;
};

/**
 * Thin request/response wrapper around the Socket.IO connection.
 * Emits "connect", "disconnect", "connect_error" (Error), "changed" and "event".
 */
export class Client extends EventEmitter {
  readonly socket: Socket;
  lastError?: Error;

  constructor(readonly target: Target) {
    super();
    this.socket = io(`http://${formatTarget(target)}`, {
      transports: ["websocket"],
      auth: target.token ? { token: target.token } : undefined,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
      timeout: 3000,
    });

    this.socket.on("connect", () => {
      this.lastError = undefined;
      this.emit("connect");
    });
    this.socket.on("disconnect", (reason) => this.emit("disconnect", reason));
    this.socket.on("connect_error", (err) => {
      this.lastError = err.message === "unauthorized"
        ? new Error("authentication failed: wrong or missing token (--token / $MEDIA_SOUP_CLI_TOKEN)")
        : err;
      this.emit("connect_error", this.lastError);
    });
    this.socket.on("changed", () => this.emit("changed"));
    this.socket.on("event", (record) => this.emit("event", sanitize(record)));
  }

  get connected(): boolean {
    return this.socket.connected;
  }

  /** Socket.IO stops retrying after a middleware (auth) rejection. */
  get gaveUp(): boolean {
    return !this.socket.connected && !this.socket.active;
  }

  notConnectedMessage(): string {
    // "websocket error" is all Socket.IO says when nothing listens on the port.
    const message = this.lastError?.message;
    const reason = message && message !== "websocket error" ? ` (${message})` : "";
    return `not connected to ${formatTarget(this.target)}${reason}. Is your app running with mediasoupCli.observer(mediasoup)?`;
  }

  waitForConnection(timeoutMs: number): Promise<void> {
    if (this.connected) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        this.off("connect", onConnect);
        this.off("connect_error", onError);
      };
      const onConnect = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        if (this.gaveUp) {
          cleanup();
          reject(new NotConnectedError(this.notConnectedMessage()));
        }
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new NotConnectedError(this.notConnectedMessage()));
      }, timeoutMs);

      this.on("connect", onConnect);
      this.on("connect_error", onError);
    });
  }

  async request<T>(request: Request, timeoutMs = 10000): Promise<T> {
    if (!this.connected) throw new NotConnectedError(this.notConnectedMessage());

    let response: Response<T>;
    try {
      response = await this.socket.timeout(timeoutMs).emitWithAck("request", request);
    } catch {
      throw new Error(
        `the server did not answer "${request.cmd}" within ${timeoutMs} ms` +
          (request.cmd === "hello" ? " (is it running an older mediasoup-cli? upgrade it in your app)" : "")
      );
    }

    if (!response || typeof response !== "object") throw new Error("invalid response from server");
    if (!response.ok) throw new Error(String(sanitize(response.error)));
    return sanitize(response.data) as T;
  }

  close(): void {
    this.socket.close();
  }
}
