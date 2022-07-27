"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setEnvValue = exports.getEnvValue = void 0;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const envFilePath = path_1.default.join(path_1.default.resolve(__dirname, "../../"), "config.env");
const readEnvVars = () => fs_1.default.readFileSync(envFilePath, "utf-8").split(os_1.default.EOL);
const getEnvValue = (key) => {
    const matchedLine = readEnvVars().find((line) => line.split("=")[0] === key);
    return matchedLine !== undefined ? matchedLine.split("=")[1] : null;
};
exports.getEnvValue = getEnvValue;
const setEnvValue = async (key, value) => {
    const envVars = readEnvVars();
    const targetLine = envVars.find((line) => line.split("=")[0] === key);
    if (targetLine !== undefined) {
        const targetLineIndex = envVars.indexOf(targetLine);
        envVars.splice(targetLineIndex, 1, `${key}=${value}`);
    }
    else {
        envVars.push(`${key}="${value}"`);
    }
    try {
        fs_1.default.writeFileSync(envFilePath, envVars.join(os_1.default.EOL), {
            flag: 'w',
        });
    }
    catch (e) {
        console.log(e);
    }
};
exports.setEnvValue = setEnvValue;
