// Type definitions for nunjucks 3.2.1
// Project: https://github.com/mozilla/nunjucks
// Definitions by: sounisi5011 <https://github.com/sounisi5011>

declare const TOKEN_STRING = 'string';
declare const TOKEN_WHITESPACE = 'whitespace';
declare const TOKEN_DATA = 'data';
declare const TOKEN_BLOCK_START = 'block-start';
declare const TOKEN_BLOCK_END = 'block-end';
declare const TOKEN_VARIABLE_START = 'variable-start';
declare const TOKEN_VARIABLE_END = 'variable-end';
declare const TOKEN_COMMENT = 'comment';
declare const TOKEN_LEFT_PAREN = 'left-paren';
declare const TOKEN_RIGHT_PAREN = 'right-paren';
declare const TOKEN_LEFT_BRACKET = 'left-bracket';
declare const TOKEN_RIGHT_BRACKET = 'right-bracket';
declare const TOKEN_LEFT_CURLY = 'left-curly';
declare const TOKEN_RIGHT_CURLY = 'right-curly';
declare const TOKEN_OPERATOR = 'operator';
declare const TOKEN_COMMA = 'comma';
declare const TOKEN_COLON = 'colon';
declare const TOKEN_TILDE = 'tilde';
declare const TOKEN_PIPE = 'pipe';
declare const TOKEN_INT = 'int';
declare const TOKEN_FLOAT = 'float';
declare const TOKEN_BOOLEAN = 'boolean';
declare const TOKEN_NONE = 'none';
declare const TOKEN_SYMBOL = 'symbol';
declare const TOKEN_SPECIAL = 'special';
declare const TOKEN_REGEX = 'regex';

declare type TokenType =
    | typeof TOKEN_STRING
    | typeof TOKEN_WHITESPACE
    | typeof TOKEN_BLOCK_END
    | typeof TOKEN_VARIABLE_END
    | typeof TOKEN_REGEX
    | typeof TOKEN_LEFT_PAREN
    | typeof TOKEN_RIGHT_PAREN
    | typeof TOKEN_LEFT_BRACKET
    | typeof TOKEN_RIGHT_BRACKET
    | typeof TOKEN_LEFT_CURLY
    | typeof TOKEN_RIGHT_CURLY
    | typeof TOKEN_COMMA
    | typeof TOKEN_COLON
    | typeof TOKEN_TILDE
    | typeof TOKEN_PIPE
    | typeof TOKEN_OPERATOR
    | typeof TOKEN_FLOAT
    | typeof TOKEN_INT
    | typeof TOKEN_BOOLEAN
    | typeof TOKEN_NONE
    | typeof TOKEN_SYMBOL
    | typeof TOKEN_BLOCK_START
    | typeof TOKEN_VARIABLE_START
    | typeof TOKEN_COMMENT
    | typeof TOKEN_DATA
    | typeof TOKEN_SPECIAL;

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L44-L49 Source}
 */
interface TokenBase {
    type: TokenType;
    value: unknown;
    lineno: number;
    colno: number;
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L92 Source}
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L95 Source}
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L122 Source}
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L127 Source}
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L180-L215 Source}
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L225 Source}
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L227 Source}
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L243 Source}
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L262 Source}
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L266 Source}
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L325-L328 Source}
 */
interface TokenDefault extends TokenBase {
    type:
        | typeof TOKEN_STRING
        | typeof TOKEN_WHITESPACE
        | typeof TOKEN_BLOCK_END
        | typeof TOKEN_VARIABLE_END
        | typeof TOKEN_LEFT_PAREN
        | typeof TOKEN_RIGHT_PAREN
        | typeof TOKEN_LEFT_BRACKET
        | typeof TOKEN_RIGHT_BRACKET
        | typeof TOKEN_LEFT_CURLY
        | typeof TOKEN_RIGHT_CURLY
        | typeof TOKEN_COMMA
        | typeof TOKEN_COLON
        | typeof TOKEN_TILDE
        | typeof TOKEN_PIPE
        | typeof TOKEN_OPERATOR
        | typeof TOKEN_FLOAT
        | typeof TOKEN_INT
        | typeof TOKEN_SYMBOL
        | typeof TOKEN_BLOCK_START
        | typeof TOKEN_VARIABLE_START
        | typeof TOKEN_COMMENT
        | typeof TOKEN_DATA;
    value: string;
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L158-L161 Source}
 */
