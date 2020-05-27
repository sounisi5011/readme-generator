import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

import * as PKG_DATA from '../package.json';

import escapeStringRegexp = require('escape-string-regexp');
import execa = require('execa');
import makeDir = require('make-dir');

const statAsync = util.promisify(fs.stat);
const fileEntryExists = async (
    ...filepath: [string, ...string[]]
): Promise<boolean> => {
    try {
        await statAsync(path.resolve(...filepath));
        return true;
    } catch (error) {
        if (error?.code === 'ENOENT') return false;
        throw error;
    }
};
const createFixturesDir = (() => {
    const createdDirSet = new Set<string>();
    return async (dirname: string): Promise<string> => {
        const dirpath = path.resolve(__dirname, 'fixtures', dirname);
        if (createdDirSet.has(dirpath))
            throw new Error(`Directory name '${dirname}' is duplicate`);
        createdDirSet.add(dirpath);
        await makeDir(dirpath);
        return dirpath;
    };
})();

const tsNodeFullpath = path.resolve(
    __dirname,
    '..',
    'node_modules',
    '.bin',
    'ts-node',
);
const cliFullpath = path.resolve(__dirname, '..', 'src', 'index.ts');

describe('cli', () => {
    const cliName = PKG_DATA.name.replace(/^@[^/]+\//, '');
    const execCli = (
        cwd: string,
        args: readonly string[],
    ): execa.ExecaChildProcess =>
        execa(tsNodeFullpath, ['--transpile-only', cliFullpath, ...args], {
            cwd,
            reject: false,
        });

    describe('option', () => {
        const versionStr = `${cliName}/${PKG_DATA.version} ${process.platform}-${process.arch} node-${process.version}`;
        const helpMatching = expect.stringMatching(
            new RegExp(
                `^${[
                    escapeStringRegexp(`${cliName} v${PKG_DATA.version}`),
                    ``,
                    escapeStringRegexp(PKG_DATA.description),
                    ``,
                    `Usage:`,
                    escapeStringRegexp(`  $ ${cliName} [options]`),
                    ``,
                    String.raw`Options:(?:\n  -[^\n]+)+`,
                ].join('\n')}$`,
            ),
        );

        it('--version', async () => {
            const cwd = await createFixturesDir('cli/option/long-version');
            expect(await execCli(cwd, ['--version'])).toMatchObject({
                exitCode: 0,
                stdout: versionStr,
                stderr: '',
            });
            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                false,
            );
        });
        it('-v', async () => {
            const cwd = await createFixturesDir('cli/option/short-version');
            expect(await execCli(cwd, ['-v'])).toMatchObject({
                exitCode: 0,
                stdout: versionStr,
                stderr: '',
            });
            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                false,
            );
        });
        it('-V', async () => {
            const cwd = await createFixturesDir(
                'cli/option/short-upper-version',
            );
            expect(await execCli(cwd, ['-V'])).toMatchObject({
                exitCode: 0,
                stdout: versionStr,
                stderr: '',
            });
            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                false,
            );
        });

        it('--help', async () => {
            const cwd = await createFixturesDir('cli/option/long-help');
            expect(await execCli(cwd, ['--help'])).toMatchObject({
                exitCode: 0,
                stdout: helpMatching,
                stderr: '',
            });
            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                false,
            );
        });
        it('-h', async () => {
            const cwd = await createFixturesDir('cli/option/short-help');
            expect(await execCli(cwd, ['-h'])).toMatchObject({
                exitCode: 0,
                stdout: helpMatching,
                stderr: '',
            });
            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                false,
            );
        });

        it('invalid short option', async () => {
            const cwd = await createFixturesDir(
                'cli/option/invalid-short-option',
            );
            expect(await execCli(cwd, ['-z'])).toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: `unknown option: -z\nTry \`${cliName} --help\` for valid options.`,
            });
            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                false,
            );
        });
        it('invalid short options', async () => {
            const cwd = await createFixturesDir(
                'cli/option/invalid-short-options',
            );
            expect(await execCli(cwd, ['-axzyb'])).toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: `unknown options: -a -x -z -y -b\nTry \`${cliName} --help\` for valid options.`,
            });
            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                false,
            );
        });
        it('invalid long option', async () => {
            const cwd = await createFixturesDir(
                'cli/option/invalid-long-option',
            );
            expect(await execCli(cwd, ['--invalid'])).toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: `unknown option: --invalid\nTry \`${cliName} --help\` for valid options.`,
            });
            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                false,
            );
        });
        it('invalid long options', async () => {
            const cwd = await createFixturesDir(
                'cli/option/invalid-long-options',
            );
            expect(
                await execCli(cwd, ['--unknown', '--party-parrot', '--fooBar']),
            ).toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: `unknown options: --unknown --partyParrot --fooBar\nTry \`${cliName} --help\` for valid options.`,
            });
            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                false,
            );
        });
        it('invalid short and long options', async () => {
            const cwd = await createFixturesDir(
                'cli/option/invalid-short-and-long-options',
            );
            expect(
                await execCli(cwd, [
                    '-zy',
                    '--unknown',
                    '-f',
                    '--party-parrot',
                    '--tailVore',
                ]),
            ).toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: `unknown options: -z -y --unknown -f --partyParrot --tailVore\nTry \`${cliName} --help\` for valid options.`,
            });
            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                false,
            );
        });
    });
});
