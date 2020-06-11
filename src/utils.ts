import { inspect } from 'util';

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

export function lastItem<TItem>(list: readonly TItem[]): TItem | undefined {
    return list[list.length - 1];
}

export function propString(objectPath: unknown[]): string {
    return objectPath
        .map(propName =>
            typeof propName === 'string' && isValidIdentifierName(propName)
                ? `.${propName}`
                : `[${inspect(propName, { breakLength: Infinity })}]`
        )
        .join('');
}
