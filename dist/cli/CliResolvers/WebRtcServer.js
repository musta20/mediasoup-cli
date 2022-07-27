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
                serverConnection_1.socket.emit("getwebrtcServersByWorkerId", parsed === null || parsed === void 0 ? void 0 : parsed[3], (webrtcServer) => {
                    if ((webrtcServer === null || webrtcServer === void 0 ? void 0 : webrtcServer.length) === 0 || !webrtcServer)
                        return (0, logger_1.default)(chalk_1.default.yellowBright("no webrtcServer available"));
                    chalk_1.default.yellowBright(`webrtcServer count :${webrtcServer.length}`);
                    (0, printTable_1.default)(chalk_1.default.yellowBright(`worker id: ${parsed === null || parsed === void 0 ? void 0 : parsed[3]}`), webrtcServer);
                });
                break;
            }
            serverConnection_1.socket.emit("getwebrtcServers", (WebrtcServer) => {
                if ((WebrtcServer === null || WebrtcServer === void 0 ? void 0 : WebrtcServer.length) === 0 || !WebrtcServer)
                    return (0, logger_1.default)(chalk_1.default.yellowBright("no webrtcServer available"));
                chalk_1.default.yellowBright(`webrtcServer count :${WebrtcServer.length}`);
                (0, printTable_1.default)(`WebrtcServer`, WebrtcServer);
            });
            break;
        case "watch":
            if ((parsed === null || parsed === void 0 ? void 0 : parsed[2]) && (parsed === null || parsed === void 0 ? void 0 : parsed[3])) {
                serverConnection_1.socket.emit("requestLog", "getWorkers", parsed === null || parsed === void 0 ? void 0 : parsed[3]);
            }
            else {
                serverConnection_1.socket.emit("requestLog", "getWorkers", 0);
            }
            (0, logger_1.default)(chalk_1.default.yellowBright(`webrtcservr live logs:`));
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
