import { inspect } from 'util';

import { TemplateError as NunjucksTemplateError } from 'nunjucks/src/lib';

import type { Extension as NunjucksExtension } from '../types/nunjucks-extension';
import type * as NunjucksNodes from '../types/nunjucks-extension/nunjucks/src/nodes';
import { isObject, lastItem, propString, typeString } from '../utils';

type TargetVariablesGroup =
    | {
        type: 'name';
        variables: [NunjucksNodes.Symbol, ...NunjucksNodes.Symbol[]];
    }
    | {
        type: 'ref';
        variables: [NunjucksNodes.LookupVal, ...NunjucksNodes.LookupVal[]];
    };

interface ObjectPathItem<TValue = unknown> {
    value: TValue;
    symbolName?: string;
    lineno: number;
    colno: number;
}

type ObjectPathData<TValue = unknown> = ObjectPathItem<TValue>[];

interface ArgType {
    targetPropList: ObjectPathData[];
    value: unknown;
}

export class SetPropExtension implements NunjucksExtension {
    public tags = ['setProp'];

    public parse(
        parser: NunjucksExtension.Parser,
        nodes: NunjucksExtension.Nodes,
        lexer: NunjucksExtension.Lexer,
    ): NunjucksExtension.ParseResult {
        const tagNameSymbolToken = parser.nextToken();
        if (!tagNameSymbolToken) {
            this.throwError(
                parser,
                this.parse,
                `expected ${this.tags.join(' or ')}, got end of file`,
            );
        }
        const tagName = tagNameSymbolToken.value;

        /**
         * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L496-L503
         */
        const targetVarsList: TargetVariablesGroup[] = [];
        while (true) {
            let target;
            try {
                target = parser.parsePrimary();
            } catch (error) {
                if (!(error instanceof NunjucksTemplateError)) throw error;

                /** @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L1064 */
                const isExtraComma = /\bunexpected token: ,(?=\s|$)/.test(error.message);
                /** @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L1064 */
                const isVarsEnd = /\bunexpected token: (?:=|%\})(?=\s|$)/.test(error.message);
                /** @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L1023 */
                const isEOF = /\bgot end of file\b/.test(error.message);

                let errorMessage: string | undefined;
                if (isExtraComma || ((isVarsEnd || isEOF) && targetVarsList.length > 0)) {
                    errorMessage = `expected variable name or variable reference in ${tagName} tag`;
                } else if (isEOF) {
                    errorMessage = `expected one or more variable in ${tagName} tag, got end of file`;
                } else if (isVarsEnd) {
                    errorMessage = `expected one or more variable in ${tagName} tag, got no variable`;
                } else if (/^unexpected token: \S+$/.test(error.message)) {
                    errorMessage =
                        `expected variable name or variable reference in ${tagName} tag, got ${error.message}`;
                }

                if (!errorMessage) throw error;
                this.throwError(parser, this.parse, errorMessage, error);
            }

            if (target instanceof nodes.Symbol) {
                const lastTargetVars = lastItem(targetVarsList);
                if (lastTargetVars && lastTargetVars.type === 'name') {
                    lastTargetVars.variables.push(target);
                } else {
                    targetVarsList.push({
                        type: 'name',
                        variables: [target],
                    });
                }
            } else if (target instanceof nodes.LookupVal) {
                targetVarsList.push({
                    type: 'ref',
                    variables: [target],
                });
            } else {
                this.throwError(
                    parser,
                    this.parse,
                    `expected variable name or variable reference in ${tagName} tag`,
                    target.lineno,
                    target.colno,
                );
            }

            if (!parser.skip(lexer.TOKEN_COMMA)) break;
        }

        if (targetVarsList.length < 1) {
            this.throwError(
                parser,
                this.parse,
                `expected one or more variable in ${tagName} tag, got no variable`,
                parser.tokens.lineno,
                parser.tokens.colno,
            );
        }

