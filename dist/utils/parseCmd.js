"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmdParserArgs = exports.cmdParser = void 0;
const cmdParser = (cmd) => {
    let replacedCmd = cmd.replace(/[^A-Za-z0-9-=]+/g, " ");
    return replacedCmd.trim().split(" ");
};
exports.cmdParser = cmdParser;
const cmdParserArgs = (cmd) => {
    return cmd.substring(cmd.indexOf("="));
};
exports.cmdParserArgs = cmdParserArgs;
