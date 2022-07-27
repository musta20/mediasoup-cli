import { Socket } from "socket.io";
import {
  getDataConsumer,
  getDataConsumerById,
} from "../modules/dataConsumerModule";

export default (socket: Socket) => {
  socket.on("getDataConsumersByTransportId", (id: string, callback) => {
    callback(getDataConsumerById(id));
  });

  socket.on("getDataConsumers", (callback) => {
    callback(getDataConsumer());
  });
};
