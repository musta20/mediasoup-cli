"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const serverConnection_1 = require("../../utils/serverConnection");
const printTable_1 = __importDefault(require("../../utils/printTable"));
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = __importDefault(require("../../utils/logger"));
exports.default = async (parsed) => {
    switch (parsed[0].toLowerCase()) {
        case "show":
            if ((parsed === null || parsed === void 0 ? void 0 : parsed[2]) && (parsed === null || parsed === void 0 ? void 0 : parsed[3])) {
                serverConnection_1.socket.emit("getProducersByTransportId", parsed === null || parsed === void 0 ? void 0 : parsed[3], (Producers) => {
                    if ((Producers === null || Producers === void 0 ? void 0 : Producers.length) === 0 || !Producers)
                        return (0, logger_1.default)(chalk_1.default.yellowBright("no Producers available"));
                    (0, logger_1.default)(chalk_1.default.yellowBright(`Producers count :${Producers.length}`));
                    (0, printTable_1.default)(chalk_1.default.yellowBright(`Transpot id: ${parsed === null || parsed === void 0 ? void 0 : parsed[3]}`), Producers);
                });
                break;
            }
            serverConnection_1.socket.emit("getProducers", (Producers) => {
                if ((Producers === null || Producers === void 0 ? void 0 : Producers.length) === 0 || !Producers)
                    return (0, logger_1.default)(chalk_1.default.yellowBright("no Producers available"));
                (0, logger_1.default)(chalk_1.default.yellowBright(`Producers count :${Producers.length}`));
                (0, printTable_1.default)(chalk_1.default.yellowBright(`Producers`), Producers);
            });
            break;
        case "watch":
            if ((parsed === null || parsed === void 0 ? void 0 : parsed[2]) && (parsed === null || parsed === void 0 ? void 0 : parsed[3])) {
                serverConnection_1.socket.emit("requestLog", "producers", parsed === null || parsed === void 0 ? void 0 : parsed[3]);
            }
            else {
                serverConnection_1.socket.emit("requestLog", "producers", 0);
            }
            (0, logger_1.default)(chalk_1.default.yellowBright(`producers live logs:`));
            serverConnection_1.socket.on("logProducers", (data) => {
                console.clear();
                if ((data === null || data === void 0 ? void 0 : data.length) === 0 || !data)
                    return (0, logger_1.default)(chalk_1.default.yellowBright("no Producers available"));
                (0, logger_1.default)(chalk_1.default.yellowBright(`Producers count :${data.length}`));
                (0, printTable_1.default)(chalk_1.default.yellowBright("Producers"), data);
            });
            break;
        default:
            break;
    }
};
