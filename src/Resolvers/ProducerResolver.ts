import { Socket } from "socket.io";
import { getProducer, getProducerById } from "../modules/producerModules";
;

export default (socket: Socket) => {
  socket.on("getProducersByTransportId", (id: string, callback) => {
    callback(getProducerById(id));
  });

  socket.on("getProducers", (callback) => {
    callback(getProducer());
  });
};
