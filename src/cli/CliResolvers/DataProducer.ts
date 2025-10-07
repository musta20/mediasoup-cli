import chalk from "chalk";
import logger from "../../utils/logger";
import printTable from "../../utils/printTable";
import { socket } from "../../utils/serverConnection";

export default async (parsed: string[]) => {
  switch (parsed[0].toLowerCase()) {
    case "show":
      if (parsed?.[2] && parsed?.[3]) {
        socket.emit(
          "getDataProducersByTransportId",
          parsed?.[3],
          (dataConsumers) => {

            if (dataConsumers?.length === 0 || !dataConsumers )return logger(chalk.yellowBright("no DataProducers available"));

            logger( chalk.yellowBright(`DataProducers count :${dataConsumers.length}`));

            printTable(
              chalk.yellowBright(`Transportid ${parsed?.[3]}`),
              dataConsumers
            );
            
          }
        );
        break;
      }
      socket.emit("getDataProducers", (dataConsumers) => {

        if (dataConsumers?.length === 0 || !dataConsumers) return logger(chalk.yellowBright("no DataProducers available"));

        logger(
          chalk.yellowBright(`DataProducers count :${dataConsumers.length}`)
        );

        printTable(chalk.yellowBright(`DataProducers`), dataConsumers);

      });

      break;
    case "watch":
      if (parsed?.[2] && parsed?.[3]) {

        socket.emit("requestLog", "dataproducers", parsed?.[3]);

      }
      else{

        socket.emit("requestLog", "dataproducers",0);

      }

      logger(chalk.yellowBright(`dataproducers live logs:`))

      socket.on("logDataProducers", (data) => {

        console.clear();

        if (data?.length === 0 || !data) return logger(chalk.yellowBright("no DataProducers available"));

        logger(chalk.yellowBright(`DataProducers count :${data.length}`));

      
        printTable(chalk.yellowBright("dataProducer"), data);

      });
      break;

    default:

      break;
  }
};
