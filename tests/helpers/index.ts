import * as fs from 'fs';
import * as path from 'path';
import { JsonObject } from 'type-fest';
import * as util from 'util';

import * as PKG_DATA from '../../package.json';
import execa = require('execa');
import makeDir = require('make-dir');
import rimraf = require('rimraf');

export const DEFAULT_TEMPLATE_NAME = 'readme-template.njk';
export const testRootDirpath = path.resolve(__dirname, '..');
export const projectRootDirpath = path.resolve(testRootDirpath, '..');
export const cliName = PKG_DATA.name.replace(/^@[^/]+\//, '');
export { PKG_DATA };

export function localNpmCmdPath(commandName: string): string {
    return path.resolve(
        projectRootDirpath,
        'node_modules',
        '.bin',
        commandName,
    );
}

export const readFileAsync = util.promisify(fs.readFile);

const writeFileAsync = util.promisify(fs.writeFile);

const statAsync = util.promisify(fs.stat);

const rimrafAsync = util.promisify(rimraf);

export async function fileEntryExists(
    ...filepath: [string, ...string[]]
): Promise<boolean> {
    try {
        await statAsync(path.resolve(...filepath));
        return true;
    } catch (error) {
        if (error?.code === 'ENOENT') return false;
        throw error;
    }
}

const createdDirSet = new Set<string>();
export async function createTmpDir(
    currentFilename: string,
    id: string,
): Promise<string> {
    const dirpath = path.resolve(
        `${currentFilename.replace(/\.[^./]+$/, '')}.tmp`,
        id,
    );
    if (createdDirSet.has(dirpath))
        throw new Error(
            `Directory name '${path.relative(
                process.cwd(),
                dirpath,
            )}' is duplicate`,
        );
    createdDirSet.add(dirpath);

    await rimrafAsync(dirpath);
    await makeDir(dirpath);

    return dirpath;
}

export async function createFixturesDir(dirname: string): Promise<string> {
    const dirpath = path.resolve(testRootDirpath, 'fixtures', dirname);
    if (createdDirSet.has(dirpath))
        throw new Error(`Directory name '${dirname}' is duplicate`);
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
): Promise<execa.ExecaReturnValue> {
    return execa(
        tsNodeFullpath,
        [
            '--transpile-only',
            '--compiler',
            'typescript-cached-transpile',
            cliFullpath,
            ...args,
        ],
        {
            cwd,
            reject: false,
        },
    );
}
