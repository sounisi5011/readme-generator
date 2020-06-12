import { inspect } from 'util';

export type PromiseValue<T extends Promise<unknown>> = T extends Promise<infer P> ? P : never;

export type isArray = (value: unknown) => value is readonly unknown[];

export function isObject(value: unknown): value is Record<PropertyKey, unknown> {
    return typeof value === 'object' && value !== null;
}

export function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value !== '';
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
