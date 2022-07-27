import chalk from "chalk";

import logger from "../../utils/logger";

import { cmdParser } from "../../utils/parseCmd";

import routerCmdResoulver from "./Routers";
import workerCmdResoulver from "./worker";
import DataConsumerCmdResoulver from "./DataConsumer";
import DataProducerCmdResoulver from "./DataProducer";
import ConsumerCmdResoulver from "./Consumer";
import ProducerCmdResoulver from "./Producer";
import TransportCmdResoulver from "./Transport";
import WebRtcServerCmdResoulver from "./WebRtcServer";

const helpText = `
Usage: npx  mediasoup-cli
        [options] [ object ] 
        [options] [ object ]  [arguments]

options:
- show        use to show list of current objects ex : workers , routers 
- watch       use to moniter objects in real time

arguments:
--workerId       worker id ex : show routers --workerId=565422
--routerId       worker id ex : show routers --routerId=565422



`;

export default async (cmd: string | unknown) => {
  if (!cmd) return;
  const parsed = cmdParser(cmd as string);

  switch (parsed[0].toLowerCase()) {
    case "-v":
      logger(chalk.yellow("1.0.0"));
      break;

    case "-h":
    case "--help":
      console.log(helpText);
      break;
  }
  if (!["show", "watch"].includes(parsed[0].toLowerCase()))
    return console.log(chalk.yellowBright(`unknown command ${parsed[0]}`));

  if (parsed[1])
    switch (parsed[1].toLowerCase()) {
      case "worker":
      case "workers":
        workerCmdResoulver(parsed);
        break;

      case "router":
      case "routers":
        routerCmdResoulver(parsed);
        break;

      case "transport":
      case "transports":
        TransportCmdResoulver(parsed);
        break;

      case "consumer":
      case "consumers":
        ConsumerCmdResoulver(parsed);
        break;

      case "producer":
      case "producers":
        ProducerCmdResoulver(parsed);
        break;

      case "dataconsumer":
      case "dataconsumers":
        DataConsumerCmdResoulver(parsed);
        break;

      case "dataproducer":
      case "dataproducers":
        DataProducerCmdResoulver(parsed);

        break;

      case "webrtcserver":
      case "webrtcservers":
        WebRtcServerCmdResoulver(parsed);

        break;
      default:
        console.log(chalk.yellowBright(`unkonwn command ${parsed[1]}`));
        break;
    }
};
