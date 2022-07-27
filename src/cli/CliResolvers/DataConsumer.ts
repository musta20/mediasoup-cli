import chalk from "chalk";
import logger from "../../utils/logger";
import printTable from "../../utils/printTable";
import { socket } from "../../utils/serverConnection";

export default async (parsed: string[]) => {
  switch (parsed[0].toLowerCase()) {
    case "show":
      if (parsed?.[2] && parsed?.[3]) {
        socket.emit(
          "getDataConsumersByTransportId",
          parsed?.[3],
          (dataConsumers) => {
            
            if (dataConsumers?.length === 0 || !dataConsumers) return logger(chalk.yellowBright("no dataConsumers available"));

            logger(
              chalk.yellowBright(`dataConsumers count :${dataConsumers.length}`)
            );

            printTable( chalk.yellowBright(`Transportid ${parsed?.[3]}`), dataConsumers);

          }
        );
        break;
      }
      socket.emit("getDataConsumers", (dataConsumers) => {

        if (dataConsumers?.length === 0 || !dataConsumers) return logger(chalk.yellowBright("no dataConsumers available"));

        logger(
          chalk.yellowBright(`dataConsumers count :${dataConsumers.length}`)
        );

        printTable( chalk.yellowBright(`dataConsumers`), dataConsumers);

      });
      break;
    case "watch":
      if (parsed?.[2] && parsed?.[3]) {

        socket.emit("requestLog", "dataconsumers",parsed?.[3]);

      }else{

        socket.emit("requestLog", "dataconsumers",0);

      }

      logger(chalk.yellowBright(`dataconsumers live logs:`))

      socket.on("logDataConsumer", (data) => {

        console.clear();

        if (data?.length === 0 || !data)  return logger(chalk.yellowBright("no dataConsumers available"));

        logger(chalk.yellowBright(`dataConsumers count :${data.length}`));

     
        printTable(chalk.yellowBright("dataConsumers"), data);

      });
      break;

    default:
      break;
  }
};
