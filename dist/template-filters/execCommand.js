"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execCommand = void 0;
const execa_1 = __importDefault(require("execa"));
const npm_path_1 = __importDefault(require("npm-path"));
const utils_1 = require("../utils");
// eslint-disable-next-line @typescript-eslint/promise-function-async
const getEnvRecord = utils_1.cachedPromise(() => new Promise((resolve, reject) => npm_path_1.default.get((error, $PATH) => {
    if (error) {
        reject(error);
    }
    else if ($PATH) {
        resolve({ [npm_path_1.default.PATH]: $PATH });
    }
    else {
        resolve({});
    }
})));
async function execCommand(command) {
    var _a;
    const options = {
        all: true,
        env: await getEnvRecord(),
    };
    let proc;
    if (typeof command === 'string') {
        proc = execa_1.default.command(command, options);
    }
    else if (utils_1.isStringArray(command)) {
        const [file, ...args] = command;
        proc = execa_1.default(file, args, options);
    }
    if (!proc) {
        throw new TypeError(utils_1.errorMsgTag `Invalid command value: ${command}`);
    }
    const result = await proc;
    return (_a = result.all) !== null && _a !== void 0 ? _a : result.stdout;
}
exports.execCommand = execCommand;
//# sourceMappingURL=execCommand.js.map