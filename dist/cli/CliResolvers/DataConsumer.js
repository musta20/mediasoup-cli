"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = __importDefault(require("../../utils/logger"));
const printTable_1 = __importDefault(require("../../utils/printTable"));
const serverConnection_1 = require("../../utils/serverConnection");
exports.default = async (parsed) => {
    switch (parsed[0].toLowerCase()) {
        case "show":
            if ((parsed === null || parsed === void 0 ? void 0 : parsed[2]) && (parsed === null || parsed === void 0 ? void 0 : parsed[3])) {
                serverConnection_1.socket.emit("getDataConsumersByTransportId", parsed === null || parsed === void 0 ? void 0 : parsed[3], (dataConsumers) => {
                    if ((dataConsumers === null || dataConsumers === void 0 ? void 0 : dataConsumers.length) === 0 || !dataConsumers)
                        return (0, logger_1.default)(chalk_1.default.yellowBright("no dataConsumers available"));
                    (0, logger_1.default)(chalk_1.default.yellowBright(`dataConsumers count :${dataConsumers.length}`));
                    (0, printTable_1.default)(chalk_1.default.yellowBright(`Transportid ${parsed === null || parsed === void 0 ? void 0 : parsed[3]}`), dataConsumers);
                });
                break;
            }
            serverConnection_1.socket.emit("getDataConsumers", (dataConsumers) => {
                if ((dataConsumers === null || dataConsumers === void 0 ? void 0 : dataConsumers.length) === 0 || !dataConsumers)
                    return (0, logger_1.default)(chalk_1.default.yellowBright("no dataConsumers available"));
                (0, logger_1.default)(chalk_1.default.yellowBright(`dataConsumers count :${dataConsumers.length}`));
                (0, printTable_1.default)(chalk_1.default.yellowBright(`dataConsumers`), dataConsumers);
            });
            break;
        case "watch":
            if ((parsed === null || parsed === void 0 ? void 0 : parsed[2]) && (parsed === null || parsed === void 0 ? void 0 : parsed[3])) {
                serverConnection_1.socket.emit("requestLog", "dataconsumers", parsed === null || parsed === void 0 ? void 0 : parsed[3]);
            }
            else {
                serverConnection_1.socket.emit("requestLog", "dataconsumers", 0);
            }
            (0, logger_1.default)(chalk_1.default.yellowBright(`dataconsumers live logs:`));
            serverConnection_1.socket.on("logDataConsumer", (data) => {
                console.clear();
                if ((data === null || data === void 0 ? void 0 : data.length) === 0 || !data)
                    return (0, logger_1.default)(chalk_1.default.yellowBright("no dataConsumers available"));
                (0, logger_1.default)(chalk_1.default.yellowBright(`dataConsumers count :${data.length}`));
                (0, printTable_1.default)(chalk_1.default.yellowBright("dataConsumers"), data);
            });
            break;
        default:
            break;
    }
};
