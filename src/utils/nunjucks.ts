import { inspect } from 'util';

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
