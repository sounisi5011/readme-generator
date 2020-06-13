"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cachedPromise = exports.propString = exports.inspectValue = exports.lastItem = exports.indent = exports.typeString = exports.isValidIdentifierName = exports.isNonEmptyString = exports.isObject = void 0;
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
function indent(value, indentValue = 2) {
    const text = Array.isArray(value) ? value.join('\n') : value;
    const indentStr = typeof indentValue === 'number' ? ' '.repeat(indentValue) : indentValue;
    return text.replace(/(^|\r\n?|\n)([^\r\n]?)/g, (_, lbChar, nextChar) => nextChar
        ? `${String(lbChar)}${indentStr}${String(nextChar)}`
        : `${String(lbChar)}${indentStr.replace(/\s+$/, '')}`);
}
exports.indent = indent;
function lastItem(list) {
    return list[list.length - 1];
}
exports.lastItem = lastItem;
function inspectValue(value, { depth } = {}) {
    return util_1.inspect(value, { breakLength: Infinity, depth });
}
exports.inspectValue = inspectValue;
function propString(objectPath) {
    return objectPath
        .map(propName => typeof propName === 'string' && isValidIdentifierName(propName)
        ? `.${propName}`
        : `[${inspectValue(propName)}]`)
        .join('');
}
exports.propString = propString;
function cachedPromise(fn) {
    let cache;
    return async () => {
        if (!cache)
            cache = fn();
        return await cache;
    };
}
exports.cachedPromise = cachedPromise;
//# sourceMappingURL=index.js.map