import { Socket } from "socket.io";
import { getDataProducer, getDataProducerById } from "../modules/dataProducerModules";


export default (socket: Socket) => {
  socket.on("getDataProducersByTransportId", (id: string, callback) => {
    callback(getDataProducerById(id));
  });

  socket.on("getDataProducers", (callback) => {
    callback(getDataProducer());
  });
};
