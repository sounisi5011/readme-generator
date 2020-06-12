"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.propString = exports.lastItem = exports.typeString = exports.isValidIdentifierName = exports.isNonEmptyString = exports.isObject = void 0;
const util_1 = require("util");
function isObject(value) {
    return typeof value === 'object' && value !== null;
}
exports.isObject = isObject;
function isNonEmptyString(value) {
    return typeof value === 'string' && value !== '';
}
exports.isNonEmptyString = isNonEmptyString;
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
function lastItem(list) {
    return list[list.length - 1];
}
exports.lastItem = lastItem;
function propString(objectPath) {
    return objectPath
        .map(propName => typeof propName === 'string' && isValidIdentifierName(propName)
        ? `.${propName}`
        : `[${util_1.inspect(propName, { breakLength: Infinity })}]`)
        .join('');
}
exports.propString = propString;
//# sourceMappingURL=index.js.map