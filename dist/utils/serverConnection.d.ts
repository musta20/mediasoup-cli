import { ClientToServerEvents, ServerToClientEvents } from "./types";
import { Socket } from "socket.io-client";
export declare let socket: Socket<ServerToClientEvents, ClientToServerEvents>;
export declare const connectSdk: () => Promise<void>;
