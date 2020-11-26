import { inspect } from 'util';

import { indent, isObject } from '.';

function setProp(obj: unknown, propName: PropertyKey, value: unknown, enumerable = true): void {
    Object.defineProperty(obj, propName, {
        configurable: true,
        enumerable,
        writable: true,
        value,
    });
}

function isError(error: unknown, constructorName: string): error is Error & Record<PropertyKey, unknown> {
    return error instanceof Error && error.constructor.name === constructorName;
}

function genErrerMessage(
    { statusCode, headers, messageBodyStr }: {
        statusCode: number;
        headers: Record<PropertyKey, unknown>;
        messageBodyStr: string;
    },
): string {
    return [
        `HTTP ${statusCode}`,
        indent([
            ...(
                Object.entries(headers)
                    .filter(([name]) => /^x-(?!(?:frame-options|content-type-options|xss-protection)$)/i.test(name))
                    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
                    .map(([name, value]) => `${name}: ${String(value)}`)
            ),
            `body:`,
            indent(messageBodyStr),
        ]),
    ].join('\n');
}

export async function bentErrorFixer(error: unknown): Promise<never> {
    if (
        isError(error, 'StatusError')
        && typeof error.statusCode === 'number' && typeof error.text === 'function' && isObject(error.headers)
    ) {
        setProp(error, 'name', error.constructor.name, false);

        const errorBody = await error.text();
        setProp(error, 'body', errorBody);
        delete error.text;
        let messageBodyStr = errorBody;

        if (typeof error.arrayBuffer === 'function') delete error.arrayBuffer;
        if (typeof error.json === 'function') {
            try {
                Object.defineProperty(error, 'body', { value: JSON.parse(errorBody) });
                messageBodyStr = inspect(error.body);
            } catch {
                //
            }
            delete error.json;
        }

        setProp(
            error,
            'message',
            genErrerMessage({ statusCode: error.statusCode, headers: error.headers, messageBodyStr }),
            false,
        );
    }

    // eslint-disable-next-line @typescript-eslint/return-await
    return Promise.reject(error);
}
