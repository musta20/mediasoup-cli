import { socket } from "../../utils/serverConnection";
import printTable from "../../utils/printTable";
import chalk from "chalk";
import logger from "../../utils/logger";

export default async (parsed: string[]) => {
  switch (parsed[0].toLowerCase()) {
    case "show":
      if (parsed?.[2] && parsed?.[3]) {
        socket.emit("getRoutersByWorkerId", parsed?.[3], (Routers) => {
          if (Routers?.length === 0 || !Routers)
            return logger(chalk.yellowBright("no routes available"));
          chalk.yellowBright(`Routers count : ${Routers.length}`);

          printTable(chalk.yellowBright(`worker id: ${parsed?.[3]}`), Routers);
        });

        break;
      }

      socket.emit("getRouters", (Routers) => {
        
        if (Routers?.length === 0 || !Routers) return logger(chalk.yellowBright("no routes available"));
        chalk.yellowBright(`Routers count : ${Routers.length}`);

        printTable(chalk.yellowBright(`Routers`), Routers);
      });

      break;
    case "watch":

      if (parsed?.[2] && parsed?.[3]) {


        socket.emit("requestLog", "routers",parsed?.[3]);

      }else{

        socket.emit("requestLog", "routers",0);

      }
      console.clear();

      logger(chalk.yellowBright(`Routers live logs:`))

      socket.on("logRouters", (data) => {

        console.clear();

        if (data?.length === 0 || !data) return logger(chalk.yellowBright("no Routers available"));

        logger(chalk.yellowBright(`Routers count :${data?.length}`));

        printTable(chalk.yellowBright("Routers"), data);
        
      });
      break;
      
    default:
      break;
  }
};
