import * as environment from './nunjucks/src/environment';
import * as lexer from './nunjucks/src/lexer';
import * as nodes from './nunjucks/src/nodes';
import * as parser from './nunjucks/src/parser';

export interface Extension {
    /**
     * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L644
     */
    tags: string[];

    /**
     * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/parser.js#L645
     */
    parse(parser: Extension.Parser, nodes: Extension.Nodes, lexer: Extension.Lexer): Extension.ParseResult;
}

export namespace Extension {
    export type Parser = parser.Parser;

    export type Nodes = typeof nodes;

    export type Lexer = typeof lexer;

    export type ParseResult = nodes.AllNodeType;

    export type Context = environment.Context;
}