        /**
         * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L505-L522
         */
        let valueNode: ReturnType<typeof parser.parseExpression> | undefined;
        let bodyNodeList: ReturnType<typeof parser.parseUntilBlocks> | undefined;
        if (parser.skipValue(lexer.TOKEN_OPERATOR, '=')) {
            try {
                valueNode = parser.parseExpression();
            } catch (error) {
                if (!(error instanceof NunjucksTemplateError)) throw error;
                if (/^unexpected token:/.test(error.message)) {
                    this.throwError(
                        parser,
                        this.parse,
                        `expected expression in ${tagName} tag, got ${error.message}`,
                        error,
                    );
                } else if (/,\s*got end of file$/.test(error.message)) {
                    this.throwError(
                        parser,
                        this.parse,
                        `expected expression in ${tagName} tag, got end of file`,
                        error,
                    );
                }
                throw error;
            }
            parser.advanceAfterBlockEnd(tagName);
        } else {
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
                this.throwError(
                    parser,
                    this.parse,
                    `expected ${errData.expected} in ${tagName} tag`,
                    errData.lineno,
                    errData.colno,
                );
            }

            parser.advanceAfterBlockEnd(tagName);
            bodyNodeList = parser.parseUntilBlocks('endsetProp', 'endset');
            try {
                parser.advanceAfterBlockEnd();
            } catch (error) {
                if (error instanceof NunjucksTemplateError) {
                    if (error.message === 'unexpected end of file') {
                        this.throwError(
                            parser,
                            this.parse,
                            `unexpected end of file. expected "endsetProp" or "endset" block after ${tagName} tag`,
                            error,
                        );
                    }
                }
                throw error;
            }
        }

        const nodeList = new nodes.NodeList(tagNameSymbolToken.lineno, tagNameSymbolToken.colno);

        for (const targetVars of targetVarsList) {
            if (targetVars.type === 'name') {
                /**
                 * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L494-L522
                 */
                if (valueNode) {
                    nodeList.addChild(
                        new nodes.Set(
                            tagNameSymbolToken.lineno,
                            tagNameSymbolToken.colno,
                            targetVars.variables,
                            valueNode,
                        ),
                    );
                } else if (bodyNodeList) {
                    const setNode = new nodes.Set(
                        tagNameSymbolToken.lineno,
                        tagNameSymbolToken.colno,
                        targetVars.variables,
                    );
                    /**
                     * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L511-L515
                     */
                    setNode.body = new nodes.Capture(
                        tagNameSymbolToken.lineno,
                        tagNameSymbolToken.colno,
                        bodyNodeList,
                    );
                    nodeList.addChild(setNode);
                }
            } else {
                const targetPropList = targetVars.variables
                    .map(lookupValNode => this.getObjectPath(nodes, lookupValNode));
                const arg: ArgType = {
                    targetPropList,
                    value: valueNode,
                };
                const args = new nodes.NodeList(
                    tagNameSymbolToken.lineno,
                    tagNameSymbolToken.colno,
                );
                args.addChild(this.value2node(
                    nodes,
                    arg,
                    tagNameSymbolToken.lineno,
                    tagNameSymbolToken.colno,
                ));
                const contentArgs = !valueNode && bodyNodeList ? [bodyNodeList] : [];
                nodeList.addChild(
                    new nodes.CallExtension(
                        this,
                        'runAssignProperties',
                        args,
                        contentArgs,
                    ),
                );
            }
            if (!(valueNode instanceof nodes.Symbol)) {
                valueNode = targetVars.variables[0];
                bodyNodeList = undefined;
            }
        }

        return nodeList;
    }

    public runAssignProperties(_context: NunjucksExtension.Context, arg: ArgType, body?: () => unknown): string {
        const value = body ? body() : arg.value;
        for (const targetPropData of arg.targetPropList) {
            let obj: Record<string, unknown> | undefined;
            targetPropData.forEach((objectPathItem, index) => {
                const propName: any = objectPathItem.value; // eslint-disable-line @typescript-eslint/no-explicit-any
                const nextIndex = index + 1;
                const nextObjectPathItem = targetPropData[nextIndex];

                if (nextObjectPathItem) {
                    const propValue = obj ? obj[propName] : objectPathItem.value;
                    if (!isObject(propValue)) {
                        const errorMessage = `setProp tag / Cannot be assigned to \`${
                            this.toPropString(targetPropData)
                        }\`! \`${this.toPropString(targetPropData, nextIndex)}\` variable value is ${
                            typeString(propValue)
                        }, not an object`;
                        throw new NunjucksTemplateError(
                            new TypeError(errorMessage),
                            nextObjectPathItem.lineno,
                            nextObjectPathItem.colno,
                        );
                    }
                    obj = propValue;
                } else if (obj) {
                    obj[propName] = value;
                } else {
                    throw new Error(
                        this.getErrorMessage(
                            this.runAssignProperties,
                            `This line should never execute. If thrown this error, the source code is corrupted.`,
                        ),
                    );
                }
            });
        }
        return '';
    }

    private toPropString(objectPath: ObjectPathData, stopIndex?: number): string {
        return (
            (objectPath[0].symbolName
                ?? `(${inspect(objectPath[0].value, { breakLength: Infinity })})`)
            + propString(objectPath.slice(1, stopIndex).map(({ value }) => value))
        );
    }

    private throwError(
        parser: NunjucksExtension.Parser,
        currentMethod: Function, // eslint-disable-line @typescript-eslint/ban-types
        message: string,
        sourceError: NunjucksTemplateError,
    ): never;

    private throwError(
        parser: NunjucksExtension.Parser,
        currentMethod: Function, // eslint-disable-line @typescript-eslint/ban-types
        message: string,
        lineno?: number,
        colno?: number,
    ): never;

    private throwError(
        parser: NunjucksExtension.Parser,
        currentMethod: Function, // eslint-disable-line @typescript-eslint/ban-types
        message: string,
        linenoOrError?: number | NunjucksTemplateError,
        colno?: number,
    ): never {
        let lineno;
        if (typeof linenoOrError === 'number') {
            lineno = linenoOrError;
        } else if (linenoOrError instanceof NunjucksTemplateError) {
            lineno = linenoOrError.lineno;
            colno = linenoOrError.colno;
            /**
             * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L60-L62
             */
            if (typeof lineno === 'number') lineno -= 1;
            /**
             * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L63-L65
             */
            if (typeof colno === 'number') colno -= 1;
        }

        const errorMessage = this.getErrorMessage(currentMethod, message);
        parser.fail(errorMessage, lineno, colno);
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    private getErrorMessage(currentMethod: Function, message: string): string {
        return `${this.constructor.name}#${currentMethod.name}: ${message}`;
    }

    private getObjectPath(
        nodes: NunjucksExtension.Nodes,
        lookupValNode: NunjucksNodes.LookupVal | NonNullable<NunjucksNodes.LookupVal['target']>,
    ): ObjectPathData<
        | NunjucksNodes.Symbol
        | Exclude<NonNullable<NunjucksNodes.LookupVal['target']>, NunjucksNodes.LookupVal>
        | NunjucksNodes.LookupVal['val']
    > {
        if (lookupValNode instanceof nodes.LookupVal) {
            const targetList = lookupValNode.target ? this.getObjectPath(nodes, lookupValNode.target) : [];
            return targetList.concat({
                value: lookupValNode.val,
                symbolName: lookupValNode.val instanceof nodes.Symbol ? lookupValNode.val.value : undefined,
                lineno: lookupValNode.lineno + 1,
                colno: lookupValNode.colno + 1,
            });
        } else {
            return [{
                value: lookupValNode,
                symbolName: lookupValNode instanceof nodes.Symbol ? lookupValNode.value : undefined,
                lineno: lookupValNode.lineno + 1,
                colno: lookupValNode.colno + 1,
            }];
        }
    }

    private value2node(
        nodes: NunjucksExtension.Nodes,
        value: unknown,
        lineno: number,
        colno: number,
    ): NunjucksNodes.AllNodeType {
        if (value instanceof nodes.Node) {
            return value;
        } else if (Array.isArray(value)) {
            return new nodes.Array(
                lineno,
                colno,
                value.map(v => this.value2node(nodes, v, lineno, colno)) as NunjucksNodes.Array['children'],
            );
        } else if (isObject(value)) {
            return new nodes.Dict(
                lineno,
                colno,
                Object.entries(value).map(([prop, value]) =>
                    new nodes.Pair(
                        lineno,
                        colno,
                        this.value2node(nodes, prop, lineno, colno) as NunjucksNodes.Literal,
                        this.value2node(nodes, value, lineno, colno) as ReturnType<
                            NunjucksExtension.Parser['parseExpression']
                        >,
                    )
                ),
            );
        } else {
            return new nodes.Literal(lineno, colno, value);
        }
    }
}
