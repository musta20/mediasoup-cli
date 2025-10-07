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
const readEnvVars = () => {
    try {
        return fs_1.default.readFileSync(envFilePath, "utf-8").split(os_1.default.EOL);
    }
    catch (e) {
        console.error("Failed to read config.env:", e instanceof Error ? e.message : e);
        throw new Error("Configuration file not found or unreadable");
    }
};
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
        envVars.push(`${key}=${value}`);
    }
    try {
        fs_1.default.writeFileSync(envFilePath, envVars.join(os_1.default.EOL), {
            flag: 'w',
        });
    }
    catch (e) {
        console.error("Failed to write to config.env:", e instanceof Error ? e.message : e);
        throw new Error("Configuration update failed");
    }
};
exports.setEnvValue = setEnvValue;
