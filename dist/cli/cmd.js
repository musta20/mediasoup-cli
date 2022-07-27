"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const mainResolver_1 = __importDefault(require("./CliResolvers/mainResolver"));
const readline_1 = __importDefault(require("readline"));
let userInput;
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout,
});
const typeCmd = () => new Promise((resolve) => {
    rl.question(chalk_1.default.yellow("mediaSoup-Cli: "), resolve);
});
const startCmd = async () => {
    while (userInput !== "exit") {
        userInput = await typeCmd();
        await (0, mainResolver_1.default)(userInput);
    }
    rl.close();
};
exports.default = startCmd;
