import { resolve as resolvePath } from 'path';

import type hostedGitInfo from 'hosted-git-info';

import { isObject, readFileAsync } from '../utils';
import { errorMsgTag } from '../utils/nunjucks';

export interface RepoData {
    repoType: hostedGitInfo.Hosts;
    fileFullpath: string;
    browseURL: string;
}

interface Options {
    start: RegExp;
    end?: RegExp;
}

function copyRegExp(
    sourceRegExp: RegExp,
    { addFlags = '', deleteFlags = '' }: { addFlags?: string; deleteFlags?: string } = {},
): RegExp {
    return new RegExp(
        sourceRegExp.source,
        (
            sourceRegExp.flags
                .replace(/./g, char => deleteFlags.includes(char) ? '' : char)
        ) + addFlags,
    );
}

function getLinesStartPos(text: string): number[] {
    const lineBreakRegExp = /\r\n?|\n/g;
    const lineStartPosList = [0];
    for (let match; (match = lineBreakRegExp.exec(text));) {
        lineStartPosList.push(match.index + match[0].length);
    }
    return lineStartPosList;
}

function strPos2lineNum(lineStartPosList: readonly number[], strPos: number): number {
    return (
        lineStartPosList.findIndex((lineStartPos, index) => {
            const nextLineStartPos = lineStartPosList[index + 1] ?? Infinity;
            return lineStartPos <= strPos && strPos < nextLineStartPos;
        })
    ) + 1;
}

function isRepoData(value: unknown): value is RepoData {
    return (
        isObject(value)
        && typeof value.repoType === 'string'
        && typeof value.fileFullpath === 'string'
        && typeof value.browseURL === 'string'
    );
}

function isOptions(value: unknown): value is Options {
    return (
        isObject(value)
        && value.start instanceof RegExp
        && (value.end instanceof RegExp || value.end === undefined)
    );
}

const cacheStore = new Map<string, { content: string; lineStartPosList: number[] }>();

export function linesSelectedURLGen({ cwdRelativePath }: { cwdRelativePath: (to: string) => string }) {
    return async function linesSelectedURL(repoData: unknown, options: unknown): Promise<string> {
        if (!isRepoData(repoData)) {
            throw new TypeError(errorMsgTag`Invalid repoData value: ${repoData}`);
        }
        if (!(options instanceof RegExp || isOptions(options))) {
            throw new TypeError(errorMsgTag`Invalid options value: ${options}`);
        }
        const startLineRegExp = copyRegExp(
            options instanceof RegExp ? options : options.start,
            { deleteFlags: 'gy' },
        );
        const endLineRegExp = options instanceof RegExp
            ? null
            : options.end && copyRegExp(options.end, { deleteFlags: 'gy' });
        const isFullMatchMode = options instanceof RegExp;

        const fileFullpath = resolvePath(repoData.fileFullpath);
        let fileData = cacheStore.get(fileFullpath);
        if (!fileData) {
            const fileContent = await readFileAsync(cwdRelativePath(fileFullpath), 'utf8');
            fileData = {
                content: fileContent,
                lineStartPosList: getLinesStartPos(fileContent),
            };
        }
        const { content: fileContent, lineStartPosList } = fileData;

        const [startLineNumber, endLineNumber] = lineStartPosList.reduce(
            (
                [startLineNumber, endLineNumber, triedMatch],
                lineStartPos,
                index,
            ) => {
                const currentLineNumber = index + 1;
                const isTryStartLineMatching = !startLineNumber
                    && (!startLineRegExp.multiline || !triedMatch.start);
                const isTryEndLineMatching = endLineRegExp
                    && !endLineNumber
                    && (!endLineRegExp.multiline || !triedMatch.end);

                if (isTryStartLineMatching || isTryEndLineMatching) {
                    const text = fileContent.substring(lineStartPos);

                    if (isTryStartLineMatching) {
                        const match = startLineRegExp.exec(text);
                        triedMatch.start = true;

                        if (match) {
                            const matchStartPos = lineStartPos + match.index;
                            const matchEndPos = matchStartPos + match[0].length;
                            if (isFullMatchMode) {
                                startLineNumber = strPos2lineNum(lineStartPosList, matchStartPos);
                                endLineNumber = strPos2lineNum(lineStartPosList, matchEndPos);
                            } else {
                                startLineNumber = strPos2lineNum(lineStartPosList, matchEndPos);
                            }
                        }
                    }
                    if (
                        endLineRegExp
                        && isTryEndLineMatching
                        && startLineNumber
                        && startLineNumber <= currentLineNumber
                    ) {
                        const match = endLineRegExp.exec(text);
                        triedMatch.end = true;

                        if (match) {
                            const matchEndPos = lineStartPos + match.index + match[0].length;
                            endLineNumber = strPos2lineNum(lineStartPosList, matchEndPos);
                        }
                    }
                }

                return [startLineNumber, endLineNumber, triedMatch];
            },
            [0, 0, { start: false, end: false }],
        );
        if (!startLineNumber) {
            throw new Error(
                errorMsgTag`RegExp does not match with ${
                    cwdRelativePath(fileFullpath)
                } contents. The following pattern was passed in`
                    + (options instanceof RegExp
                        ? errorMsgTag` the argument: ${startLineRegExp}`
                        : errorMsgTag` the options.start argument: ${startLineRegExp}`),
            );
        }
        if (endLineRegExp && !endLineNumber) {
            throw new Error(
                errorMsgTag`RegExp does not match with ${cwdRelativePath(fileFullpath)} contents.`
                    + errorMsgTag` The following pattern was passed in the options.end argument: ${endLineRegExp}`,
            );
        }

        let browseURLSuffix;
        const isMultiLine = endLineNumber && startLineNumber !== endLineNumber;
        if (repoData.repoType === 'github') {
            browseURLSuffix = isMultiLine
                ? `#L${startLineNumber}-L${endLineNumber}`
                : `#L${startLineNumber}`;
        } else if (repoData.repoType === 'gitlab') {
            browseURLSuffix = isMultiLine
                ? `#L${startLineNumber}-${endLineNumber}`
                : `#L${startLineNumber}`;
        } else if (repoData.repoType === 'bitbucket') {
            browseURLSuffix = isMultiLine
                ? `#lines-${startLineNumber}:${endLineNumber}`
                : `#lines-${startLineNumber}`;
        } else if (repoData.repoType === 'gist') {
            browseURLSuffix = isMultiLine
                ? `-L${startLineNumber}-L${endLineNumber}`
                : `-L${startLineNumber}`;
        } else {
            throw new Error(errorMsgTag`Unknown repoData.repoType value: ${repoData.repoType}`);
        }

        return repoData.browseURL + browseURLSuffix;
    };
}
