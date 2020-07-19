import { version as nodeVersion } from 'process';

import escapeStringRegexp from 'escape-string-regexp';
import { stringMatching } from 'expect'; // eslint-disable-line import/no-extraneous-dependencies, node/no-extraneous-import
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import * as semver from 'semver'; // eslint-disable-line import/no-extraneous-dependencies, node/no-extraneous-import

import { isObject } from '../../src/utils';
import type { isArray } from '../../src/utils';

interface OptionsObject {
    nodeWarning?: true;
    pkg?: true;
    repository?: true;
    pkgLock?: true;
}

type OptionsItemType = null | undefined | string | RegExp | OptionsObject;

type OptionsType = OptionsItemType | readonly OptionsItemType[];

/**
 * @see https://github.com/mysticatea/eslint-plugin-node/blob/cd97880ca2792db47c7952ac517e9e32d2ec783e/lib/rules/no-unsupported-features/node-builtins.js#L136-L142
 * @see https://github.com/nodejs/node/blob/193dfa94a81216d39519197624360b6a7ec3909a/doc/changelogs/CHANGELOG_V10.md#10.17.0
 * @see https://github.com/nodejs/node/blob/193dfa94a81216d39519197624360b6a7ec3909a/doc/changelogs/CHANGELOG_V11.md#2019-04-11-version-11140-current-bethgriggs
 */
const IS_STABLE_FS_PROMISES = semver.satisfies(nodeVersion.replace(/^v/, ''), '^10.17.0 || >=11.14.0');

function isStringArray(array: unknown[]): array is string[];
function isStringArray(array: readonly unknown[]): array is readonly string[];
function isStringArray(array: readonly unknown[]): array is readonly string[] {
    return array.every(item => typeof item === 'string');
}

function genWarnPattern(options: OptionsType): string | RegExp {
    const patternList: Array<string | RegExp> = [];
    const optionsList = (Array.isArray as isArray)(options)
        ? [...options]
        : [options];
    if (!optionsList.some(options => isObject(options) && (options as OptionsObject).nodeWarning)) {
        optionsList.unshift({ nodeWarning: true });
    }
    for (const options of optionsList) {
        if (typeof options === 'string' || options instanceof RegExp) {
            patternList.push(options);
        } else if (options !== null && options !== undefined) {
            if (options.nodeWarning) {
                if (!IS_STABLE_FS_PROMISES) {
                    patternList.push(
                        new RegExp(
                            String.raw`\(node:[0-9]+\) ${
                                escapeStringRegexp('ExperimentalWarning: The fs.promises API is experimental')
                            }`,
                        ),
                    );
                }
            }
            if (options.pkg) {
                patternList.push(`Failed to read file 'package.json'`);
            } else if (options.repository) {
                patternList.push(
                    `Failed to detect remote repository. 'repository' field does not exist in 'package.json' file.`,
                );
            }
            if (options.pkgLock) {
                patternList.push(`Failed to read file 'package-lock.json'`);
            }
        }
    }
    return isStringArray(patternList)
        ? patternList.join('\n')
        : new RegExp(
            `^${
                patternList
                    .map(pattern => pattern instanceof RegExp ? pattern.source : escapeStringRegexp(pattern))
                    .join('\n')
            }$`,
        );
}

export function genWarnRegExp(options: OptionsType): RegExp {
    const pattern = genWarnPattern(options);
    return typeof pattern === 'string' ? new RegExp(`^${escapeStringRegexp(pattern)}$`) : pattern;
}

export default function genWarn(options: OptionsType): string | ReturnType<typeof stringMatching> {
    const pattern = genWarnPattern(options);
    return pattern instanceof RegExp ? stringMatching(pattern) : pattern;
}
