import { socket } from "../../utils/serverConnection";
import printTable from "../../utils/printTable";
import chalk from "chalk";
import logger from "../../utils/logger";

export default async (parsed: string[]) => {
  switch (parsed[0].toLowerCase()) {
    case "show":
      if (parsed?.[2] && parsed?.[3]) {
      
        socket.emit("getProducersByTransportId", parsed?.[3], (Producers) => {
       
          if (Producers?.length === 0 || !Producers)return logger(chalk.yellowBright("no Producers available"));

          logger(chalk.yellowBright(`Producers count :${Producers.length}`));

          printTable(
            chalk.yellowBright(`Transpot id: ${parsed?.[3]}`),
            Producers
          );
        
        });

        break;
      }

      socket.emit("getProducers", (Producers) => {

        if (Producers?.length === 0 || !Producers) return logger(chalk.yellowBright("no Producers available"));

        logger(chalk.yellowBright(`Producers count :${Producers.length}`));

        printTable(chalk.yellowBright(`Producers`), Producers);
      
      });

      break;
      case "watch":
        if (parsed?.[2] && parsed?.[3]) {

          socket.emit("requestLog", "producers",parsed?.[3]);

        }else{

          socket.emit("requestLog", "producers",0);

        }

        logger(chalk.yellowBright(`producers live logs:`))

        socket.on("logProducers", (data) => {

          console.clear();

          if (data?.length === 0 || !data) return logger(chalk.yellowBright("no Producers available"));
  
          logger(chalk.yellowBright(`Producers count :${data.length}`));
  
         
          printTable(chalk.yellowBright("Producers"), data);
          
        });
        break;
    default:
      break;
  }
};
