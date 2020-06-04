import * as nunjucks from 'nunjucks';
import * as util from 'util';

import type { Extension as NunjucksExtension } from '../types/nunjucks-extension';
import type * as NunjucksNodes from '../types/nunjucks-extension/nunjucks/src/nodes';
import { isObject } from '../utils';

function isNonNullable<TValue>(value: TValue): value is NonNullable<TValue> {
    return value !== null && value !== undefined;
}

export default class SetPropExtension implements NunjucksExtension {
    public tags = ['setProp'];

    public parse(
        parser: NunjucksExtension.Parser,
        nodes: NunjucksExtension.Nodes,
        // lexer: NunjucksExtension.Lexer,
    ): NunjucksExtension.ParseResult {
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
                if (
                    childNode instanceof nodes.LookupVal ||
                    childNode instanceof nodes.Symbol
                ) {
                    const objectPath = getObjectPath(childNode);
                    return objectPath;
                }
                return null;
            })
            .filter(isNonNullable);

        return new nodes.CallExtension(
            this,
            'run',
            new nodes.NodeList(argsNodeList.lineno, argsNodeList.colno, [
                value2node(
                    {
                        objectPathList,
                    },
                    argsNodeList.lineno,
                    argsNodeList.colno,
                ),
            ]),
            [bodyNodeList],
        );
    }

    public run(
        context: {
            env: unknown;
            ctx: Record<string, unknown>;
            blocks: unknown;
            exported: unknown;
        },
        arg: { objectPathList: string[][] },
        body: () => string,
    ): nunjucks.runtime.SafeString {
        const bodyStr = body();

        for (const objectPath of arg.objectPathList) {
            let obj: Record<string, unknown> = context.ctx;
            objectPath.forEach((propName, index) => {
                const isLast = objectPath.length - 1 === index;

                if (isLast) {
                    obj[propName] = bodyStr;
                } else {
                    const o = obj[propName];
                    if (!isObject(o)) {
                        throw new TypeError(
                            'setProp tag / Cannot be assigned to `' +
                                this.toPropString(objectPath) +
                                '`! `' +
                                this.toPropString(
                                    objectPath.slice(0, index + 1),
                                ) +
                                '` variable value is ' +
                                (o === null ? 'null' : typeof o) +
                                ', not an object',
                        );
                    }
                    obj = o;
                }
            });
        }

        return new nunjucks.runtime.SafeString('');
    }

    private toPropString(objectPath: string[]): string {
        /**
         * @see https://www.ecma-international.org/ecma-262/9.0/index.html#prod-IdentifierName
         */
        const ECMAScript2018IdentifierNameRegExp = /^[\p{ID_Start}$_][\p{ID_Continue}$\u{200C}\u{200D}]*$/u;

        return objectPath
            .map((propName, index) =>
                ECMAScript2018IdentifierNameRegExp.test(propName)
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
        const getObjectPath = (
            lookupValNode: NunjucksNodes.Symbol | NunjucksNodes.LookupVal,
        ): NunjucksPropertyKey[] =>
            lookupValNode instanceof nodes.LookupVal
                ? [
                      ...getObjectPath(lookupValNode.target),
                      lookupValNode.val.value,
                  ]
                : [lookupValNode.value];
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
