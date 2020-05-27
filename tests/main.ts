import * as fs from 'fs';
import * as path from 'path';
import { JsonObject } from 'type-fest';
import * as util from 'util';

import * as PKG_DATA from '../package.json';

import escapeStringRegexp = require('escape-string-regexp');
import execa = require('execa');
import makeDir = require('make-dir');
import rimraf = require('rimraf');

const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
const statAsync = util.promisify(fs.stat);
const rimrafAsync = util.promisify(rimraf);
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

        await rimrafAsync(dirpath);
        await makeDir(dirpath);

        return dirpath;
    };
})();
async function writeFilesAsync(
    dirname: string,
    files: Record<string, string | JsonObject> = {},
): Promise<void> {
    await Promise.all(
        Object.entries(files).map(async ([filename, filedata]) => {
            const filepath = path.resolve(dirname, filename);
            await makeDir(path.dirname(filepath));
            await writeFileAsync(
                filepath,
                typeof filedata === 'string'
                    ? filedata
                    : JSON.stringify(filedata),
            );
        }),
    );
}

const DEFAULT_TEMPLATE_NAME = 'readme-template.njk';
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
        execa(
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

    it('no options', async () => {
        const cwd = await createFixturesDir('cli/no-options');
        await writeFilesAsync(cwd, {
            [DEFAULT_TEMPLATE_NAME]: 'foo',
        });
        expect(await execCli(cwd, [])).toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: expect.stringMatching(
                /^(?:Failed to read file '[^']+'(?:\n|$))+$/,
            ),
        });
        await expect(
            readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
        ).resolves.toBe('foo');
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

        it('--template', async () => {
            const cwd = await createFixturesDir('cli/option/long-template');
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: 'foo',
                'custom-template.njk': 'bar',
            });
            expect(
                await execCli(cwd, ['--template', 'custom-template.njk']),
            ).toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: expect.stringMatching(
                    /^(?:Failed to read file '[^']+'(?:\n|$))+$/,
                ),
            });
            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe('bar');
        });

        describe('--test', () => {
            it('before generation', async () => {
                const cwd = await createFixturesDir(
                    'cli/option/long-test/before-gen',
                );
                await writeFilesAsync(cwd, {
                    [DEFAULT_TEMPLATE_NAME]: 'foo',
                });
                expect(await execCli(cwd, ['--test'])).toMatchObject({
                    exitCode: 0,
                    stdout: '',
                    stderr: expect.stringMatching(
                        /^(?:Failed to read file '[^']+'(?:\n|$))+$/,
                    ),
                });
                await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                    false,
                );
            });

            it('after generation', async () => {
                const cwd = await createFixturesDir(
                    'cli/option/long-test/after-gen',
                );
                await writeFilesAsync(cwd, {
                    [DEFAULT_TEMPLATE_NAME]: 'foo',
                    'README.md': 'hoge',
                });
                expect(await execCli(cwd, ['--test'])).toMatchObject({
                    exitCode: 1,
                    stdout: '',
                    stderr: expect.stringMatching(
                        new RegExp(
                            String.raw`^(?:Failed to read file '[^']+'\n)+${escapeStringRegexp(
                                `Do not edit 'README.md' manually! You MUST edit '${DEFAULT_TEMPLATE_NAME}' instead of 'README.md'`,
                            )}$`,
                        ),
                    ),
                });
                await expect(
                    readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
                ).resolves.toBe('hoge');
            });
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

    describe('variables', () => {
        describe('default-defined', () => {
            it('pkg', async () => {
                const cwd = await createFixturesDir(
                    'cli/var/default-defined/pkg',
                );
                const pkgData = {
                    foo: null,
                    bar: 'ex',
                    pkg: [1, 2, 9],
                    html: 'a<br>b',
                };
                await writeFilesAsync(cwd, {
                    'package.json': pkgData,
                    [DEFAULT_TEMPLATE_NAME]: '{{ pkg | dump }}',
                });
                expect(await execCli(cwd, [])).toMatchObject({
                    exitCode: 0,
                    stdout: '',
                    stderr: [
                        `Failed to detect remote repository. 'repository' field does not exist in 'package.json' file.`,
                        `Failed to read file 'package-lock.json'`,
                    ].join('\n'),
                });
                await expect(
                    readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
                ).resolves.toBe(JSON.stringify(pkgData));
            });

            it('repo', async () => {
                const cwd = await createFixturesDir(
                    'cli/var/default-defined/repo',
                );
                await writeFilesAsync(cwd, {
                    'package.json': {
                        repository: 'https://github.com/example/repo.git',
                    },
                    [DEFAULT_TEMPLATE_NAME]: [
                        `{{ repo | dump }}`,
                        `{{ repo.shortcut() }}`,
                        `{{ repo.shortcut(committish='CM') }}`,
                        `{{ repo.shortcut(commit='e13ac79f') }}`,
                        `{{ repo.shortcut(branch='dev') }}`,
                        `{{ repo.shortcut(tag='v1.2.3') }}`,
                        `{{ repo.shortcut(semver='1.2.3') }}`,
                    ].join('\n'),
                });
                expect(await execCli(cwd, [])).toMatchObject({
                    exitCode: 0,
                    stdout: '',
                    stderr: `Failed to read file 'package-lock.json'`,
                });
                await expect(
                    readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
                ).resolves.toBe(
                    [
                        JSON.stringify({ user: 'example', project: 'repo' }),
                        `github:example/repo`,
                        `github:example/repo#CM`,
                        `github:example/repo#e13ac79f`,
                        `github:example/repo#dev`,
                        `github:example/repo#v1.2.3`,
                        `github:example/repo#semver:1.2.3`,
                    ].join('\n'),
                );
            });

            it('deps', async () => {
                const cwd = await createFixturesDir(
                    'cli/var/default-defined/deps',
                );
                await writeFilesAsync(cwd, {
                    'package.json': {},
                    [DEFAULT_TEMPLATE_NAME]: [
                        `{{ deps['package-version-git-tag'] | dump }}`,
                        `{{ deps.cac | dump }}`,
                    ].join('\n'),
                });
                await execa(
                    'npm',
                    ['install', 'package-version-git-tag@2.1.0'],
                    { cwd },
                );
                expect(await execCli(cwd, [])).toMatchObject({
                    exitCode: 0,
                    stdout: '',
                    stderr: `Failed to detect remote repository. 'repository' field does not exist in 'package.json' file.`,
                });
                await expect(
                    readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
                ).resolves.toBe(
                    [
                        JSON.stringify({
                            name: 'package-version-git-tag',
                            version: '2.1.0',
                            v: '2.1.0',
                        }),
                        JSON.stringify({
                            name: 'cac',
                            version: '6.5.8',
                            v: '6.5.8',
                        }),
                    ].join('\n'),
                );
            }, 15000);
        });

        it('frontmatter', async () => {
            const cwd = await createFixturesDir('cli/var/frontmatter');
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: [
                    '---',
                    'foo: ~',
                    'bar: 42',
                    'baz: "hoge"',
                    'qux:',
                    '  - 1',
                    '  - 9',
                    '  - 7',
                    'quux:',
                    '  hoge: 0x7E',
                    '  fuga: True',
                    '---',
                    '{{ [ foo, bar, baz, qux, quux ] | dump }}',
                ].join('\n'),
            });
            expect(await execCli(cwd, [])).toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: [
                    `Failed to read file 'package.json'`,
                    `Failed to read file 'package-lock.json'`,
                ].join('\n'),
            });
            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe(
                JSON.stringify([
                    null,
                    42,
                    'hoge',
                    [1, 9, 7],
                    { hoge: 0x7e, fuga: true },
                ]),
            );
        });
    });

    describe('filters', () => {
        it('omitPackageScope', async () => {
            const cwd = await createFixturesDir('cli/filter/omitPackageScope');

            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: `>>> {{ '@user/package' | omitPackageScope }} <<<`,
            });
            expect(await execCli(cwd, [])).toMatchObject({
                exitCode: 0,
                stdout: '',
            });
            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe('>>> package <<<');

            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: `>>> {{ 42 | omitPackageScope }} <<<`,
            });
            expect(await execCli(cwd, [])).toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: expect.stringMatching(
                    new RegExp(
                        `^${escapeStringRegexp(
                            `(unknown path)\n  TypeError: omitPackageScope() filter / Invalid packageName value: 42`,
                        )}$`,
                        'm',
                    ),
                ),
            });
        });

        it('npmURL', async () => {
            const cwd = await createFixturesDir('cli/filter/npmURL');

            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: [
                    `{{ 'foo' | npmURL }}`,
                    `{{ 'foo@1.2.3' | npmURL }}`,
                    `{{ 'foo@legacy' | npmURL }}`,
                    `{{ '@hoge/bar' | npmURL }}`,
                    `{{ '@hoge/bar@0.1.1-alpha' | npmURL }}`,
                    `{{ '@hoge/bar@dev' | npmURL }}`,
                ].join('\n'),
            });
            expect(await execCli(cwd, [])).toMatchObject({
                exitCode: 0,
                stdout: '',
            });
            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe(
                [
                    `https://www.npmjs.com/package/foo`,
                    `https://www.npmjs.com/package/foo/v/1.2.3`,
                    `https://www.npmjs.com/package/foo/v/legacy`,
                    `https://www.npmjs.com/package/@hoge/bar`,
                    `https://www.npmjs.com/package/@hoge/bar/v/0.1.1-alpha`,
                    `https://www.npmjs.com/package/@hoge/bar/v/dev`,
                ].join('\n'),
            );
        });
    });

    it('template not found', async () => {
        const cwd = await createFixturesDir('cli/no-template');
        expect(await execCli(cwd, [])).toMatchObject({
            exitCode: 1,
            stdout: '',
            stderr: `ENOENT: no such file or directory, open '${DEFAULT_TEMPLATE_NAME}'`,
        });
        await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
    });
});
