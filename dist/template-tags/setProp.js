"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _failMsgPrefix;
Object.defineProperty(exports, "__esModule", { value: true });
const nunjucks = require("nunjucks");
const NunjucksLib = require("nunjucks/src/lib");
const util = require("util");
const utils_1 = require("../utils");
class SetPropExtension {
    constructor() {
        Object.defineProperty(this, "tags", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ['setProp']
        });
        _failMsgPrefix.set(this, `SetPropExtension#parse: `);
    }
    parse(parser, nodes, lexer) {
        const getObjectPath = this.genGetObjectPath(nodes);
        const value2node = this.genValue2node(nodes);
        const tagNameSymbolToken = parser.nextToken();
        if (!tagNameSymbolToken)
            parser.fail(`${__classPrivateFieldGet(this, _failMsgPrefix)}expected ${this.tags.join(' or ')}, got end of file`);
        const tagName = tagNameSymbolToken.value;
        /**
         * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L496-L503
         */
        const targetVarList = [];
        for (let target; (target = parser.parsePrimary());) {
            if (!(target instanceof nodes.LookupVal ||
                target instanceof nodes.Symbol))
                parser.fail(`${__classPrivateFieldGet(this, _failMsgPrefix)}expected variable name or variable reference in ${tagName} tag`, target.lineno, target.colno);
            targetVarList.push({
                objectPath: getObjectPath(target),
                lineno: target.lineno + 1,
                colno: target.colno + 1,
            });
            if (!parser.skip(lexer.TOKEN_COMMA))
                break;
        }
        if (targetVarList.length < 1)
            parser.fail(`${__classPrivateFieldGet(this, _failMsgPrefix)}expected one or more variable in ${tagName} tag, got no variable`, parser.tokens.lineno, parser.tokens.colno);
        /**
         * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L505-L522
         */
        let valueNode;
        let bodyNodeList;
        if (parser.skipValue(lexer.TOKEN_OPERATOR, '=')) {
            valueNode = parser.parseExpression();
            if (!valueNode)
                parser.fail(`${__classPrivateFieldGet(this, _failMsgPrefix)}expected expression in ${tagName} tag`, parser.tokens.lineno, parser.tokens.colno);
            parser.advanceAfterBlockEnd(tagName);
        }
        else {
            const nextToken = parser.peekToken();
            /**
             * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L122-L130
             */
            if (nextToken && nextToken.type === lexer.TOKEN_BLOCK_END) {
                parser.advanceAfterBlockEnd(tagName);
            }
            else {
                /**
                 * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L1024-L1055
                 */
                const errData = nextToken && nextToken.type === lexer.TOKEN_SYMBOL
                    ? {
                        expected: '`,` or =',
                        lineno: nextToken.lineno,
                        colno: nextToken.colno,
                    }
                    : {
                        expected: '= or block end',
                        lineno: parser.tokens.lineno,
                        colno: parser.tokens.colno,
                    };
                parser.fail(
                // prettier-ignore
                `${__classPrivateFieldGet(this, _failMsgPrefix)}expected ${errData.expected} in ${tagName} tag`, errData.lineno, errData.colno);
            }
            bodyNodeList = parser.parseUntilBlocks('endsetProp', 'endset');
            parser.advanceAfterBlockEnd();
        }
        const arg = {
            targetVariableList: targetVarList,
            value: valueNode,
        };
        return new nodes.CallExtension(this, 'run', new nodes.NodeList(targetVarList[0].lineno, targetVarList[0].colno, [
            value2node(arg, targetVarList[0].lineno, targetVarList[0].colno),
        ]), bodyNodeList ? [bodyNodeList] : []);
    }
    run(context, arg, body) {
        const value = body ? body() : arg.value;
        for (const { objectPath, lineno, colno } of arg.targetVariableList) {
            let obj = context.ctx;
            objectPath.map(String).forEach((propName, index, objectPath) => {
                const isLast = objectPath.length - 1 === index;
                if (isLast) {
                    obj[propName] = value;
                }
                else {
                    const o = obj[propName];
                    if (!utils_1.isObject(o)) {
                        throw new NunjucksLib.TemplateError(new TypeError('setProp tag / Cannot be assigned to `' +
                            this.toPropString(objectPath) +
                            '`! `' +
                            this.toPropString(objectPath.slice(0, index + 1)) +
                            '` variable value is ' +
                            (o === null ? 'null' : typeof o) +
                            ', not an object'), lineno, colno);
                    }
                    obj = o;
                }
            });
        }
        return new nunjucks.runtime.SafeString('');
    }
    toPropString(objectPath) {
        return objectPath
            .map((propName, index) => utils_1.isValidIdentifierName(propName)
            ? index === 0
                ? propName
                : `.${propName}`
            : `[${util.inspect(propName)}]`)
            .join('');
    }
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    genGetObjectPath(nodes) {
        const getObjectPath = (lookupValNode) => lookupValNode instanceof nodes.LookupVal
            ? [
                ...getObjectPath(lookupValNode.target),
                lookupValNode.val.value,
            ]
            : [lookupValNode.value];
        return getObjectPath;
    }
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    genValue2node(nodes) {
        const value2node = (value, lineno, colno) => {
            if (Array.isArray(value)) {
                return new nodes.Array(lineno, colno, value.map((v) => value2node(v, lineno, colno)));
            }
            else if (utils_1.isObject(value)) {
                if (value instanceof nodes.Node) {
                    return value;
                }
                return new nodes.Dict(lineno, colno, Object.entries(value).map(([prop, value]) => new nodes.Pair(lineno, colno, value2node(prop, lineno, colno), value2node(value, lineno, colno))));
            }
            else {
                return new nodes.Literal(lineno, colno, value);
            }
        };
        return value2node;
    }
}
exports.default = SetPropExtension;
_failMsgPrefix = new WeakMap();
//# sourceMappingURL=setProp.js.map