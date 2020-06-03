// Type definitions for nunjucks 3.2.1
// Project: https://github.com/mozilla/nunjucks
// Definitions by: sounisi5011 <https://github.com/sounisi5011>

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lib.js#L47-L125 Source}
 */
export class TemplateError<
    TMessage extends string | Error = string | Error,
    TLineno extends number = number,
    TColno extends number = number
> extends Error {
    constructor(message: TMessage, lineno: TLineno, colno: TColno);

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lib.js#L68-L70 Source}
     */
    name: 'Template render error';

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lib.js#L93-L95 Source}
     */
    cause: TMessage extends Error ? TMessage : undefined;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lib.js#L97 Source}
     */
    lineno: TLineno;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lib.js#L98 Source}
     */
    colno: TColno;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lib.js#L99 Source}
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lib.js#L120 Source}
     */
    firstUpdate: boolean;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/lib.js#L101-L122 Source}
     */
    Update(path?: string): this;
}
