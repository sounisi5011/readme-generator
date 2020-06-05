import * as nunjucks from 'nunjucks';
import * as NunjucksLib from 'nunjucks/src/lib';
import * as util from 'util';

import type { Extension as NunjucksExtension } from '../types/nunjucks-extension';
import type * as NunjucksNodes from '../types/nunjucks-extension/nunjucks/src/nodes';
import {
    Array2ReadonlyArray,
    isObject,
    isValidIdentifierName as isValidPropName,
} from '../utils';

type ObjectPathList = Array2ReadonlyArray<
    ReturnType<ReturnType<SetPropExtension['genGetObjectPath']>>
>;

interface ArgType {
    targetVariableList: ObjectPathList[];
    value: unknown;
}

export default class SetPropExtension implements NunjucksExtension {
    public tags = ['setProp'];

    #failMsgPrefix = `SetPropExtension#parse: `;

    public parse(
        parser: NunjucksExtension.Parser,
        nodes: NunjucksExtension.Nodes,
        lexer: NunjucksExtension.Lexer,
    ): NunjucksExtension.ParseResult {
        const getObjectPath = this.genGetObjectPath(nodes);
        const value2node = this.genValue2node(nodes);

        const tagNameSymbolToken = parser.nextToken();
        if (!tagNameSymbolToken)
            parser.fail(
                `${this.#failMsgPrefix}expected ${this.tags.join(
                    ' or ',
                )}, got end of file`,
            );
        const tagName = tagNameSymbolToken.value;

        /**
         * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L496-L503
         */
        const targetVarList: ObjectPathList[] = [];
        for (let target; (target = parser.parsePrimary()); ) {
            if (
                !(
                    target instanceof nodes.LookupVal ||
                    target instanceof nodes.Symbol
                )
            )
                parser.fail(
                    `${
                        this.#failMsgPrefix
                    }expected variable name or variable reference in ${tagName} tag`,
                    target.lineno,
                    target.colno,
                );

            targetVarList.push(getObjectPath(target));

            if (!parser.skip(lexer.TOKEN_COMMA)) break;
        }

        if (targetVarList.length < 1)
            parser.fail(
                `${
                    this.#failMsgPrefix
                }expected one or more variable in ${tagName} tag, got no variable`,
                parser.tokens.lineno,
                parser.tokens.colno,
            );

        /**
         * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L505-L522
         */
        let valueNode;
        let bodyNodeList;
        if (parser.skipValue(lexer.TOKEN_OPERATOR, '=')) {
            valueNode = parser.parseExpression();
            if (!valueNode)
                parser.fail(
                    `${
                        this.#failMsgPrefix
                    }expected expression in ${tagName} tag`,
                    parser.tokens.lineno,
                    parser.tokens.colno,
                );
            parser.advanceAfterBlockEnd(tagName);
        } else {
            const nextToken = parser.peekToken();

            /**
             * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L122-L130
             */
            if (nextToken && nextToken.type === lexer.TOKEN_BLOCK_END) {
                parser.advanceAfterBlockEnd(tagName);
            } else {
                /**
                 * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L1024-L1055
                 */
                const errData =
                    nextToken && nextToken.type === lexer.TOKEN_SYMBOL
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
                    `${this.#failMsgPrefix}expected ${errData.expected} in ${tagName} tag`,
                    errData.lineno,
                    errData.colno,
                );
            }

            bodyNodeList = parser.parseUntilBlocks('endsetProp', 'endset');
            parser.advanceAfterBlockEnd();
        }

