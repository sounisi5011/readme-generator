import * as path from 'path';

import execa from 'execa';

import { createTmpDir, DEFAULT_TEMPLATE_NAME, execCli, readFileAsync, writeFilesAsync } from '../../helpers';
import { releasedTag, repository } from '../../helpers/remote-repository';
import genWarn from '../../helpers/warning-message';

describe('repo', () => {
    describe('basic', () => {
        it('string', async () => {
            const cwd = await createTmpDir(__filename, 'basic/string');
            await writeFilesAsync(cwd, {
                'package.json': {
                    repository: 'https://github.com/example/repo.git',
                },
                [DEFAULT_TEMPLATE_NAME]: `{{ repo | dump }}`,
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: genWarn({ pkgLock: true }),
            });

            await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves
                .toBe(JSON.stringify({ user: 'example', project: 'repo' }));
        });

        it('object', async () => {
            const cwd = await createTmpDir(__filename, 'basic/object');
            await writeFilesAsync(cwd, {
                'package.json': {
                    repository: {
                        url: 'https://github.com/example/repo.git',
                    },
                },
                [DEFAULT_TEMPLATE_NAME]: `{{ repo | dump }}`,
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: genWarn({ pkgLock: true }),
            });

            await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves
                .toBe(JSON.stringify({ user: 'example', project: 'repo' }));
        });
    });

    it('shortcut()', async () => {
        const cwd = await createTmpDir(__filename, 'shortcut');
        await writeFilesAsync(cwd, {
            'package.json': {
                repository: 'https://github.com/example/repo.git',
            },
            [DEFAULT_TEMPLATE_NAME]: [
                `{{ repo.shortcut() }}`,
                `{{ repo.shortcut(committish='CM') }}`,
                `{{ repo.shortcut(commit='e13ac79f') }}`,
                `{{ repo.shortcut(branch='dev') }}`,
                `{{ repo.shortcut(tag='v1.2.3') }}`,
                `{{ repo.shortcut(semver='1.2.3') }}`,
            ],
        });

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkgLock: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe([
            `github:example/repo`,
            `github:example/repo#CM`,
            `github:example/repo#e13ac79f`,
            `github:example/repo#dev`,
            `github:example/repo#v1.2.3`,
            `github:example/repo#semver:1.2.3`,
        ].join('\n'));
    });

    describe('isReleasedVersion() & isOlderReleasedVersion()', () => {
        const table = [
            {
                title: 'same commit',
                existHeadCommit: true,
                existRemote: true,
                existReleasedTag: true,
                notAddNewCommit: true,
                result: {
                    isReleasedVersion: true,
                    isOlderReleasedVersion: false,
                },
            },
            {
                title: 'different commit',
                existHeadCommit: true,
                existRemote: true,
                existReleasedTag: true,
                notAddNewCommit: false,
                result: {
                    isReleasedVersion: true,
                    isOlderReleasedVersion: true,
                },
            },
            {
                title: 'non exist tag',
                existHeadCommit: true,
                existRemote: true,
                existReleasedTag: false,
                notAddNewCommit: true,
                result: {
                    isReleasedVersion: false,
                    isOlderReleasedVersion: false,
                },
            },
            {
                title: 'non exist tag & different commit',
                existHeadCommit: true,
                existRemote: true,
                existReleasedTag: false,
                notAddNewCommit: false,
                result: {
                    isReleasedVersion: false,
                    isOlderReleasedVersion: false,
                },
            },
            {
                title: 'non exist remote repository',
                existHeadCommit: true,
                existRemote: false,
                existReleasedTag: true,
                notAddNewCommit: true,
                result: {
                    isReleasedVersion: null,
                    isOlderReleasedVersion: null,
                },
            },
            {
                title: 'non exist remote repository & different commit',
                existHeadCommit: true,
                existRemote: false,
                existReleasedTag: true,
                notAddNewCommit: false,
                result: {
                    isReleasedVersion: null,
                    isOlderReleasedVersion: null,
                },
            },
            {
                title: 'non exist remote repository & non exist tag',
                existHeadCommit: true,
                existRemote: false,
                existReleasedTag: false,
                notAddNewCommit: true,
                result: {
                    isReleasedVersion: null,
                    isOlderReleasedVersion: null,
                },
            },
            {
                title: 'non exist remote repository & non exist tag & different commit',
                existHeadCommit: true,
                existRemote: false,
                existReleasedTag: false,
                notAddNewCommit: false,
                result: {
                    isReleasedVersion: null,
                    isOlderReleasedVersion: null,
                },
            },
            {
                title: 'non initialized git',
                existHeadCommit: false,
                existRemote: true,
                existReleasedTag: true,
                result: {
                    isReleasedVersion: true,
                    isOlderReleasedVersion: null,
                },
            },
            {
                title: 'non initialized git & non exist tag',
                existHeadCommit: false,
                existRemote: true,
                existReleasedTag: false,
                result: {
                    isReleasedVersion: false,
                    isOlderReleasedVersion: null,
                },
            },
            {
                title: 'non initialized git & non exist remote repository',
                existHeadCommit: false,
                existRemote: false,
                existReleasedTag: true,
                result: {
                    isReleasedVersion: null,
                    isOlderReleasedVersion: null,
                },
            },
            {
                title: 'non initialized git & non exist remote repository & non exist tag',
                existHeadCommit: false,
                existRemote: false,
                existReleasedTag: false,
                result: {
                    isReleasedVersion: null,
                    isOlderReleasedVersion: null,
                },
            },
        ] as const;

        for (const cond of table) {
            // eslint-disable-next-line jest/valid-title
            it(cond.title, async () => {
                // eslint-disable-next-line jest/no-if
                const version = cond.existReleasedTag ? releasedTag : `9999.9999.9999`;
                // eslint-disable-next-line jest/no-if
                const repo = cond.existRemote ? repository : `https://github.com/example/repo`;
                const cwd = await createTmpDir(
                    __filename,
                    [
                        `isReleasedVersion+isOlderReleasedVersion`,
                        cond.existHeadCommit ? `init-git` : `non-init-git`,
                        cond.existRemote ? `exist-remote` : `non-exist-remote`,
                        cond.existReleasedTag ? `exist-tag` : `non-exist-tag`,
                    ]
                        .concat(cond.existHeadCommit ? (cond.notAddNewCommit ? `same-commit` : `diff-commit`) : [])
                        .join('/'),
                );

                // eslint-disable-next-line jest/no-if
                if (cond.existHeadCommit) {
                    await expect(execa('git', [
                        'clone',
                        repository,
                        '--branch',
                        `v${releasedTag}`,
                        '--depth',
                        '1',
                        cwd,
                    ], { cwd })).resolves.toBeDefined();
                } else {
                    await expect(execa('git', ['init'], { cwd })).resolves.toBeDefined();
                }
                await writeFilesAsync(cwd, {
                    'package.json': {
                        repository: repo,
                    },
                    [DEFAULT_TEMPLATE_NAME]: [
                        `{% set version = ${JSON.stringify(version)} -%}`,
                        `isReleasedVersion: {{ repo.isReleasedVersion(version) | dump }}`,
                        `isOlderReleasedVersion: {{ repo.isOlderReleasedVersion(version) | dump }}`,
                    ],
                });
                // eslint-disable-next-line jest/no-if
                if (cond.existHeadCommit) {
                    // eslint-disable-next-line jest/no-if
                    if (!cond.notAddNewCommit) {
                        await expect(execa('git', ['add', '.'], { cwd })).resolves.toBeDefined();
                        await expect(execa('git', ['commit', '-m', 'exam'], { cwd })).resolves.toBeDefined();
                    }
                } else {
                    await expect(execa('git', ['rev-parse', 'HEAD'], { cwd })).rejects.toBeDefined();
                }

                await expect(execCli(cwd, [])).resolves.toMatchObject({
                    exitCode: 0,
                    stdout: '',
                    stderr: cond.existHeadCommit ? '' : genWarn({ pkgLock: true }),
                });
                await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe([
                    `isReleasedVersion: ${JSON.stringify(cond.result.isReleasedVersion)}`,
                    `isOlderReleasedVersion: ${JSON.stringify(cond.result.isOlderReleasedVersion)}`,
                ].join('\n'));
            });
        }
    });

    describe('invalid repository', () => {
        it('invalid type', async () => {
            const cwd = await createTmpDir(__filename, 'invalid-repository/invalid-type');
            await writeFilesAsync(cwd, {
                'package.json': {
                    repository: 42,
                },
                [DEFAULT_TEMPLATE_NAME]: `foo`,
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: [
                    `Failed to detect remote repository. Unknown structure of 'repository' field in 'package.json' file: 42`,
                    genWarn({ pkgLock: true }),
                ].join('\n'),
            });

            await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe(`foo`);
        });

        it('invalid type object', async () => {
            const cwd = await createTmpDir(__filename, 'invalid-repository/invalid-type-object');
            await writeFilesAsync(cwd, {
                'package.json': {
                    repository: {
                        url: 42,
                    },
                },
                [DEFAULT_TEMPLATE_NAME]: `foo`,
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: [
                    `Failed to detect remote repository. Unknown structure of 'repository' field in 'package.json' file: { url: 42 }`,
                    genWarn({ pkgLock: true }),
                ].join('\n'),
            });

            await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe(`foo`);
        });

        it('unknown url', async () => {
            const cwd = await createTmpDir(__filename, 'invalid-repository/unknown-url');
            await writeFilesAsync(cwd, {
                'package.json': {
                    repository: 'https://example.com/example/repo',
                },
                [DEFAULT_TEMPLATE_NAME]: `foo`,
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: [
                    `Failed to detect remote repository. Unknown structure of 'repository' field in 'package.json' file: 'https://example.com/example/repo'`,
                    genWarn({ pkgLock: true }),
                ].join('\n'),
            });

            await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe(`foo`);
        });
    });
});
