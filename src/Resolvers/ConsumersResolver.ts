import { Socket } from "socket.io";
import { getConsumer, getConsumerById } from "../modules/consumerModule";

export default (socket: Socket) => {
  socket.on("getConsumersByTransportId", (id: string, callback) => {
    callback(getConsumerById(id));
  });

  socket.on("getConsumers", (callback) => {
    callback(getConsumer());
  });
};