        const arg: ArgType = {
            targetVariableList: targetVarList,
            value: valueNode,
        };
        return new nodes.CallExtension(
            this,
            'run',
            new nodes.NodeList(
                targetVarList[0][0].lineno,
                targetVarList[0][0].colno,
                [
                    value2node(
                        arg,
                        targetVarList[0][0].lineno,
                        targetVarList[0][0].colno,
                    ),
                ],
            ),
            bodyNodeList ? [bodyNodeList] : [],
        );
    }

    public run(
        context: {
            env: unknown;
            ctx: Record<string, unknown>;
            blocks: unknown;
            exported: unknown;
        },
        arg: ArgType,
        body?: () => unknown,
    ): nunjucks.runtime.SafeString {
        const value = body ? body() : arg.value;

        for (const objectPathList of arg.targetVariableList) {
            let obj: Record<string, unknown> = context.ctx;
            objectPathList.forEach((objectPathItem, index) => {
                const propName: any = objectPathItem.prop; // eslint-disable-line @typescript-eslint/no-explicit-any
                const nextIndex = index + 1;
                const nextObjectPathItem = objectPathList[nextIndex];

                if (!nextObjectPathItem) {
                    obj[propName] = value;
                } else {
                    const o = obj[propName];
                    if (!isObject(o)) {
                        const objectPropNameList = objectPathList.map(
                            ({ prop }) => prop,
                        );
                        const { lineno, colno } = nextObjectPathItem;
                        throw new NunjucksLib.TemplateError(
                            new TypeError(
                                'setProp tag / Cannot be assigned to `' +
                                    this.toPropString(objectPropNameList) +
                                    '`! `' +
                                    this.toPropString(
                                        objectPropNameList.slice(0, nextIndex),
                                    ) +
                                    '` variable value is ' +
                                    (o === null ? 'null' : typeof o) +
                                    ', not an object',
                            ),
                            lineno,
                            colno,
                        );
                    }
                    obj = o;
                }
            });
        }

        return new nunjucks.runtime.SafeString('');
    }

    private toPropString(objectPath: unknown[]): string {
        return objectPath
            .map((propName, index) =>
                typeof propName === 'string' && isValidPropName(propName)
                    ? index === 0
                        ? propName
                        : `.${propName}`
                    : `[${util.inspect(propName)}]`,
            )
            .join('');
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    private genGetObjectPath(nodes: NunjucksExtension.Nodes) {
        type NunjucksPropertyKey =
            | NunjucksNodes.Symbol['value']
            | NunjucksNodes.LookupVal['val']['value'];

        interface ObjectPathItem {
            prop: NunjucksPropertyKey;
            lineno: number;
            colno: number;
        }

        const getObjectPath = (
            lookupValNode: NunjucksNodes.Symbol | NunjucksNodes.LookupVal,
        ): ObjectPathItem[] =>
            lookupValNode instanceof nodes.LookupVal
                ? [
                      ...getObjectPath(lookupValNode.target),
                      {
                          prop: lookupValNode.val.value,
                          lineno: lookupValNode.lineno + 1,
                          colno: lookupValNode.colno + 1,
                      },
                  ]
                : [
                      {
                          prop: lookupValNode.value,
                          lineno: lookupValNode.lineno + 1,
                          colno: lookupValNode.colno + 1,
                      },
                  ];
        return getObjectPath;
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    private genValue2node(nodes: NunjucksExtension.Nodes) {
        const value2node = (
            value: unknown,
            lineno: number,
            colno: number,
        ): NunjucksNodes.AllNodeType => {
            if (Array.isArray(value)) {
                return new nodes.Array(
                    lineno,
                    colno,
                    value.map((v) => value2node(v, lineno, colno)),
                );
            } else if (isObject(value)) {
                if (value instanceof nodes.Node) {
                    return value as NunjucksNodes.AllNodeType;
                }
                return new nodes.Dict(
                    lineno,
                    colno,
                    Object.entries(value).map(
                        ([prop, value]) =>
                            new nodes.Pair(
                                lineno,
                                colno,
                                value2node(prop, lineno, colno),
                                value2node(value, lineno, colno),
                            ),
                    ),
                );
            } else {
                return new nodes.Literal(lineno, colno, value);
            }
        };
        return value2node;
    }
}
