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
            if ((parsed === null || parsed === void 0 ? void 0 : parsed[2]) && (parsed === null || parsed === void 0 ? void 0 : parsed[3]) && (parsed === null || parsed === void 0 ? void 0 : parsed[4]) && (parsed === null || parsed === void 0 ? void 0 : parsed[4]) === "all") {
                serverConnection_1.socket.emit("getAllTransportContent", parsed === null || parsed === void 0 ? void 0 : parsed[3], (t) => {
                    var _a, _b, _c, _d;
                    (0, printTable_1.default)(chalk_1.default.yellowBright(`Consumers: ${(_a = t.consumers) === null || _a === void 0 ? void 0 : _a.length}`), t.consumers);
                    (0, printTable_1.default)(chalk_1.default.yellowBright(`producers: ${(_b = t.producers) === null || _b === void 0 ? void 0 : _b.length}`), t.producers);
                    (0, printTable_1.default)(chalk_1.default.yellowBright(`dataConsumer: ${(_c = t.dataConsumer) === null || _c === void 0 ? void 0 : _c.length}`), t.dataConsumer);
                    (0, printTable_1.default)(chalk_1.default.yellowBright(`dataProducer: ${(_d = t.dataProducer) === null || _d === void 0 ? void 0 : _d.length}`), t.dataProducer);
                });
                return;
            }
            if ((parsed === null || parsed === void 0 ? void 0 : parsed[2]) && (parsed === null || parsed === void 0 ? void 0 : parsed[3])) {
                serverConnection_1.socket.emit("getTansportsByRouterId", parsed === null || parsed === void 0 ? void 0 : parsed[3], (transports) => {
                    if ((transports === null || transports === void 0 ? void 0 : transports.length) === 0 || !transports)
                        return (0, logger_1.default)(chalk_1.default.yellowBright("no transports available"));
                    (0, logger_1.default)(chalk_1.default.yellowBright(`transports count :${transports.length}`));
                    (0, printTable_1.default)(chalk_1.default.yellowBright(`Router id : ${parsed === null || parsed === void 0 ? void 0 : parsed[3]}`), transports);
                });
                break;
            }
            serverConnection_1.socket.emit("getTansports", (transports) => {
                if ((transports === null || transports === void 0 ? void 0 : transports.length) === 0 || !transports)
                    return (0, logger_1.default)(chalk_1.default.yellowBright("no transports available"));
                (0, logger_1.default)(chalk_1.default.yellowBright(`transports count :${transports.length}`));
                (0, printTable_1.default)(chalk_1.default.yellowBright(`transports`), transports);
            });
            break;
        case "watch":
            if ((parsed === null || parsed === void 0 ? void 0 : parsed[2]) && (parsed === null || parsed === void 0 ? void 0 : parsed[3])) {
                serverConnection_1.socket.emit("requestLog", "transports", parsed === null || parsed === void 0 ? void 0 : parsed[3]);
            }
            else {
                serverConnection_1.socket.emit("requestLog", "transports", 0);
            }
            (0, logger_1.default)(chalk_1.default.yellowBright(`transports live logs:`));
            serverConnection_1.socket.on("logTransports", (data) => {
                console.clear();
                if ((data === null || data === void 0 ? void 0 : data.length) === 0 || !data)
                    return (0, logger_1.default)(chalk_1.default.yellowBright("no transports available"));
                (0, logger_1.default)(chalk_1.default.yellowBright(`transports count :${data.length}`));
                (0, printTable_1.default)(chalk_1.default.yellowBright("transports"), data);
            });
            break;
        default:
            break;
    }
};
