"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.multepleTable = void 0;
const cli_table3_1 = __importDefault(require("cli-table3"));
exports.default = (title, items) => {
    let table = new cli_table3_1.default({
        head: [title],
    });
    items === null || items === void 0 ? void 0 : items.forEach((element) => {
        table.push([element]);
    });
    console.log("\n");
    console.log(table.toString());
};
const multepleTable = (data) => {
    var _a, _b;
    console.log(data);
    let table = new cli_table3_1.default({
        head: ['consumers', 'producers'],
    });
    (_a = data.consumers) === null || _a === void 0 ? void 0 : _a.forEach((element) => {
        table.push([element]);
    });
    (_b = data.producers) === null || _b === void 0 ? void 0 : _b.forEach((element) => {
        table.push([element]);
    });
    console.log("\n");
    console.log(table.toString());
};
exports.multepleTable = multepleTable;
