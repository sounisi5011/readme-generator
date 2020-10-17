"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUnifiedDiffText = void 0;
const chalk_1 = require("chalk");
const diff_1 = require("diff");
/**
 * Inserts an escape character to apply an ANSI-escaped background color to an entire line
 * @see https://stackoverflow.com/a/39307121/4907315
 */
function fullLineColor(lineStr) {
    return chalk_1.stderr.supportsColor ? `${lineStr}\u001B[K` : lineStr;
}
function createUnifiedDiffText({ filename, oldStr, newStr, indent = '' }) {
    const diffText = diff_1.createPatch(filename, oldStr, newStr).replace(/\n$/, '');
    const coloredDiffText = diffText.replace(/^([^\r\n]*)((?:\r\n?|\n)?)/gm, (_, lineStr, lineTerminator) => {
        const firstChar = lineStr.charAt(0);
        if (firstChar === '@') {
            lineStr = chalk_1.stderr.cyan(lineStr);
        }
        else if (firstChar === '-') {
            lineStr = chalk_1.stderr.red(lineStr);
        }
        else if (firstChar === '+') {
            lineStr = chalk_1.stderr.green(lineStr);
        }
        return indent + chalk_1.stderr.white.bgBlack(fullLineColor(lineStr)) + lineTerminator;
    }) + (chalk_1.stderr.supportsColor ? '' : `\n${indent}// end of diff text`);
    return coloredDiffText;
}
exports.createUnifiedDiffText = createUnifiedDiffText;
//# sourceMappingURL=diff.js.map