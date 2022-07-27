import { Socket } from "socket.io";
import {
  getWebrtcServer,
  getWebRtcServerByWorkerId,
} from "../modules/webrtcServerModules";

export default (socket: Socket) => {
  socket.on("getwebrtcServersByWorkerId", (id: number, callback) => {
    callback(getWebRtcServerByWorkerId(id));
  });

  socket.on("getwebrtcServers", (callback) => {
    callback(getWebrtcServer());
  });
};
