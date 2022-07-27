import { Socket } from "socket.io";
import {
  getAllTransport,
  getTransport,
  getTransportByRouterId,
} from "../modules/transportModules";

export default (socket: Socket) => {
  socket.on("getTansportsByRouterId", (id: string, callback) => {
    callback(getTransportByRouterId(id));
  });

  socket.on("getTansports", (callback) => {
    callback(getTransport());
  });

  socket.on("getAllTransportContent", (id: string, callback) => {
    callback(getAllTransport(id));
  });
};
