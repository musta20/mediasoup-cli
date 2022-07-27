"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const serverConnection_1 = require("../../utils/serverConnection");
const printTable_1 = __importDefault(require("../../utils/printTable"));
const logger_1 = __importDefault(require("../../utils/logger"));
const chalk_1 = __importDefault(require("chalk"));
exports.default = async (parsed) => {
    switch (parsed[0].toLowerCase()) {
        case "show":
            if ((parsed === null || parsed === void 0 ? void 0 : parsed[2]) && (parsed === null || parsed === void 0 ? void 0 : parsed[3])) {
                serverConnection_1.socket.emit("getConsumersByTransportId", parsed === null || parsed === void 0 ? void 0 : parsed[3], (consoumer) => {
                    if ((consoumer === null || consoumer === void 0 ? void 0 : consoumer.length) === 0 || !consoumer)
                        return (0, logger_1.default)(chalk_1.default.yellowBright("no consumers available"));
                    (0, logger_1.default)(chalk_1.default.yellowBright(`consumers count : ${consoumer === null || consoumer === void 0 ? void 0 : consoumer.length}`));
                    (0, printTable_1.default)(chalk_1.default.yellowBright(`Transpot id: ${parsed === null || parsed === void 0 ? void 0 : parsed[3]}`), consoumer);
                });
                break;
            }
            serverConnection_1.socket.emit("getConsumers", (consumers) => {
                if ((consumers === null || consumers === void 0 ? void 0 : consumers.length) === 0 || !consumers)
                    return (0, logger_1.default)(chalk_1.default.yellowBright("no consumers available"));
                (0, logger_1.default)(chalk_1.default.yellowBright(`consumers count :${consumers.length}`));
                (0, printTable_1.default)(chalk_1.default.yellowBright(`Consumers`), consumers);
            });
            break;
        case "watch":
            if ((parsed === null || parsed === void 0 ? void 0 : parsed[2]) && (parsed === null || parsed === void 0 ? void 0 : parsed[3])) {
                serverConnection_1.socket.emit("requestLog", "consumer", parsed === null || parsed === void 0 ? void 0 : parsed[3]);
            }
            else {
                serverConnection_1.socket.emit("requestLog", "consumer", 0);
            }
            (0, logger_1.default)(chalk_1.default.yellowBright(`consumers live logs:`));
            serverConnection_1.socket.on("logConsumers", (data) => {
                console.clear();
                if ((data === null || data === void 0 ? void 0 : data.length) === 0 || !data)
                    return (0, logger_1.default)(chalk_1.default.yellowBright("no consumers available"));
                (0, logger_1.default)(chalk_1.default.yellowBright(`consumers count :${data.length}`));
                (0, printTable_1.default)(chalk_1.default.yellowBright("consumer"), data);
            });
            break;
        default:
            break;
    }
};
