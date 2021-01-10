import * as crypto from 'crypto';
import { promises as fsP } from 'fs'; // eslint-disable-line node/no-unsupported-features/node-builtins
import * as path from 'path';
import * as util from 'util';

import execa from 'execa';
import makeDir from 'make-dir';
import rimraf from 'rimraf';
import type { JsonObject } from 'type-fest';

import * as PKG_DATA from '../../package.json';

export const DEFAULT_TEMPLATE_NAME = 'readme-template.njk';
const testRootDirpath = path.resolve(__dirname, '..');
export const projectRootDirpath = path.resolve(testRootDirpath, '..');
export const cliName = PKG_DATA.name.replace(/^@[^/]+\//, '');
export { PKG_DATA };

export function flatMap<T, U>(
    array: readonly T[],
    callback: (value: T, index: number, array: readonly T[]) => U | readonly U[],
): U[] {
    return array.reduce<U[]>((acc, value, index, array) => acc.concat(callback(value, index, array)), []);
}

export function randomSHA1({ noMatching }: { noMatching?: string | readonly string[] } = {}): string {
    if (noMatching) {
        const noMatchingSha1List = Array.isArray(noMatching) ? noMatching : [noMatching];
        while (true) {
            const sha1 = randomSHA1();
            if (!noMatchingSha1List.includes(sha1)) return sha1;
        }
    }

    return crypto.createHash('sha1').update(Math.random().toString()).digest('hex');
}

export function localNpmCmdPath(commandName: string): string {
    return path.resolve(projectRootDirpath, 'node_modules', '.bin', commandName);
}

export const readFileAsync = fsP.readFile;

const writeFileAsync = fsP.writeFile;

const statAsync = fsP.stat;

const rimrafAsync = util.promisify(rimraf);

export function strAndPos(
    template: string | string[],
    posChar = '\v',
): { templateText: string; index: number; line: number; col: number } {
    const templateText = Array.isArray(template) ? template.join('\n') : template;
    const index = templateText.indexOf(posChar);
    if (index < 0) return { templateText, index: NaN, line: NaN, col: NaN };

    const prevText = templateText.substring(0, index);
    const lineStartIndex = prevText.lastIndexOf('\n') + 1;

    return {
        templateText: prevText + templateText.substring(index + posChar.length),
        index,
        line: (prevText.match(/\n/g)?.length ?? 0) + 1,
        col: index - lineStartIndex + 1,
    };
}

export async function fileEntryExists(...filepath: [string, ...string[]]): Promise<boolean> {
    try {
        await statAsync(path.resolve(...filepath));
        return true;
    } catch (error) {
        if (error?.code === 'ENOENT') return false;
        throw error;
    }
}

const createdDirSet = new Set<string>();
export async function createTmpDir(currentFilename: string, id: string): Promise<string> {
    const dirpath = path.resolve(`${currentFilename.replace(/\.[^./]+$/, '')}.test-result`, id);
    if (createdDirSet.has(dirpath)) {
        throw new Error(`Directory name '${path.relative(process.cwd(), dirpath)}' is duplicate`);
    }
    createdDirSet.add(dirpath);

    await rimrafAsync(dirpath);
    await makeDir(dirpath);

    return dirpath;
}

export async function writeFilesAsync(
    dirname: string,
    files: Record<string, string | readonly string[] | JsonObject> = {},
): Promise<void> {
    await Promise.all(
        Object.entries(files).map(async ([filename, filedata]) => {
            const filepath = path.resolve(dirname, filename);
            await makeDir(path.dirname(filepath));
            await writeFileAsync(
                filepath,
                typeof filedata === 'string'
                    ? filedata
                    : Array.isArray(filedata)
                    ? filedata.join('\n')
                    : JSON.stringify(filedata),
            );
        }),
    );
}

const tsNodeFullpath = localNpmCmdPath('ts-node');
const cliFullpath = path.resolve(projectRootDirpath, 'src', 'index.ts');
export async function execCli(
    cwd: string,
    args: readonly string[],
    options?: Omit<execa.Options, 'cwd' | 'reject'>,
): Promise<execa.ExecaReturnValue> {
    return await execa(
        tsNodeFullpath,
        [
            '--script-mode',
            '--transpile-only',
            '--compiler',
            'typescript-cached-transpile',
            cliFullpath,
            ...args,
        ],
        { cwd, reject: false, ...options },
    );
}