interface TokenRegex extends TokenBase {
    type: typeof TOKEN_REGEX;
    value: {
        body: string;
        flags: string;
    };
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L229-L230 Source}
 */
interface TokenBoolean extends TokenBase {
    type: typeof TOKEN_BOOLEAN;
    value: 'true' | 'false';
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L231-L241 Source}
 */
interface TokenNone extends TokenBase {
    type: typeof TOKEN_NONE;
    value: 'none' | 'null';
}

type Token = TokenDefault | TokenRegex | TokenBoolean | TokenNone;

interface TokenizerOptions {
    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L64-L72 Source}
     */
    tags?: {
        blockStart?: string;
        blockEnd?: string;
        variableStart?: string;
        variableEnd?: string;
        commentStart?: string;
        commentEnd?: string;
    };

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L74 Source}
     */
    trimBlocks?: boolean;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L75 Source}
     */
    lstripBlocks?: boolean;
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L52-L506 Source}
 */
declare class Tokenizer {
    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L54 Source}
     */
    public readonly str: string;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L55 Source}
     */
    public readonly index: number;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L56 Source}
     */
    public readonly len: number;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L57 Source}
     */
    public readonly lineno: number;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L58 Source}
     */
    public readonly colno: number;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L60 Source}
     */
    public readonly in_code: boolean; // eslint-disable-line camelcase

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L65-L72 Source}
     */
    public readonly tags: {
        readonly BLOCK_START: string;
        readonly BLOCK_END: string;
        readonly VARIABLE_START: string;
        readonly VARIABLE_END: string;
        readonly COMMENT_START: string;
        readonly COMMENT_END: string;
    };

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L74 Source}
     */
    public readonly trimBlocks: boolean;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L75 Source}
     */
    public readonly lstripBlocks: boolean;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L53-L76 Source}
     */
    constructor(str: Tokenizer['str'], opts?: TokenizerOptions);

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L78-L331 Source}
     */
    nextToken(): null | Token;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L443-L445 Source}
     */
    isFinished(): boolean;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L447-L451 Source}
     */
    forwardN(n: number): void;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L453-L462 Source}
     */
    forward(): void;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L464-L468 Source}
     */
    backN(n: number): void;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L470-L485 Source}
     */
    back(): void;

    /**
     * current returns current character
     *
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L487-L493 Source}
     */
    current(): string;

    /**
     * currentStr returns what's left of the unparsed string
     *
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L495-L501 Source}
     */
    currentStr(): string;

    /**
     * previous returns previous character
     *
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L503-L505 Source}
     */
    previous(): string;
}

export type { TokenType, Token, Tokenizer, TokenizerOptions };

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lexer.js#L509-L511 Source}
 */
export function lex(src: string, opts?: TokenizerOptions): Tokenizer;

export {
    TOKEN_STRING,
    TOKEN_WHITESPACE,
    TOKEN_DATA,
    TOKEN_BLOCK_START,
    TOKEN_BLOCK_END,
    TOKEN_VARIABLE_START,
    TOKEN_VARIABLE_END,
    TOKEN_COMMENT,
    TOKEN_LEFT_PAREN,
    TOKEN_RIGHT_PAREN,
    TOKEN_LEFT_BRACKET,
    TOKEN_RIGHT_BRACKET,
    TOKEN_LEFT_CURLY,
    TOKEN_RIGHT_CURLY,
    TOKEN_OPERATOR,
    TOKEN_COMMA,
    TOKEN_COLON,
    TOKEN_TILDE,
    TOKEN_PIPE,
    TOKEN_INT,
    TOKEN_FLOAT,
    TOKEN_BOOLEAN,
    TOKEN_NONE,
    TOKEN_SYMBOL,
    TOKEN_SPECIAL,
    TOKEN_REGEX,
};
