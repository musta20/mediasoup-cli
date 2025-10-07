import { socket } from "../../utils/serverConnection";
import printTable from "../../utils/printTable";
import logger from "../../utils/logger";
import chalk from "chalk";

export default async (parsed: string[]) => {
  switch (parsed[0].toLowerCase()) {
    case "show":
      if (parsed?.[2] && parsed?.[3]) {

        socket.emit("getwebrtcServersByWorkerId", parsed?.[3], (webrtcServer) => {

          if (webrtcServer?.length === 0 || !webrtcServer )return logger(chalk.yellowBright("no webrtcServer available"));

          logger(chalk.yellowBright(`webrtcServer count :${webrtcServer.length}`));

          printTable(  chalk.yellowBright(`worker id: ${parsed?.[3]}`), webrtcServer);

        });

        break;
      }

      socket.emit("getwebrtcServers", (WebrtcServer) => {

        if (WebrtcServer?.length === 0 || !WebrtcServer)return logger(chalk.yellowBright("no webrtcServer available"));

        logger(chalk.yellowBright(`webrtcServer count :${WebrtcServer.length}`));


        printTable(`WebrtcServer`, WebrtcServer);

      });

      break;
      case "watch":
        if (parsed?.[2] && parsed?.[3]) {

          socket.emit("requestLog", "webrtcserver", parsed?.[3]);

        }else{
          socket.emit("requestLog", "webrtcserver",0);

        }

        logger(chalk.yellowBright(`webrtcserver live logs:`))

        socket.on("logWebrtcServer", (data) => {

          console.clear();

          if (data?.length === 0 || !data)  return logger(chalk.yellowBright("no webrtcServer available"));

          logger(chalk.yellowBright(`webrtcServer count :${data.length}`));


          printTable(chalk.yellowBright("webrtcServer"), data);

        });
        break;


    default:
      break;
  }
};
