"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.propString = exports.typeString = exports.isValidIdentifierName = exports.isObject = void 0;
const util = require("util");
function isObject(value) {
    return typeof value === 'object' && value !== null;
}
exports.isObject = isObject;
/**
 * Check if a string is a valid ECMAScript 2018 identifier name
 * @see https://www.ecma-international.org/ecma-262/9.0/index.html#prod-IdentifierName
 */
function isValidIdentifierName(str) {
    return /^[\p{ID_Start}$_][\p{ID_Continue}$\u{200C}\u{200D}]*$/u.test(str);
}
exports.isValidIdentifierName = isValidIdentifierName;
function typeString(value) {
    return value === null ? 'null' : typeof value;
}
exports.typeString = typeString;
function propString(objectPath) {
    return objectPath
        .map((propName) => typeof propName === 'string' && isValidIdentifierName(propName)
        ? `.${propName}`
        : `[${util.inspect(propName, { breakLength: Infinity })}]`)
        .join('');
}
exports.propString = propString;
//# sourceMappingURL=utils.js.map