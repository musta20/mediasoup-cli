import { socket } from "../../utils/serverConnection";
import printTable from "../../utils/printTable";
import logger from "../../utils/logger";
import chalk from "chalk";

export default async (parsed: string[]) => {
  switch (parsed[0].toLowerCase()) {
    case "show":
      if (parsed?.[2] && parsed?.[3]) {

        socket.emit("getConsumersByTransportId", parsed?.[3], (consoumer) => {
          if (consoumer?.length === 0 || !consoumer)
            return logger(chalk.yellowBright("no consumers available"));

          logger(chalk.yellowBright(`consumers count : ${consoumer?.length}`));

          printTable(
            chalk.yellowBright(`Transpot id: ${parsed?.[3]}`),
            consoumer
          );
        });

        break;
      }

      socket.emit("getConsumers", (consumers) => {

        if (consumers?.length === 0 || !consumers)
          return logger(chalk.yellowBright("no consumers available"));

        logger(chalk.yellowBright(`consumers count :${consumers.length}`));

        printTable(chalk.yellowBright(`Consumers`), consumers);
      });

      break;
    case "watch":
      if (parsed?.[2] && parsed?.[3]) {

        socket.emit("requestLog", "consumer", parsed?.[3]);

      } else {

        socket.emit("requestLog", "consumer", 0);

      }

      logger(chalk.yellowBright(`consumers live logs:`));

      socket.on("logConsumers", (data) => {

        console.clear();

        if (data?.length === 0 || !data)
          return logger(chalk.yellowBright("no consumers available"));

        logger(chalk.yellowBright(`consumers count :${data.length}`));

        printTable(chalk.yellowBright("consumer"), data);
        
      });
      break;
    default:
      break;
  }
};
