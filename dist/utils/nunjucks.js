"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMsgTag = void 0;
const util_1 = require("util");
function errorMsgTag(template, ...substitutions) {
    return template
        .map((str, index) => index === 0
        ? str
        : (util_1.inspect(substitutions[index - 1], {
            depth: 0,
            breakLength: Infinity,
            maxArrayLength: 5,
        })) + str)
        .join('');
}
exports.errorMsgTag = errorMsgTag;
//# sourceMappingURL=nunjucks.js.map