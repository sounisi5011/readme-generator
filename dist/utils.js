"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.propString = exports.lastItem = exports.typeString = exports.isValidIdentifierName = exports.isObject = void 0;
const util = __importStar(require("util"));
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
function lastItem(list) {
    return list[list.length - 1];
}
exports.lastItem = lastItem;
function propString(objectPath) {
    return objectPath
        .map(propName => typeof propName === 'string' && isValidIdentifierName(propName)
        ? `.${propName}`
        : `[${util.inspect(propName, { breakLength: Infinity })}]`)
        .join('');
}
exports.propString = propString;
//# sourceMappingURL=utils.js.map