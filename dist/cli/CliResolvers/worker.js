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
            serverConnection_1.socket.emit("getWorkers", worker => {
                if ((worker === null || worker === void 0 ? void 0 : worker.length) === 0 || !worker)
                    return (0, logger_1.default)(chalk_1.default.yellowBright('no worker available'));
                (0, logger_1.default)(chalk_1.default.yellowBright(`workers count :${worker.length}`));
                (0, printTable_1.default)(chalk_1.default.yellowBright('workers'), worker);
            });
            break;
        case "watch":
            serverConnection_1.socket.emit("requestLog", "getWorkers", 0);
            (0, logger_1.default)(chalk_1.default.yellowBright(`workers live logs:`));
            serverConnection_1.socket.on("logWorkers", (data) => {
                console.clear();
                if ((data === null || data === void 0 ? void 0 : data.length) === 0 || !data)
                    return (0, logger_1.default)(chalk_1.default.yellowBright("no workers available"));
                (0, logger_1.default)(chalk_1.default.yellowBright(`workers count :${data.length}`));
                (0, printTable_1.default)(chalk_1.default.yellowBright("worker"), data);
            });
            break;
        default:
            break;
    }
};
