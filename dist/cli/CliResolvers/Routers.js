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
                serverConnection_1.socket.emit("getRoutersByWorkerId", parsed === null || parsed === void 0 ? void 0 : parsed[3], (Routers) => {
                    if ((Routers === null || Routers === void 0 ? void 0 : Routers.length) === 0 || !Routers)
                        return (0, logger_1.default)(chalk_1.default.yellowBright("no routes available"));
                    chalk_1.default.yellowBright(`Routers count : ${Routers.length}`);
                    (0, printTable_1.default)(chalk_1.default.yellowBright(`worker id: ${parsed === null || parsed === void 0 ? void 0 : parsed[3]}`), Routers);
                });
                break;
            }
            serverConnection_1.socket.emit("getRouters", (Routers) => {
                if ((Routers === null || Routers === void 0 ? void 0 : Routers.length) === 0 || !Routers)
                    return (0, logger_1.default)(chalk_1.default.yellowBright("no routes available"));
                chalk_1.default.yellowBright(`Routers count : ${Routers.length}`);
                (0, printTable_1.default)(chalk_1.default.yellowBright(`Routers`), Routers);
            });
            break;
        case "watch":
            if ((parsed === null || parsed === void 0 ? void 0 : parsed[2]) && (parsed === null || parsed === void 0 ? void 0 : parsed[3])) {
                serverConnection_1.socket.emit("requestLog", "routers", parsed === null || parsed === void 0 ? void 0 : parsed[3]);
            }
            else {
                serverConnection_1.socket.emit("requestLog", "routers", 0);
            }
            console.clear();
            (0, logger_1.default)(chalk_1.default.yellowBright(`Routers live logs:`));
            serverConnection_1.socket.on("logRouters", (data) => {
                console.clear();
                if ((data === null || data === void 0 ? void 0 : data.length) === 0 || !data)
                    return (0, logger_1.default)(chalk_1.default.yellowBright("no Routers available"));
                (0, logger_1.default)(chalk_1.default.yellowBright(`Routers count :${data === null || data === void 0 ? void 0 : data.length}`));
                (0, printTable_1.default)(chalk_1.default.yellowBright("Routers"), data);
            });
            break;
        default:
            break;
    }
};
