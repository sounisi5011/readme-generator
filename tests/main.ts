import * as path from 'path';

import {
    cliName,
    createFixturesDir,
    DEFAULT_TEMPLATE_NAME,
    execCli,
    fileEntryExists,
    localNpmCmdPath,
    PKG_DATA,
    projectRootDirpath,
    readFileAsync,
    writeFilesAsync,
} from './helpers';

import escapeStringRegexp = require('escape-string-regexp');
import execa = require('execa');

describe('cli', () => {
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

        it('execCommand', async () => {
            const cwd = await createFixturesDir('cli/filter/execCommand');

            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: [
                    `---`,
                    `cmdText: ${JSON.stringify(
                        `[...Array(10).keys()].forEach(i => setTimeout(() => process[i%2 === 0 ? 'stdout' : 'stderr'].write(' ' + i), i*100))`,
                    )}`,
                    `---`,
                    `{{ 'node --version' | execCommand }}`,
                    `{{ ['tsc', '--version'] | execCommand }}`,
                    `{{ ['node', '-e', cmdText] | execCommand }}`,
                ],
            });
            expect(await execCli(cwd, [])).toMatchObject({
                exitCode: 0,
                stdout: '',
            });
            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe(
                [
                    (await execa.command('node --version')).stdout,
                    (await execa(localNpmCmdPath('tsc'), ['--version'])).stdout,
                    ` 0 1 2 3 4 5 6 7 8 9`,
                ].join('\n'),
            );
        });

        it('linesSelectedURL', async () => {
            const cwd = await createFixturesDir('cli/filter/linesSelectedURL');
            const browseURL = `http://example.com/usr/repo/tree/master/text.txt`;

            await writeFilesAsync(cwd, {
                'text.txt': [
                    `0001`,
                    `0002`,
                    `0003`,
                    `0004`,
                    `0005`,
                    `0006`,
                    `0007`,
                    `0008`,
                    `0009`,
                ],
                [DEFAULT_TEMPLATE_NAME]: [
                    `---`,
                    `path: ${JSON.stringify(path.resolve(cwd, 'text.txt'))}`,
                    `url: ${JSON.stringify(browseURL)}`,
                    `---`,
                    `{% set filedata = { repoType:'github', fileFullpath:path, browseURL:url } -%}`,
                    `1.`,
                    String.raw`{{ filedata | linesSelectedURL(r/2/) }}`,
                    String.raw`{{ filedata | linesSelectedURL(r/2\n/) }}`,
                    `2.`,
                    String.raw`{{ filedata | linesSelectedURL(start=r/2/) }}`,
                    String.raw`{{ filedata | linesSelectedURL(start=r/2\n/) }}`,
                    `3.`,
                    String.raw`{{ filedata | linesSelectedURL(start=r/2/, end=r/6/) }}`,
                    String.raw`{{ filedata | linesSelectedURL(start=r/2\n/, end=r/6/) }}`,
                    String.raw`{{ filedata | linesSelectedURL(start=r/2/, end=r/6\n/) }}`,
                    String.raw`{{ filedata | linesSelectedURL(start=r/2\n/, end=r/6\n/) }}`,
                    `4.`,
                    String.raw`{{ filedata | linesSelectedURL(r/^0*5[\s\S]*?$/) }}`,
                    String.raw`{{ filedata | linesSelectedURL(r/^0*5[\s\S]*?$/m) }}`,
                    `5.`,
                    String.raw`{{ filedata | linesSelectedURL(start=r/^0*5/, end=r/$/) }}`,
                    String.raw`{{ filedata | linesSelectedURL(start=r/^0*5/, end=r/$/m) }}`,
                    `6.`,
                    String.raw`{{ filedata | linesSelectedURL(start=r/^/, end=r/$/) }}`,
                    String.raw`{{ filedata | linesSelectedURL(start=r/^/, end=r/$/m) }}`,
                    `7.`,
                    String.raw`{{ { repoType:'github', fileFullpath:path, browseURL:url } | linesSelectedURL(r/2/) }}`,
                    String.raw`{{ { repoType:'gitlab', fileFullpath:path, browseURL:url } | linesSelectedURL(r/2/) }}`,
                    String.raw`{{ { repoType:'bitbucket', fileFullpath:path, browseURL:url } | linesSelectedURL(r/2/) }}`,
                    `8.`,
                    String.raw`{{ { repoType:'github', fileFullpath:path, browseURL:url } | linesSelectedURL(start=r/2/, end=r/6/) }}`,
                    String.raw`{{ { repoType:'gitlab', fileFullpath:path, browseURL:url } | linesSelectedURL(start=r/2/, end=r/6/) }}`,
                    String.raw`{{ { repoType:'bitbucket', fileFullpath:path, browseURL:url } | linesSelectedURL(start=r/2/, end=r/6/) }}`,
                ],
            });
            expect(await execCli(cwd, [])).toMatchObject({
                exitCode: 0,
                stdout: '',
            });
            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe(
                [
                    `1.`,
                    `${browseURL}#L2`,
                    `${browseURL}#L2-L3`,
                    `2.`,
                    `${browseURL}#L2`,
                    `${browseURL}#L3`,
                    `3.`,
                    `${browseURL}#L2-L6`,
                    `${browseURL}#L3-L6`,
                    `${browseURL}#L2-L7`,
                    `${browseURL}#L3-L7`,
                    `4.`,
                    `${browseURL}#L5-L9`,
                    `${browseURL}#L5`,
                    `5.`,
                    `${browseURL}#L5-L9`,
                    `${browseURL}#L5`,
                    `6.`,
                    `${browseURL}#L1-L9`,
                    `${browseURL}#L1`,
                    `7.`,
                    `${browseURL}#L2`,
                    `${browseURL}#L2`,
                    `${browseURL}#lines-2`,
                    `8.`,
                    `${browseURL}#L2-L6`,
                    `${browseURL}#L2-6`,
                    `${browseURL}#lines-2:6`,
                ].join('\n'),
            );
        });

        it('repoBrowseURL', async () => {
            const cwd = await createFixturesDir('cli/filter/repoBrowseURL');
            await writeFilesAsync(cwd, {
                'package.json': {
                    version: '1.4.2',
                    repository: 'https://github.com/example/repo.git',
                },
                [DEFAULT_TEMPLATE_NAME]: [
                    `{{ './package.json' | repoBrowseURL }}`,
                    `{{ '../package.json' | repoBrowseURL }}`,
                    `{{ '/package.json' | repoBrowseURL }}`,
                    `{{ 'package.json' | repoBrowseURL }}`,
                    ``,
                    `{{ '/package.json' | repoBrowseURL(committish='COMMIT-ISH') }}`,
                    `{{ '/package.json' | repoBrowseURL(commit='4626dfa') }}`,
                    `{{ '/package.json' | repoBrowseURL(branch='gh-pages') }}`,
                    `{{ '/package.json' | repoBrowseURL(tag='foo') }}`,
                    ``,
                    `* < committish`,
                    `{{ '/package.json' | repoBrowseURL(committish='COMMIT-ISH', commit='4626dfa', branch='gh-pages', tag='foo', other='???') }}`,
                    `{{ '/package.json' | repoBrowseURL(commit='4626dfa', branch='gh-pages', tag='foo', other='???', committish='COMMIT-ISH') }}`,
                    `{{ '/package.json' | repoBrowseURL(commit='4626dfa', branch='gh-pages', committish='COMMIT-ISH', tag='foo', other='???') }}`,
                    ``,
                    `* < commit < committish`,
                    `{{ '/package.json' | repoBrowseURL(commit='4626dfa', branch='gh-pages', tag='foo', other='???') }}`,
                    `{{ '/package.json' | repoBrowseURL(branch='gh-pages', tag='foo', other='???', commit='4626dfa') }}`,
                    `{{ '/package.json' | repoBrowseURL(branch='gh-pages', commit='4626dfa', tag='foo', other='???') }}`,
                    ``,
                    `* < branch < commit < committish`,
                    `{{ '/package.json' | repoBrowseURL(branch='gh-pages', tag='foo', other='???') }}`,
                    `{{ '/package.json' | repoBrowseURL(tag='foo', other='???', branch='gh-pages') }}`,
                    `{{ '/package.json' | repoBrowseURL(tag='foo', branch='gh-pages', other='???') }}`,
                    ``,
                    `tag < branch < commit < committish`,
                    `{{ '/package.json' | repoBrowseURL(tag='foo', other='???') }}`,
                    `{{ '/package.json' | repoBrowseURL(other='???', tag='foo') }}`,
                    ``,
                    `other options are ignored`,
                    `{{ '/package.json' | repoBrowseURL(other='???') }}`,
                    `{{ '/package.json' | repoBrowseURL() }}`,
                    `{{ '/package.json' | repoBrowseURL }}`,
                ],
            });

            expect(await execCli(cwd, [])).toMatchObject({
                exitCode: 0,
                stdout: '',
            });
            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe(
                [
                    `https://github.com/example/repo/tree/v1.4.2/${path.relative(
                        projectRootDirpath,
                        cwd,
                    )}/package.json`,
                    `https://github.com/example/repo/tree/v1.4.2/${path.relative(
                        projectRootDirpath,
                        path.dirname(cwd),
                    )}/package.json`,
                    `https://github.com/example/repo/tree/v1.4.2/package.json`,
                    `https://github.com/example/repo/tree/v1.4.2/package.json`,
                    ``,
                    `https://github.com/example/repo/tree/COMMIT-ISH/package.json`,
                    `https://github.com/example/repo/tree/4626dfa/package.json`,
                    `https://github.com/example/repo/tree/gh-pages/package.json`,
                    `https://github.com/example/repo/tree/foo/package.json`,
                    ``,
                    `* < committish`,
                    `https://github.com/example/repo/tree/COMMIT-ISH/package.json`,
                    `https://github.com/example/repo/tree/COMMIT-ISH/package.json`,
                    `https://github.com/example/repo/tree/COMMIT-ISH/package.json`,
                    ``,
                    `* < commit < committish`,
                    `https://github.com/example/repo/tree/4626dfa/package.json`,
                    `https://github.com/example/repo/tree/4626dfa/package.json`,
                    `https://github.com/example/repo/tree/4626dfa/package.json`,
                    ``,
                    `* < branch < commit < committish`,
                    `https://github.com/example/repo/tree/gh-pages/package.json`,
                    `https://github.com/example/repo/tree/gh-pages/package.json`,
                    `https://github.com/example/repo/tree/gh-pages/package.json`,
                    ``,
                    `tag < branch < commit < committish`,
                    `https://github.com/example/repo/tree/foo/package.json`,
                    `https://github.com/example/repo/tree/foo/package.json`,
                    ``,
                    `other options are ignored`,
                    `https://github.com/example/repo/tree/v1.4.2/package.json`,
                    `https://github.com/example/repo/tree/v1.4.2/package.json`,
                    `https://github.com/example/repo/tree/v1.4.2/package.json`,
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
