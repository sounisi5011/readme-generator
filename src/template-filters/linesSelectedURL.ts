import { resolve as resolvePath } from 'path';

import type hostedGitInfo from 'hosted-git-info';

import { cwdRelativePath, errorMsgTag, isObject, readFileAsync } from '../utils';

export interface RepoData {
    repoType: hostedGitInfo.Hosts;
    fileFullpath: string;
    browseURL: string;
}

interface Options {
    start: RegExp;
    end?: RegExp;
}

interface FileData {
    content: string;
    lineStartPosList: readonly number[];
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

function normalizeOptions(
    options: RegExp | Options,
): { startLineRegExp: RegExp; endLineRegExp: RegExp | null | undefined; isFullMatchMode: boolean } {
    const startLineRegExp = copyRegExp(
        options instanceof RegExp ? options : options.start,
        { deleteFlags: 'gy' },
    );
    const endLineRegExp = options instanceof RegExp
        ? null
        : options.end && copyRegExp(options.end, { deleteFlags: 'gy' });
    const isFullMatchMode = options instanceof RegExp;

    return { startLineRegExp, endLineRegExp, isFullMatchMode };
}

async function getFileData(fileFullpath: string): Promise<FileData> {
    const cachedFileData = cacheStore.get(fileFullpath);
    if (cachedFileData) return cachedFileData;

    const fileContent = await readFileAsync(cwdRelativePath(fileFullpath), 'utf8');
    return {
        content: fileContent,
        lineStartPosList: getLinesStartPos(fileContent),
    };
}
const cacheStore = new Map<string, FileData>();

function validateLineNumbers(
    { startLineNumber, endLineNumber, fileFullpath, startLineRegExp, endLineRegExp, isFullMatchMode }: {
        startLineNumber: number;
        endLineNumber: number;
        fileFullpath: string;
        startLineRegExp: RegExp;
        endLineRegExp: RegExp | null | undefined;
        isFullMatchMode: boolean;
    },
): void {
    if (!startLineNumber) {
        const filepath = cwdRelativePath(fileFullpath);
        throw new Error(
            errorMsgTag`RegExp does not match with ${filepath} contents. The following pattern was passed in`
                + (isFullMatchMode
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
}

function getBrowseURLSuffix(
    { repoData, startLineNumber, endLineNumber }: {
        repoData: RepoData;
        startLineNumber: number;
        endLineNumber: number;
    },
): string {
    const suffixRecord: Record<hostedGitInfo.Hosts, { single: string; multi_: string }> = {
        'github': {
            single: `#L${startLineNumber}`,
            multi_: `#L${startLineNumber}-L${endLineNumber}`,
        },
        'gitlab': {
            single: `#L${startLineNumber}`,
            multi_: `#L${startLineNumber}-${endLineNumber}`,
        },
        'bitbucket': {
            single: `#lines-${startLineNumber}`,
            multi_: `#lines-${startLineNumber}:${endLineNumber}`,
        },
        'gist': {
            single: `-L${startLineNumber}`,
            multi_: `-L${startLineNumber}-L${endLineNumber}`,
        },
    };

    const isMultiLine = endLineNumber && startLineNumber !== endLineNumber;
    const suffix = suffixRecord[repoData.repoType];
    if (suffix) return isMultiLine ? suffix.multi_ : suffix.single;

    throw new Error(errorMsgTag`Unknown repoData.repoType value: ${repoData.repoType}`);
}

function calculateLineNumber(
    { lineStartPosList, startLineRegExp, endLineRegExp, isFullMatchMode, fileContent }: {
        lineStartPosList: readonly number[];
        startLineRegExp: RegExp;
        endLineRegExp: RegExp | null | undefined;
        isFullMatchMode: boolean;
        fileContent: string;
    },
): { startLineNumber: number; endLineNumber: number } {
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
    return { startLineNumber, endLineNumber };
}

export async function linesSelectedURL(repoData: unknown, options: unknown): Promise<string> {
    if (!isRepoData(repoData)) throw new TypeError(errorMsgTag`Invalid repoData value: ${repoData}`);
    if (!(options instanceof RegExp || isOptions(options))) {
        throw new TypeError(errorMsgTag`Invalid options value: ${options}`);
    }
    const { startLineRegExp, endLineRegExp, isFullMatchMode } = normalizeOptions(options);

    const fileFullpath = resolvePath(repoData.fileFullpath);
    const { content: fileContent, lineStartPosList } = await getFileData(fileFullpath);

    const { startLineNumber, endLineNumber } = calculateLineNumber({
        startLineRegExp,
        endLineRegExp,
        isFullMatchMode,
        fileContent,
        lineStartPosList,
    });
    validateLineNumbers({
        startLineNumber,
        endLineNumber,
        fileFullpath,
        startLineRegExp,
        endLineRegExp,
        isFullMatchMode,
    });

    return repoData.browseURL + getBrowseURLSuffix({ repoData, startLineNumber, endLineNumber });
}
