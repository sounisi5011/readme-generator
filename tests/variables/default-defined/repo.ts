import * as path from 'path';

import {
    createTmpDir,
    DEFAULT_TEMPLATE_NAME,
    execCli,
    readFileAsync,
    writeFilesAsync,
} from '../../helpers';
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

            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe(
                JSON.stringify({ user: 'example', project: 'repo' }),
            );
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

            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe(
                JSON.stringify({ user: 'example', project: 'repo' }),
            );
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

        await expect(
            readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
        ).resolves.toBe(
            [
                `github:example/repo`,
                `github:example/repo#CM`,
                `github:example/repo#e13ac79f`,
                `github:example/repo#dev`,
                `github:example/repo#v1.2.3`,
                `github:example/repo#semver:1.2.3`,
            ].join('\n'),
        );
    });

    describe('invalid repository', () => {
        it('invalid type', async () => {
            const cwd = await createTmpDir(
                __filename,
                'invalid-repository/invalid-type',
            );
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

            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe(`foo`);
        });

        it('invalid type object', async () => {
            const cwd = await createTmpDir(
                __filename,
                'invalid-repository/invalid-type-object',
            );
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

            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe(`foo`);
        });

        it('unknown url', async () => {
            const cwd = await createTmpDir(
                __filename,
                'invalid-repository/unknown-url',
            );
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

            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe(`foo`);
        });
    });
});
