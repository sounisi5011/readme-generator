import { Environment } from 'nunjucks';

import { Obj } from './object';

interface Block {
    /**
     * @see https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/environment.js#L394
     */
    (
        env: unknown,
        context: Context,
        frame: unknown,
        runtime: unknown,
        cb: unknown,
    ): void;
}

/**
 * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/environment.js#L337-L408 Source}
 */
declare class Context extends Obj {
    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/environment.js#L339-L340 Source}
     */
    public env: Environment;
    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/environment.js#L342-L343 Source}
     */
    public ctx: Record<Exclude<PropertyKey, symbol>, unknown>;
    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/environment.js#L345 Source}
     */
    public blocks: Record<PropertyKey, Block[]>;
    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/environment.js#L346 Source}
     */
    public exported: (keyof this['ctx'])[];

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/environment.js#L353-L361 Source}
     */
    public lookup(name: keyof this['ctx']): unknown;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/environment.js#L363-L365 Source}
     */
    public setVariable(name: keyof this['ctx'], val: unknown): void;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/environment.js#L367-L369 Source}
     */
    public getVariables(): this['ctx'];

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/environment.js#L371-L375 Source}
     */
    public addBlock(name: keyof this['blocks'], block: Block): this;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/environment.js#L377-L383 Source}
     */
    public getBlock(name: keyof this['blocks']): Block;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/environment.js#L385-L395 Source}
     */
    public getSuper(
        env: Parameters<Block>[0],
        name: keyof this['blocks'],
        block: Block,
        frame: Parameters<Block>[2],
        runtime: Parameters<Block>[3],
        cb: Parameters<Block>[4],
    ): void;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/environment.js#L397-L399 Source}
     */
    public addExport(name: this['exported'][number]): void;

    /**
     * {@link https://github.com/mozilla/nunjucks/blob/v3.2.1/nunjucks/src/environment.js#L401-L407 Source}
     */
    public getExported(): Record<this['exported'][number], this['ctx'][keyof this['ctx']]>;
}

export type { Context };
