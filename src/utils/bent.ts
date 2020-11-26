import { inspect } from 'util';

import { indent, isObject } from '.';

export async function bentErrorFixer<T>(error: T): Promise<T> {
    if (!(error instanceof Error)) return error;
    if (!isObject(error)) return error;

    if (
        error.constructor.name === 'StatusError' && typeof error.statusCode === 'number'
        && typeof error.text === 'function' && isObject(error.headers)
    ) {
        Object.defineProperty(error, 'name', {
            configurable: true,
            enumerable: false,
            writable: true,
            value: error.constructor.name,
        });

        const errorBody = await error.text();
        Object.defineProperty(error, 'body', {
            configurable: true,
            enumerable: true,
            writable: true,
            value: errorBody,
        });
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

        Object.defineProperty(error, 'message', {
            configurable: true,
            enumerable: false,
            writable: true,
            value: [
                `HTTP ${error.statusCode}`,
                indent([
                    ...(
                        Object.entries(error.headers).filter(([name]) =>
                            /^x-(?!(?:frame-options|content-type-options|xss-protection)$)/i.test(name)
                        ).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([name, value]) =>
                            `${name}: ${String(value)}`
                        )
                    ),
                    `body:`,
                    indent(messageBodyStr),
                ]),
            ].join('\n'),
        });
    }

    return error;
}
