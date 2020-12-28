import { promises as fsP } from 'fs'; // eslint-disable-line node/no-unsupported-features/node-builtins
import { relative as relativePath, resolve as resolvePath } from 'path';
import { inspect } from 'util';

export type PromiseValue<T extends Promise<unknown>> = T extends Promise<infer P> ? P : never;

export type isArray = (value: unknown) => value is readonly unknown[];

export function isObject(value: unknown): value is Record<PropertyKey, unknown> {
    return typeof value === 'object' && value !== null;
}

export function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value !== '';
}

export function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(v => typeof v === 'string');
}

/**
 * Check if a string is a valid ECMAScript 2018 identifier name
 * @see https://www.ecma-international.org/ecma-262/9.0/index.html#prod-IdentifierName
 */
export function isValidIdentifierName(str: string): boolean {
    return /^[\p{ID_Start}$_][\p{ID_Continue}$\u{200C}\u{200D}]*$/u.test(str);
}

export function typeString(value: unknown): string {
    return value === null ? 'null' : typeof value;
}

export function hasProp<P extends PropertyKey>(obj: unknown, prop: P): obj is Record<P, unknown> {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function validateString(value: unknown, error: Error): asserts value is string {
    if (typeof value !== 'string') throw error;
}

export function indent(value: string | readonly string[], indentValue: number | string = 2): string {
    const text = (Array.isArray as isArray)(value) ? value.join('\n') : value;
    const indentStr = typeof indentValue === 'number' ? ' '.repeat(indentValue) : indentValue;
    return text.replace(
        /(^|\r\n?|\n)([^\r\n]?)/g,
        (_, lbChar, nextChar) =>
            nextChar
                ? `${String(lbChar)}${indentStr}${String(nextChar)}`
                : `${String(lbChar)}${indentStr.replace(/\s+$/, '')}`,
    );
}

export function lastItem<TItem>(list: readonly TItem[]): TItem | undefined {
    return list[list.length - 1];
}

export function inspectValue(value: unknown, { depth }: { depth?: number } = {}): string {
    return inspect(value, { breakLength: Infinity, depth });
}

export function propString(objectPath: unknown[]): string {
    return objectPath
        .map(propName =>
            typeof propName === 'string' && isValidIdentifierName(propName)
                ? `.${propName}`
                : `[${inspectValue(propName)}]`
        )
        .join('');
}

export function catchError<TValue>(callback: () => TValue): TValue | undefined;
export function catchError<TValue, TDefault>(
    callback: () => TValue,
    defaultValue: TDefault,
): TValue | TDefault;
export function catchError<TValue, TDefault = undefined>(
    callback: () => TValue,
    defaultValue?: TDefault,
): TValue | TDefault {
    try {
        return callback();
    } catch (_) {
        return defaultValue as TDefault;
    }
}

export function cachedPromise<T>(fn: () => Promise<T>): () => Promise<T> {
    let cache: Promise<T> | undefined;
    return async () => {
        if (!cache) cache = fn();
        return await cache;
    };
}

export const readFileAsync = fsP.readFile;
export const writeFileAsync = fsP.writeFile;

export const cwdRelativePath = relativePath.bind(null, process.cwd());

export function tryRequire(filepath: string): unknown {
    return catchError(() => require(resolvePath(filepath)));
}

export function errorMsgTag(template: TemplateStringsArray, ...substitutions: unknown[]): string {
    return template
        .map((str, index) =>
            index === 0
                ? str
                : (
                    inspect(substitutions[index - 1], {
                        depth: 0,
                        breakLength: Infinity,
                        maxArrayLength: 5,
                    })
                ) + str
        )
        .join('');
}
