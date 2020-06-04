"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nunjucks = require("nunjucks");
const util = require("util");
const utils_1 = require("../utils");
function isNonNullable(value) {
    return value !== null && value !== undefined;
}
class SetPropExtension {
    constructor() {
        Object.defineProperty(this, "tags", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ['setProp']
        });
    }
    parse(parser, nodes) {
        const getObjectPath = this.genGetObjectPath(nodes);
        const value2node = this.genValue2node(nodes);
        const tagNameSymbolToken = parser.nextToken();
        const argsNodeList = parser.parseSignature(null, true);
        if (tagNameSymbolToken) {
            parser.advanceAfterBlockEnd(tagNameSymbolToken.value);
        }
        const bodyNodeList = parser.parseUntilBlocks('endsetProp', 'endset');
        parser.advanceAfterBlockEnd();
        const objectPathList = argsNodeList.children
            .map((childNode) => {
            if (childNode instanceof nodes.LookupVal ||
                childNode instanceof nodes.Symbol) {
                const objectPath = getObjectPath(childNode);
                return objectPath;
            }
            return null;
        })
            .filter(isNonNullable);
        return new nodes.CallExtension(this, 'run', new nodes.NodeList(argsNodeList.lineno, argsNodeList.colno, [
            value2node({
                objectPathList,
            }, argsNodeList.lineno, argsNodeList.colno),
        ]), [bodyNodeList]);
    }
    run(context, arg, body) {
        const bodyStr = body();
        for (const objectPath of arg.objectPathList) {
            let obj = context.ctx;
            objectPath.forEach((propName, index) => {
                const isLast = objectPath.length - 1 === index;
                if (isLast) {
                    obj[propName] = bodyStr;
                }
                else {
                    const o = obj[propName];
                    if (!utils_1.isObject(o)) {
                        throw new TypeError('setProp tag / Cannot be assigned to `' +
                            this.toPropString(objectPath) +
                            '`! `' +
                            this.toPropString(objectPath.slice(0, index + 1)) +
                            '` variable value is ' +
                            (o === null ? 'null' : typeof o) +
                            ', not an object');
                    }
                    obj = o;
                }
            });
        }
        return new nunjucks.runtime.SafeString('');
    }
    toPropString(objectPath) {
        /**
         * @see https://www.ecma-international.org/ecma-262/9.0/index.html#prod-IdentifierName
         */
        const ECMAScript2018IdentifierNameRegExp = /^[\p{ID_Start}$_][\p{ID_Continue}$\u{200C}\u{200D}]*$/u;
        return objectPath
            .map((propName, index) => ECMAScript2018IdentifierNameRegExp.test(propName)
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
//# sourceMappingURL=setProp.js.map