// Type definitions for nunjucks 3.2.1
// Project: https://github.com/mozilla/nunjucks
// Definitions by: sounisi5011 <https://github.com/sounisi5011>

import * as lib from 'nunjucks/src/lib';

import { Extension } from '../../';
import * as lexer from './lexer';
import * as nodes from './nodes';
import { Obj } from './object';

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L8-L1343 Source}
 */
export class Parser extends Obj {
    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L9-L16 Source}
     */
    constructor(tokens: Parser['tokens']);

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L10 Source}
     */
    public readonly tokens: lexer.Tokenizer;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L11 Source}
     */
    public readonly peeked: null | lexer.Token;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L12 Source}
     */
    public readonly breakOnBlocks: null | readonly string[];

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L13 Source}
     */
    public readonly dropLeadingWhitespace: boolean;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L15 Source}
     */
    public readonly extensions: Extension[];

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L18-L40 Source}
     */
    nextToken(withWhitespace?: boolean): null | lexer.Token;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L42-L45 Source}
     */
    peekToken(): null | lexer.Token;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L47-L52 Source}
     */
    pushToken(tok: lexer.Token): void;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L54-L67 Source}
     */
    error<TMessage extends string | Error>(
        msg: TMessage,
        lineno?: number,
        colno?: number,
    ): lib.TemplateError<TMessage>;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L69-L71 Source}
     */
    fail(msg: string | Error, lineno?: number, colno?: number): never;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L73-L80 Source}
     */
    skip(type: lexer.TokenType): boolean;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L82-L90 Source}
     */
    expect(type: lexer.TokenType): null | lexer.Token;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L92-L99 Source}
     */
    skipValue<TTokenType extends lexer.TokenType>(
        type: TTokenType,
        val: lexer.TokenFromType<TTokenType>['value'],
    ): boolean;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L101-L103 Source}
     */
    skipSymbol(val: string): boolean;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L105-L133 Source}
     */
    advanceAfterBlockEnd(name?: lexer.Token['value']): lexer.Token;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L135-L146 Source}
     */
    advanceAfterVariableEnd(): void;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L148-L204 Source}
     */
    parseFor(): nodes.For | nodes.AsyncEach | nodes.AsyncAll;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L206-L221 Source}
     */
    parseMacro(): nodes.Macro;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L223-L261 Source}
     */
    parseCall(): nodes.Output;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L263-L283 Source}
     */
    parseWithContext(): boolean | null;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L285-L312 Source}
     */
    parseImport(): nodes.Import;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L314-L382 Source}
     */
    parseFrom(): nodes.FromImport;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L384-L413 Source}
     */
    parseBlock(): nodes.Block;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L415-L427 Source}
     */
    parseExtends(): nodes.Extends;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L429-L445 Source}
     */
    parseInclude(): nodes.Include;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L447-L486 Source}
     */
    parseIf(): nodes.If | nodes.IfAsync;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L488-L525 Source}
     */
    parseSet(): nodes.Set;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L527-L593 Source}
     */
    parseSwitch(): nodes.Switch;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L595-L653 Source}
     */
    parseStatement():
        | null
        | ReturnType<
              | this[
                    | 'parseRaw'
                    | 'parseIf'
                    | 'parseFor'
                    | 'parseBlock'
                    | 'parseExtends'
                    | 'parseInclude'
                    | 'parseSet'
                    | 'parseMacro'
                    | 'parseCall'
                    | 'parseImport'
                    | 'parseFrom'
                    | 'parseFilterStatement'
                    | 'parseSwitch']
              | Extension['parse']
          >
        | undefined;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L655-L698 Source}
     */
    parseRaw(tagName: string): nodes.Output;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L700-L751 Source}
     * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L1058
     */
    parsePostfix<
        TNode extends
            | nodes.Literal
            | nodes.Symbol
            | ReturnType<this['parseAggregate']>
    >(node: TNode): ParsePostfixRetVal<TNode>;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L753-L756 Source}
     */
    parseExpression(): ReturnType<this['parseInlineIf']>;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L758-L774 Source}
     */
    parseInlineIf(): ReturnType<this['parseOr']> | nodes.InlineIf;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L776-L786 Source}
     */
    parseOr(): ReturnType<this['parseAnd']> | nodes.Or;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L788-L798 Source}
     */
    parseAnd(): ReturnType<this['parseNot']> | nodes.And;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L800-L808 Source}
     */
    parseNot(): nodes.Not | ReturnType<this['parseIn']>;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L810-L843 Source}
     */
    parseIn(): ReturnType<this['parseIs']> | nodes.In | nodes.Not;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L845-L864 Source}
     */
    parseIs(): ReturnType<this['parseCompare']> | nodes.In | nodes.Not;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L866-L895 Source}
     */
    parseCompare(): nodes.Compare | ReturnType<this['parseConcat']>;

    /**
     * finds the '~' for string concatenation
     *
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L897-L908 Source}
     */
    parseConcat(): ReturnType<this['parseAdd']> | nodes.Concat;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L910-L920 Source}
     */
    parseAdd(): ReturnType<this['parseSub']> | nodes.Add;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L922-L932 Source}
     */
    parseSub(): ReturnType<this['parseMul']> | nodes.Sub;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L934-L944 Source}
     */
    parseMul(): ReturnType<this['parseDiv']> | nodes.Mul;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L946-L956 Source}
     */
    parseDiv(): ReturnType<this['parseFloorDiv']> | nodes.Div;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L958-L968 Source}
     */
    parseFloorDiv(): ReturnType<this['parseMod']> | nodes.FloorDiv;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L970-L980 Source}
     */
    parseMod(): ReturnType<this['parsePow']> | nodes.Mod;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L982-L992 Source}
     */
    parsePow(): ReturnType<this['parseUnary']> | nodes.Pow;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L994-L1015 Source}
     */
    parseUnary(): ParseFilterRetVal<
        nodes.Neg | nodes.Pos | ReturnType<this['parsePrimary']>
    >;

    parseUnary(
        noFilters: true,
    ): nodes.Neg | nodes.Pos | ReturnType<this['parsePrimary']>;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L1017-L1066 Source}
     */
    parsePrimary(
        noPostfix: true,
    ): NonNullable<
        nodes.Literal | nodes.Symbol | ReturnType<this['parseAggregate']>
    >;

    parsePrimary(): NonNullable<
        ParsePostfixRetVal<
            nodes.Literal | nodes.Symbol | ReturnType<this['parseAggregate']>
        >
    >;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L1068-L1077 Source}
     */
    parseFilterName(): nodes.Symbol;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L1079-L1087 Source}
     */
    parseFilterArgs(
        node: Parameters<this['parsePostfix']>[0],
    ): nodes.NodeList['children'] | [];

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L1089-L1106 Source}
     */
    parseFilter<TNode>(node: TNode): ParseFilterRetVal<TNode>;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L1108-L1141 Source}
     */
    parseFilterStatement(): nodes.Output;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L1143-L1204 Source}
     */
    parseAggregate(): null | nodes.Group | nodes.Array | nodes.Dict;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L1206-L1260 Source}
     */
    parseSignature(tolerant?: null, noParens?: true): nodes.NodeList;
    parseSignature(tolerant: true, noParens?: true): null | nodes.NodeList;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L1262-L1270 Source}
     */
    parseUntilBlocks(...blockNames: string[]): ReturnType<this['parse']>;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L1272-L1334 Source}
     */
    parseNodes(): (
        | nodes.Output
        | NonNullable<ReturnType<this['parseStatement']>>
    )[];

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L1336-L1338 Source}
     */
    parse(): nodes.NodeList;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L1340-L1342 Source}
     */
    parseAsRoot(): nodes.Root;
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L700-L751 Source}
 */
type ParsePostfixRetVal<TNode> = nodes.FunCall | nodes.LookupVal | TNode;

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L1089-L1106 Source}
 */
type ParseFilterRetVal<TNode> = nodes.Filter | TNode;

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L1360-L1366 Source}
 */
export function parse(
    src: string,
    extensions?: Extension[],
    opts?: lexer.TokenizerOptions,
): ReturnType<Parser['parseAsRoot']>;
