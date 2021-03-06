import * as path from 'path';

import { createTmpDir, DEFAULT_TEMPLATE_NAME, execCli, readFileAsync, writeFilesAsync } from '../../helpers';
import { repoProjectName, repository, repoUserName } from '../../helpers/remote-repository';
import genWarn from '../../helpers/warning-message';

describe('repo', () => {
    describe('basic', () => {
        it('string', async () => {
            const cwd = await createTmpDir(__filename, 'basic/string');
            await expect(writeFilesAsync(cwd, {
                'package.json': {
                    repository,
                },
                [DEFAULT_TEMPLATE_NAME]: `{{ repo | dump }}`,
            })).toResolve();

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: genWarn({ pkgLock: true }),
            });

            await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves
                .toBe(JSON.stringify({ user: repoUserName, project: repoProjectName }));
        });

        it('object', async () => {
            const cwd = await createTmpDir(__filename, 'basic/object');
            await expect(writeFilesAsync(cwd, {
                'package.json': {
                    repository: {
                        url: repository,
                    },
                },
                [DEFAULT_TEMPLATE_NAME]: `{{ repo | dump }}`,
            })).toResolve();

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: genWarn({ pkgLock: true }),
            });

            await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves
                .toBe(JSON.stringify({ user: repoUserName, project: repoProjectName }));
        });
    });

    it('shortcut()', async () => {
        const cwd = await createTmpDir(__filename, 'shortcut');
        await expect(writeFilesAsync(cwd, {
            'package.json': {
                repository,
            },
            [DEFAULT_TEMPLATE_NAME]: [
                `{{ repo.shortcut() }}`,
                `{{ repo.shortcut(committish='CM') }}`,
                `{{ repo.shortcut(commit='e13ac79f') }}`,
                `{{ repo.shortcut(branch='dev') }}`,
                `{{ repo.shortcut(tag='v1.2.3') }}`,
                `{{ repo.shortcut(semver='1.2.3') }}`,
            ],
        })).toResolve();

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkgLock: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe([
            `github:${repoUserName}/${repoProjectName}`,
            `github:${repoUserName}/${repoProjectName}#CM`,
            `github:${repoUserName}/${repoProjectName}#e13ac79f`,
            `github:${repoUserName}/${repoProjectName}#dev`,
            `github:${repoUserName}/${repoProjectName}#v1.2.3`,
            `github:${repoUserName}/${repoProjectName}#semver:1.2.3`,
        ].join('\n'));
    });

    describe('invalid repository', () => {
        it('invalid type', async () => {
            const cwd = await createTmpDir(__filename, 'invalid-repository/invalid-type');
            await expect(writeFilesAsync(cwd, {
                'package.json': {
                    repository: 42,
                },
                [DEFAULT_TEMPLATE_NAME]: `foo`,
            })).toResolve();

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: genWarn([
                    `Failed to detect remote repository. Unknown structure of 'repository' field in 'package.json' file: 42`,
                    { pkgLock: true },
                ]),
            });

            await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe(`foo`);
        });

        it('invalid type object', async () => {
            const cwd = await createTmpDir(__filename, 'invalid-repository/invalid-type-object');
            await expect(writeFilesAsync(cwd, {
                'package.json': {
                    repository: {
                        url: 42,
                    },
                },
                [DEFAULT_TEMPLATE_NAME]: `foo`,
            })).toResolve();

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: genWarn([
                    `Failed to detect remote repository. Unknown structure of 'repository' field in 'package.json' file: { url: 42 }`,
                    { pkgLock: true },
                ]),
            });

            await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe(`foo`);
        });

        it('unknown url', async () => {
            const cwd = await createTmpDir(__filename, 'invalid-repository/unknown-url');
            await expect(writeFilesAsync(cwd, {
                'package.json': {
                    repository: 'https://example.com/example/repo',
                },
                [DEFAULT_TEMPLATE_NAME]: `foo`,
            })).toResolve();

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: genWarn([
                    `Failed to detect remote repository. Unknown structure of 'repository' field in 'package.json' file: 'https://example.com/example/repo'`,
                    { pkgLock: true },
                ]),
            });

            await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe(`foo`);
        });
    });
});
