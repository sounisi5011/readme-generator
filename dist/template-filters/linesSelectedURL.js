"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linesSelectedURL = void 0;
const path_1 = require("path");
const utils_1 = require("../utils");
function copyRegExp(sourceRegExp, { addFlags = '', deleteFlags = '' } = {}) {
    return new RegExp(sourceRegExp.source, (sourceRegExp.flags
        .replace(/./g, char => deleteFlags.includes(char) ? '' : char)) + addFlags);
}
function getLinesStartPos(text) {
    const lineBreakRegExp = /\r\n?|\n/g;
    const lineStartPosList = [0];
    for (let match; (match = lineBreakRegExp.exec(text));) {
        lineStartPosList.push(match.index + match[0].length);
    }
    return lineStartPosList;
}
function strPos2lineNum(lineStartPosList, strPos) {
    return (lineStartPosList.findIndex((lineStartPos, index) => {
        var _a;
        const nextLineStartPos = (_a = lineStartPosList[index + 1]) !== null && _a !== void 0 ? _a : Infinity;
        return lineStartPos <= strPos && strPos < nextLineStartPos;
    })) + 1;
}
function isRepoData(value) {
    return (utils_1.isObject(value)
        && typeof value.repoType === 'string'
        && typeof value.fileFullpath === 'string'
        && typeof value.browseURL === 'string');
}
function isOptions(value) {
    return (utils_1.isObject(value)
        && value.start instanceof RegExp
        && (value.end instanceof RegExp || value.end === undefined));
}
function normalizeOptions(options) {
    const startLineRegExp = copyRegExp(options instanceof RegExp ? options : options.start, { deleteFlags: 'gy' });
    const endLineRegExp = options instanceof RegExp
        ? null
        : options.end && copyRegExp(options.end, { deleteFlags: 'gy' });
    const isFullMatchMode = options instanceof RegExp;
    return { startLineRegExp, endLineRegExp, isFullMatchMode };
}
async function getFileData(fileFullpath) {
    const cachedFileData = cacheStore.get(fileFullpath);
    if (cachedFileData)
        return cachedFileData;
    const fileContent = await utils_1.readFileAsync(utils_1.cwdRelativePath(fileFullpath), 'utf8');
    return {
        content: fileContent,
        lineStartPosList: getLinesStartPos(fileContent),
    };
}
const cacheStore = new Map();
function validateLineNumbers({ startLineNumber, endLineNumber, fileFullpath, startLineRegExp, endLineRegExp, isFullMatchMode }) {
    if (!startLineNumber) {
        const filepath = utils_1.cwdRelativePath(fileFullpath);
        throw new Error(utils_1.errorMsgTag `RegExp does not match with ${filepath} contents. The following pattern was passed in`
            + (isFullMatchMode
                ? utils_1.errorMsgTag ` the argument: ${startLineRegExp}`
                : utils_1.errorMsgTag ` the options.start argument: ${startLineRegExp}`));
    }
    if (endLineRegExp && !endLineNumber) {
        throw new Error(utils_1.errorMsgTag `RegExp does not match with ${utils_1.cwdRelativePath(fileFullpath)} contents.`
            + utils_1.errorMsgTag ` The following pattern was passed in the options.end argument: ${endLineRegExp}`);
    }
}
function getBrowseURLSuffix({ repoData, startLineNumber, endLineNumber }) {
    const suffixRecord = {
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
    if (suffix)
        return isMultiLine ? suffix.multi_ : suffix.single;
    throw new Error(utils_1.errorMsgTag `Unknown repoData.repoType value: ${repoData.repoType}`);
}
function calculateLineNumber({ lineStartPosList, startLineRegExp, endLineRegExp, isFullMatchMode, fileContent }) {
    const [startLineNumber, endLineNumber] = lineStartPosList.reduce(([startLineNumber, endLineNumber, triedMatch], lineStartPos, index) => {
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
                    }
                    else {
                        startLineNumber = strPos2lineNum(lineStartPosList, matchEndPos);
                    }
                }
            }
            if (endLineRegExp
                && isTryEndLineMatching
                && startLineNumber
                && startLineNumber <= currentLineNumber) {
                const match = endLineRegExp.exec(text);
                triedMatch.end = true;
                if (match) {
                    const matchEndPos = lineStartPos + match.index + match[0].length;
                    endLineNumber = strPos2lineNum(lineStartPosList, matchEndPos);
                }
            }
        }
        return [startLineNumber, endLineNumber, triedMatch];
    }, [0, 0, { start: false, end: false }]);
    return { startLineNumber, endLineNumber };
}
async function linesSelectedURL(repoData, options) {
    if (!isRepoData(repoData))
        throw new TypeError(utils_1.errorMsgTag `Invalid repoData value: ${repoData}`);
    if (!(options instanceof RegExp || isOptions(options))) {
        throw new TypeError(utils_1.errorMsgTag `Invalid options value: ${options}`);
    }
    const { startLineRegExp, endLineRegExp, isFullMatchMode } = normalizeOptions(options);
    const fileFullpath = path_1.resolve(repoData.fileFullpath);
    const { content: fileContent, lineStartPosList } = await getFileData(fileFullpath);
    const { startLineNumber, endLineNumber } = calculateLineNumber({ lineStartPosList, startLineRegExp, endLineRegExp, isFullMatchMode, fileContent });
    validateLineNumbers({ startLineNumber, endLineNumber, fileFullpath, startLineRegExp, endLineRegExp, isFullMatchMode });
    return repoData.browseURL + getBrowseURLSuffix({ repoData, startLineNumber, endLineNumber });
}
exports.linesSelectedURL = linesSelectedURL;
//# sourceMappingURL=linesSelectedURL.js.map