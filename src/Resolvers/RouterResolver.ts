import { Socket } from "socket.io";
import { getRouterByWorkerId, getRouters } from "../modules/routerModules";

export default (socket: Socket) => {
  socket.on("getRoutersByWorkerId", (id: string, callback) => {
    callback(getRouterByWorkerId(parseInt(id)));
  });

  socket.on("getRouters", (callback) => {
    callback(getRouters());
  });
};
