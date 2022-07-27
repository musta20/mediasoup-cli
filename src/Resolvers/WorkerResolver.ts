import {workers } from "../bin/store";


import { Socket } from "socket.io";

export default (socket: Socket) => {


  socket.on("getWorkers", (callback) => {
    callback(
      workers.map((r) => {
        return r.worker.pid ;
      })
    )
  })


};
