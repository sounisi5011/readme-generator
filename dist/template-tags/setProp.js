"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nunjucks = require("nunjucks");
const NunjucksLib = require("nunjucks/src/lib");
const utils_1 = require("../utils");
class SetPropExtension {
    constructor() {
        Object.defineProperty(this, "tags", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ['setProp']
        });
    }
    parse(parser, nodes, lexer) {
        const tagNameSymbolToken = parser.nextToken();
        if (!tagNameSymbolToken)
            this.throwError(parser, `expected ${this.tags.join(' or ')}, got end of file`);
        const tagName = tagNameSymbolToken.value;
        /**
         * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L496-L503
         */
        const targetVarList = [];
        while (true) {
            const target = parser.parsePrimary();
            if (!(target instanceof nodes.LookupVal) &&
                !(target instanceof nodes.Symbol))
                this.throwError(parser, `expected variable name or variable reference in ${tagName} tag`, target.lineno, target.colno);
            targetVarList.push(this.getObjectPath(nodes, target));
            if (!parser.skip(lexer.TOKEN_COMMA))
                break;
        }
        if (targetVarList.length < 1)
            this.throwError(parser, `expected one or more variable in ${tagName} tag, got no variable`, parser.tokens.lineno, parser.tokens.colno);
        /**
         * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L505-L522
         */
        let valueNode;
        let bodyNodeList;
        if (parser.skipValue(lexer.TOKEN_OPERATOR, '=')) {
            valueNode = parser.parseExpression();
            if (!valueNode)
                this.throwError(parser, `expected expression in ${tagName} tag`, parser.tokens.lineno, parser.tokens.colno);
            parser.advanceAfterBlockEnd(tagName);
        }
        else {
            const nextToken = parser.peekToken();
            /**
             * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L122-L130
             */
            if (!(nextToken && nextToken.type === lexer.TOKEN_BLOCK_END)) {
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
                this.throwError(parser, `expected ${errData.expected} in ${tagName} tag`, errData.lineno, errData.colno);
            }
            parser.advanceAfterBlockEnd(tagName);
            bodyNodeList = parser.parseUntilBlocks('endsetProp', 'endset');
            parser.advanceAfterBlockEnd();
        }
        const arg = {
            targetVariableList: targetVarList,
            value: valueNode,
        };
        const args = new nodes.NodeList(targetVarList[0][0].lineno, targetVarList[0][0].colno);
        args.addChild(this.value2node(nodes, arg, args.lineno, args.colno));
        const contentArgs = bodyNodeList ? [bodyNodeList] : [];
        return new nodes.CallExtension(this, 'run', args, contentArgs);
    }
    run(context, arg, body) {
        for (const objectPathList of arg.targetVariableList) {
            let obj = context.ctx;
            objectPathList.forEach((objectPathItem, index) => {
                const propName = objectPathItem.prop; // eslint-disable-line @typescript-eslint/no-explicit-any
                const nextIndex = index + 1;
                const nextObjectPathItem = objectPathList[nextIndex];
                if (nextObjectPathItem) {
                    const propValue = obj[propName];
                    if (!utils_1.isObject(propValue)) {
                        const objectPropNameList = objectPathList.map(({ prop }) => prop);
                        const errorMessage = 'setProp tag / Cannot be assigned to `' +
                            this.toPropString(objectPropNameList) +
                            '`! `' +
                            this.toPropString(objectPropNameList, nextIndex) +
                            '` variable value is ' +
                            utils_1.typeString(propValue) +
                            ', not an object';
                        throw new NunjucksLib.TemplateError(new TypeError(errorMessage), nextObjectPathItem.lineno, nextObjectPathItem.colno);
                    }
                    obj = propValue;
                }
                else {
                    obj[propName] = body ? body() : arg.value;
                }
            });
        }
        return new nunjucks.runtime.SafeString('');
    }
    toPropString(objectPath, stopIndex) {
        return utils_1.propString(objectPath.slice(0, stopIndex)).replace(/^\./, '');
    }
    throwError(parser, message, lineno, colno) {
        const errorMessage = `${this.constructor.name}#parse: ${message}`;
        if (lineno !== undefined && colno !== undefined) {
            parser.fail(errorMessage, lineno, colno);
        }
        else {
            parser.fail(errorMessage);
        }
    }
    getObjectPath(nodes, lookupValNode) {
        if (lookupValNode instanceof nodes.LookupVal) {
            const targetList = lookupValNode.target instanceof nodes.Symbol ||
                lookupValNode.target instanceof nodes.LookupVal
                ? this.getObjectPath(nodes, lookupValNode.target)
                : [];
            return targetList.concat({
                prop: lookupValNode.val,
                lineno: lookupValNode.lineno + 1,
                colno: lookupValNode.colno + 1,
            });
        }
        else {
            return [
                {
                    prop: lookupValNode.value,
                    lineno: lookupValNode.lineno + 1,
                    colno: lookupValNode.colno + 1,
                },
            ];
        }
    }
    value2node(nodes, value, lineno, colno) {
        if (value instanceof nodes.Node) {
            return value;
        }
        else if (Array.isArray(value)) {
            return new nodes.Array(lineno, colno, value.map((v) => this.value2node(nodes, v, lineno, colno)));
        }
        else if (utils_1.isObject(value)) {
            return new nodes.Dict(lineno, colno, Object.entries(value).map(([prop, value]) => new nodes.Pair(lineno, colno, this.value2node(nodes, prop, lineno, colno), this.value2node(nodes, value, lineno, colno))));
        }
        else {
            return new nodes.Literal(lineno, colno, value);
        }
    }
}
exports.default = SetPropExtension;
//# sourceMappingURL=setProp.js.map