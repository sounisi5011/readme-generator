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
function genErrerMessage({ statusCode, headers, messageBodyStr }) {
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
    if (error instanceof Error && _1.isObject(error) && error.constructor.name === 'StatusError'
        && typeof error.statusCode === 'number' && typeof error.text === 'function' && _1.isObject(error.headers)) {
        setProp(error, 'name', error.constructor.name, false);
        const errorBody = await error.text();
        setProp(error, 'body', errorBody);
        delete error.text;
        let messageBodyStr = errorBody;
        if (typeof error.arrayBuffer === 'function')
            delete error.arrayBuffer;
        if (typeof error.json === 'function') {
            try {
                Object.defineProperty(error, 'body', { value: JSON.parse(errorBody) });
                messageBodyStr = util_1.inspect(error.body);
            }
            catch (_a) {
                //
            }
            delete error.json;
        }
        setProp(error, 'message', genErrerMessage({ statusCode: error.statusCode, headers: error.headers, messageBodyStr }), false);
    }
    // eslint-disable-next-line @typescript-eslint/return-await
    return Promise.reject(error);
}
exports.bentErrorFixer = bentErrorFixer;
//# sourceMappingURL=bent.js.map