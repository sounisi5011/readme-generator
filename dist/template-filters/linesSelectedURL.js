"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linesSelectedURLGen = void 0;
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
const cacheStore = new Map();
function linesSelectedURLGen({ cwdRelativePath }) {
    return async function linesSelectedURL(repoData, options) {
        if (!isRepoData(repoData)) {
            throw new TypeError(utils_1.errorMsgTag `Invalid repoData value: ${repoData}`);
        }
        if (!(options instanceof RegExp || isOptions(options))) {
            throw new TypeError(utils_1.errorMsgTag `Invalid options value: ${options}`);
        }
        const startLineRegExp = copyRegExp(options instanceof RegExp ? options : options.start, { deleteFlags: 'gy' });
        const endLineRegExp = options instanceof RegExp
            ? null
            : options.end && copyRegExp(options.end, { deleteFlags: 'gy' });
        const isFullMatchMode = options instanceof RegExp;
        const fileFullpath = path_1.resolve(repoData.fileFullpath);
        let fileData = cacheStore.get(fileFullpath);
        if (!fileData) {
            const fileContent = await utils_1.readFileAsync(cwdRelativePath(fileFullpath), 'utf8');
            fileData = {
                content: fileContent,
                lineStartPosList: getLinesStartPos(fileContent),
            };
        }
        const { content: fileContent, lineStartPosList } = fileData;
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
        if (!startLineNumber) {
            throw new Error(utils_1.errorMsgTag `RegExp does not match with ${cwdRelativePath(fileFullpath)} contents. The following pattern was passed in`
                + (options instanceof RegExp
                    ? utils_1.errorMsgTag ` the argument: ${startLineRegExp}`
                    : utils_1.errorMsgTag ` the options.start argument: ${startLineRegExp}`));
        }
        if (endLineRegExp && !endLineNumber) {
            throw new Error(utils_1.errorMsgTag `RegExp does not match with ${cwdRelativePath(fileFullpath)} contents.`
                + utils_1.errorMsgTag ` The following pattern was passed in the options.end argument: ${endLineRegExp}`);
        }
        let browseURLSuffix;
        const isMultiLine = endLineNumber && startLineNumber !== endLineNumber;
        if (repoData.repoType === 'github') {
            browseURLSuffix = isMultiLine
                ? `#L${startLineNumber}-L${endLineNumber}`
                : `#L${startLineNumber}`;
        }
        else if (repoData.repoType === 'gitlab') {
            browseURLSuffix = isMultiLine
                ? `#L${startLineNumber}-${endLineNumber}`
                : `#L${startLineNumber}`;
        }
        else if (repoData.repoType === 'bitbucket') {
            browseURLSuffix = isMultiLine
                ? `#lines-${startLineNumber}:${endLineNumber}`
                : `#lines-${startLineNumber}`;
        }
        else if (repoData.repoType === 'gist') {
            browseURLSuffix = isMultiLine
                ? `-L${startLineNumber}-L${endLineNumber}`
                : `-L${startLineNumber}`;
        }
        else {
            throw new Error(utils_1.errorMsgTag `Unknown repoData.repoType value: ${repoData.repoType}`);
        }
        return repoData.browseURL + browseURLSuffix;
    };
}
exports.linesSelectedURLGen = linesSelectedURLGen;
//# sourceMappingURL=linesSelectedURL.js.map