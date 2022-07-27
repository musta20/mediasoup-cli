"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = __importDefault(require("../../utils/logger"));
const parseCmd_1 = require("../../utils/parseCmd");
const Routers_1 = __importDefault(require("./Routers"));
const worker_1 = __importDefault(require("./worker"));
const DataConsumer_1 = __importDefault(require("./DataConsumer"));
const DataProducer_1 = __importDefault(require("./DataProducer"));
const Consumer_1 = __importDefault(require("./Consumer"));
const Producer_1 = __importDefault(require("./Producer"));
const Transport_1 = __importDefault(require("./Transport"));
const WebRtcServer_1 = __importDefault(require("./WebRtcServer"));
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



Documentation can be found at https://nodejs.org/


`;
exports.default = async (cmd) => {
    if (!cmd)
        return;
    const parsed = (0, parseCmd_1.cmdParser)(cmd);
    switch (parsed[0].toLowerCase()) {
        case "-v":
            (0, logger_1.default)(chalk_1.default.yellow("1.0.0"));
            break;
        case "-h":
        case "--help":
            console.log(helpText);
            break;
    }
    if (!["show", "watch"].includes(parsed[0].toLowerCase()))
        return console.log(chalk_1.default.yellowBright(`unknown command ${parsed[0]}`));
    if (parsed[1])
        switch (parsed[1].toLowerCase()) {
            case "worker":
            case "workers":
                (0, worker_1.default)(parsed);
                break;
            case "router":
            case "routers":
                (0, Routers_1.default)(parsed);
                break;
            case "transport":
            case "transports":
                (0, Transport_1.default)(parsed);
                break;
            case "consumer":
            case "consumers":
                (0, Consumer_1.default)(parsed);
                break;
            case "producer":
            case "producers":
                (0, Producer_1.default)(parsed);
                break;
            case "dataconsumer":
            case "dataconsumers":
                (0, DataConsumer_1.default)(parsed);
                break;
            case "dataproducer":
            case "dataproducers":
                (0, DataProducer_1.default)(parsed);
                break;
            case "webrtcserver":
            case "webrtcservers":
                (0, WebRtcServer_1.default)(parsed);
                break;
            default:
                console.log(chalk_1.default.yellowBright(`unkonwn command ${parsed[1]}`));
                break;
        }
};
