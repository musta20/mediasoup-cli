
import { ClientToServerEvents, ServerToClientEvents } from "./types";
import { io, Socket } from "socket.io-client";
import confg from "../config"
 export let   socket: Socket<ServerToClientEvents, ClientToServerEvents> ;
 export const connectSdk = async () =>  {

const env  = confg()
    try{
    socket= io(`http://localhost:${env.MEDIA_SOUP_CLI_PORT}/`);

  }catch(e){
    throw e
  }
      }

   //   5610
