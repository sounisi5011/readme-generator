"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bentErrorFixer = void 0;
const util_1 = require("util");
const _1 = require(".");
function setProp(obj, propName, value, enumerable = true) {
    Object.defineProperty(obj, propName, {
        configurable: true,
        enumerable,
        writable: true,
        value,
    });
}
function tryParseJSON(text, callback) {
    try {
        callback(JSON.parse(text));
    }
    catch (_a) {
        //
    }
}
function isError(error, constructorName) {
    return error instanceof Error && error.constructor.name === constructorName;
}
function genErrerMessage({ statusCode, headers, messageBodyStr, }) {
    return [
        `HTTP ${statusCode}`,
        _1.indent([
            ...(Object.entries(headers)
                .filter(([name]) => /^x-(?!(?:frame-options|content-type-options|xss-protection)$)/i.test(name))
                .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
                .map(([name, value]) => `${name}: ${String(value)}`)),
            `body:`,
            _1.indent(messageBodyStr),
        ]),
    ].join('\n');
}
async function bentErrorFixer(error) {
    if (!(isError(error, 'StatusError')
        && typeof error.statusCode === 'number' && typeof error.text === 'function' && _1.isObject(error.headers))) {
        // eslint-disable-next-line @typescript-eslint/return-await
        return Promise.reject(error);
    }
    setProp(error, 'name', error.constructor.name, false);
    let messageBodyStr = await error.text();
    setProp(error, 'body', messageBodyStr);
    delete error.text;
    if (typeof error.arrayBuffer === 'function')
        delete error.arrayBuffer;
    if (typeof error.json === 'function') {
        tryParseJSON(messageBodyStr, value => {
            Object.defineProperty(error, 'body', { value });
            messageBodyStr = util_1.inspect(value);
        });
        delete error.json;
    }
    const { statusCode, headers } = error;
    setProp(error, 'message', genErrerMessage({ statusCode, headers, messageBodyStr }), false);
    return Promise.reject(error);
}
exports.bentErrorFixer = bentErrorFixer;
//# sourceMappingURL=bent.js.map