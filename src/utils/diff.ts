import { stderr as chalk } from 'chalk';
import { createPatch } from 'diff';

/**
 * Inserts an escape character to apply an ANSI-escaped background color to an entire line
 * @see https://stackoverflow.com/a/39307121/4907315
 */
function fullLineColor(lineStr: string): string {
    return chalk.supportsColor ? `${lineStr}\u001B[K` : lineStr;
}

export function createUnifiedDiffText(
    { filename, oldStr, newStr, indent = '' }: { filename: string; oldStr: string; newStr: string; indent?: string },
): string {
    const diffText = createPatch(filename, oldStr, newStr).replace(/\n$/, '');
    const coloredDiffText = diffText.replace(/^([^\r\n]*)((?:\r\n?|\n)?)/gm, (_, lineStr, lineTerminator) => {
        const firstChar = (lineStr as string).charAt(0);
        if (firstChar === '@') {
            lineStr = chalk.cyan(lineStr);
        } else if (firstChar === '-') {
            lineStr = chalk.red(lineStr);
        } else if (firstChar === '+') {
            lineStr = chalk.green(lineStr);
        }
        return indent + chalk.white.bgBlack(fullLineColor(lineStr)) + (lineTerminator as string);
    }) + (chalk.supportsColor ? '' : `\n${indent}// end of diff text`);
    return coloredDiffText;
}
