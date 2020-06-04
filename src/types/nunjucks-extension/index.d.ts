import * as lexer from './nunjucks/src/lexer';
import * as nodes from './nunjucks/src/nodes';
import * as parser from './nunjucks/src/parser';

export interface Extension {
    tags: string[];
    parse(
        parser: Extension.Parser,
        nodes: Extension.Nodes,
        lexer: Extension.Lexer,
    ): Extension.ParseResult;
}

export namespace Extension {
    export type Parser = parser.Parser;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/nodes.js#L211-L270 Source}
     */
    export interface Nodes {
        Node: typeof nodes.Node;
        Root: typeof nodes.Root;
        NodeList: typeof nodes.NodeList;
        Value: typeof nodes.Value;
        Literal: typeof nodes.Literal;
        Symbol: typeof nodes.Symbol;
        Group: typeof nodes.Group;
        Array: typeof nodes.Node;
        Pair: typeof nodes.Pair;
        Dict: typeof nodes.Dict;
        Output: typeof nodes.Output;
        Capture: typeof nodes.Capture;
        TemplateData: typeof nodes.TemplateData;
        If: typeof nodes.If;
        IfAsync: typeof nodes.IfAsync;
        InlineIf: typeof nodes.InlineIf;
        For: typeof nodes.For;
        AsyncEach: typeof nodes.AsyncEach;
        AsyncAll: typeof nodes.AsyncAll;
        Macro: typeof nodes.Macro;
        Caller: typeof nodes.Caller;
        Import: typeof nodes.Import;
        FromImport: typeof nodes.FromImport;
        FunCall: typeof nodes.FunCall;
        Filter: typeof nodes.Filter;
        FilterAsync: typeof nodes.FilterAsync;
        KeywordArgs: typeof nodes.KeywordArgs;
        Block: typeof nodes.Block;
        Super: typeof nodes.Super;
        Extends: typeof nodes.Extends;
        Include: typeof nodes.Include;
        Set: typeof nodes.Set;
        Switch: typeof nodes.Switch;
        Case: typeof nodes.Case;
        LookupVal: typeof nodes.LookupVal;
        BinOp: typeof nodes.BinOp;
        In: typeof nodes.In;
        Is: typeof nodes.Is;
        Or: typeof nodes.Or;
        And: typeof nodes.And;
        Not: typeof nodes.Not;
        Add: typeof nodes.Add;
        Concat: typeof nodes.Concat;
        Sub: typeof nodes.Sub;
        Mul: typeof nodes.Mul;
        Div: typeof nodes.Div;
        FloorDiv: typeof nodes.FloorDiv;
        Mod: typeof nodes.Mod;
        Pow: typeof nodes.Pow;
        Neg: typeof nodes.Neg;
        Pos: typeof nodes.Pos;
        Compare: typeof nodes.Compare;
        CompareOperand: typeof nodes.CompareOperand;

        CallExtension: typeof nodes.CallExtension;
        CallExtensionAsync: typeof nodes.CallExtensionAsync;

        printNodes: typeof nodes.printNodes;
    }

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L508-L539 Source}
     */
    export interface Lexer {
        lex: typeof lexer.lex;

        TOKEN_STRING: typeof lexer.TOKEN_STRING;
        TOKEN_WHITESPACE: typeof lexer.TOKEN_WHITESPACE;
        TOKEN_DATA: typeof lexer.TOKEN_DATA;
        TOKEN_BLOCK_START: typeof lexer.TOKEN_BLOCK_START;
        TOKEN_BLOCK_END: typeof lexer.TOKEN_BLOCK_END;
        TOKEN_VARIABLE_START: typeof lexer.TOKEN_VARIABLE_START;
        TOKEN_VARIABLE_END: typeof lexer.TOKEN_VARIABLE_END;
        TOKEN_COMMENT: typeof lexer.TOKEN_COMMENT;
        TOKEN_LEFT_PAREN: typeof lexer.TOKEN_LEFT_PAREN;
        TOKEN_RIGHT_PAREN: typeof lexer.TOKEN_RIGHT_PAREN;
        TOKEN_LEFT_BRACKET: typeof lexer.TOKEN_LEFT_BRACKET;
        TOKEN_RIGHT_BRACKET: typeof lexer.TOKEN_RIGHT_BRACKET;
        TOKEN_LEFT_CURLY: typeof lexer.TOKEN_LEFT_CURLY;
        TOKEN_RIGHT_CURLY: typeof lexer.TOKEN_RIGHT_CURLY;
        TOKEN_OPERATOR: typeof lexer.TOKEN_OPERATOR;
        TOKEN_COMMA: typeof lexer.TOKEN_COMMA;
        TOKEN_COLON: typeof lexer.TOKEN_COLON;
        TOKEN_TILDE: typeof lexer.TOKEN_TILDE;
        TOKEN_PIPE: typeof lexer.TOKEN_PIPE;
        TOKEN_INT: typeof lexer.TOKEN_INT;
        TOKEN_FLOAT: typeof lexer.TOKEN_FLOAT;
        TOKEN_BOOLEAN: typeof lexer.TOKEN_BOOLEAN;
        TOKEN_NONE: typeof lexer.TOKEN_NONE;
        TOKEN_SYMBOL: typeof lexer.TOKEN_SYMBOL;
        TOKEN_SPECIAL: typeof lexer.TOKEN_SPECIAL;
        TOKEN_REGEX: typeof lexer.TOKEN_REGEX;
    }

    export type ParseResult = nodes.AllNodeType;
}
