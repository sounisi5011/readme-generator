// Type definitions for nunjucks 3.2.1
// Project: https://github.com/mozilla/nunjucks
// Definitions by: sounisi5011 <https://github.com/sounisi5011>

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/object.js#L42-L61 Source}
 */
export class Obj<TTypeName extends string = string> {
    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/object.js#L48 Source}
     */
    private init(...args: unknown[]): void;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/object.js#L50-L52 Source}
     */
    get typename(): TTypeName;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/object.js#L54-L60 Source}
     *
     * @todo It is necessary to correct the return type definition.
     *       This method returns a constructor function rather than an instance of the object.
     */
    static extend(props?: Record<string, unknown>): Obj<'anonymous'>;
    static extend<TTypeName extends string>(name: TTypeName, props?: Record<string, unknown>): Obj<TTypeName>;
}
