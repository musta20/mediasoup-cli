import chalk from "chalk";
import logger from "../../utils/logger";
import printTable from "../../utils/printTable";
import { socket } from "../../utils/serverConnection"

export default async (parsed: string[]) => {
  switch (parsed[0].toLowerCase()) {
    case "show":

    socket.emit("getWorkers",worker=>{
      
      if(worker?.length === 0 || !worker)return logger(chalk.yellowBright('no worker available'))

      logger(chalk.yellowBright(`workers count :${worker.length}`))

      printTable(chalk.yellowBright('workers'),worker)
      
    })
      break;
      case "watch":

        socket.emit("requestLog", "getWorkers",0);

        logger(chalk.yellowBright(`workers live logs:`))

        socket.on("logWorkers", (data) => {

          console.clear();


          if (data?.length === 0 || !data)  return logger(chalk.yellowBright("no workers available"));
  
          logger(chalk.yellowBright(`workers count :${data.length}`));
  
       
          printTable(chalk.yellowBright("worker"), data);

        });
        break;

    default:
      break;
  }
};
