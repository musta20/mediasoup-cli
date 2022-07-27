import chalk from "chalk";
import logger from "../../utils/logger";
import printTable from "../../utils/printTable";
import { socket } from "../../utils/serverConnection";

export default async (parsed: string[]) => {
  switch (parsed[0].toLowerCase()) {
    case "show":
            
      if( parsed?.[2] && parsed?.[3] && parsed?.[4] &&  parsed?.[4]==="all")
      {
        socket.emit("getAllTransportContent",parsed?.[3],(t)=>{

          printTable( chalk.yellowBright(`Consumers: ${t.consumers?.length}`), t.consumers);
          printTable( chalk.yellowBright(`producers: ${t.producers?.length}`), t.producers);
          printTable( chalk.yellowBright(`dataConsumer: ${t.dataConsumer?.length}`), t.dataConsumer);
          printTable( chalk.yellowBright(`dataProducer: ${t.dataProducer?.length}`), t.dataProducer);

        });
    
        return
      }

      if (parsed?.[2] && parsed?.[3]) {
        socket.emit("getTansportsByRouterId", parsed?.[3], (transports) => {
          
          if (transports?.length === 0 || !transports) return logger(chalk.yellowBright("no transports available"));

          logger(chalk.yellowBright(`transports count :${transports.length}`));

          printTable( chalk.yellowBright(`Router id : ${parsed?.[3]}`), transports);
        });

        break;
      }
      socket.emit("getTansports", (transports) => {
        if (transports?.length === 0 || !transports)  return logger(chalk.yellowBright("no transports available"));

        logger(chalk.yellowBright(`transports count :${transports.length}`));
        printTable(chalk.yellowBright(`transports`), transports);
      });

      break;
    case "watch":
        
      
      if (parsed?.[2] && parsed?.[3]) {

        socket.emit("requestLog", "transports",parsed?.[3]);

      }else{

        socket.emit("requestLog", "transports",0);

      }

      logger(chalk.yellowBright(`transports live logs:`))

      socket.on("logTransports", (data) => {

        console.clear();


        if (data?.length === 0 || !data) return logger(chalk.yellowBright("no transports available"));

        logger(chalk.yellowBright(`transports count :${data.length}`));

        printTable(chalk.yellowBright("transports"), data);
        
      });
      break;
    default:
      break;
  }
};
