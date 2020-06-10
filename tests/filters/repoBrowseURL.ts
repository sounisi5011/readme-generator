import * as path from 'path';

import {
    createTmpDir,
    DEFAULT_TEMPLATE_NAME,
    execCli,
    fileEntryExists,
    projectRootDirpath,
    readFileAsync,
    writeFilesAsync,
} from '../helpers';
import genWarn from '../helpers/warning-message';

import execa = require('execa');

describe('repoBrowseURL', () => {
    it('basic', async () => {
        const version = `9999.7.3`;

        const cwd = await createTmpDir(__filename, 'basic');
        await writeFilesAsync(cwd, {
            'package.json': {
                version,
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
            ],
        });

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkgLock: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe([
            `https://github.com/example/repo/tree/v${version}/${
                path.relative(
                    projectRootDirpath,
                    cwd,
                )
            }/package.json`,
            `https://github.com/example/repo/tree/v${version}/${
                path.relative(
                    projectRootDirpath,
                    path.dirname(cwd),
                )
            }/package.json`,
            `https://github.com/example/repo/tree/v${version}/package.json`,
            `https://github.com/example/repo/tree/v${version}/package.json`,
            ``,
            `https://github.com/example/repo/tree/COMMIT-ISH/package.json`,
            `https://github.com/example/repo/tree/4626dfa/package.json`,
            `https://github.com/example/repo/tree/gh-pages/package.json`,
            `https://github.com/example/repo/tree/foo/package.json`,
        ].join('\n'));
    });

    it('option priority', async () => {
        const version = `9999.2.6`;

        const cwd = await createTmpDir(__filename, 'option-priority');
        await writeFilesAsync(cwd, {
            'package.json': {
                version,
                repository: 'https://github.com/example/repo.git',
            },
            [DEFAULT_TEMPLATE_NAME]: [
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

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkgLock: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe([
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
            `https://github.com/example/repo/tree/v${version}/package.json`,
            `https://github.com/example/repo/tree/v${version}/package.json`,
            `https://github.com/example/repo/tree/v${version}/package.json`,
        ].join('\n'));
    });

    it('non exist path', async () => {
        const version = `9999.8.1`;

        const cwd = await createTmpDir(__filename, 'non-exist-path');
        await writeFilesAsync(cwd, {
            'package.json': {
                version,
                repository: 'https://github.com/example/repo.git',
            },
            [DEFAULT_TEMPLATE_NAME]: `{{ './non-exist' | repoBrowseURL }}`,
        });

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkgLock: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves
            .toBe(
                `https://github.com/example/repo/tree/v${version}/${path.relative(projectRootDirpath, cwd)}/non-exist`,
            );
    });

    describe('git', () => {
        const table = [
            {
                title: 'same commit',
                existHeadCommit: true,
                existReleasedTag: true,
                notAddNewCommit: true,
                commitIsh: `v%s`,
            },
            {
                title: 'different commit',
                existHeadCommit: true,
                existReleasedTag: true,
                notAddNewCommit: false,
                commitIsh: `master`,
            },
            {
                title: 'non exist tag',
                existHeadCommit: true,
                existReleasedTag: false,
                notAddNewCommit: false,
                commitIsh: `v%s`,
            },
            {
                title: 'non committed git',
                existHeadCommit: false,
                existReleasedTag: false,
                notAddNewCommit: false,
                commitIsh: `master`,
            },
        ] as const;
        const repository = `https://github.com/example/repo.git`;
        const repoURL = `https://github.com/example/repo`;

        for (const cond of table) {
            // eslint-disable-next-line jest/valid-title
            it(cond.title, async () => {
                // eslint-disable-next-line jest/no-if
                const version = `1.2.3`;
                const cwd = await createTmpDir(
                    __filename,
                    [
                        `git`,
                        cond.existHeadCommit ? `initial-commit` : `non-initial-commit`,
                        cond.existReleasedTag ? `exist-tag` : `non-exist-tag`,
                        cond.notAddNewCommit ? `same-commit` : `diff-commit`,
                    ]
                        .join('/'),
                );

                await expect(execa('git', ['init'], { cwd })).resolves.toBeDefined();
                await writeFilesAsync(cwd, {
                    'package.json': {
                        version,
                        repository,
                    },
                    [DEFAULT_TEMPLATE_NAME]: `{{ '/index.js' | repoBrowseURL }}`,
                });
                // eslint-disable-next-line jest/no-if
                if (cond.existHeadCommit) {
                    await expect(execa('git', ['add', '--all'], { cwd })).resolves.toBeDefined();
                    await expect(execa('git', ['commit', '-m', 'Initial commit'], { cwd })).resolves.toBeDefined();

                    // eslint-disable-next-line jest/no-if
                    if (cond.existReleasedTag) {
                        await expect(execa('git', ['tag', `v${version}`], { cwd })).resolves.toBeDefined();
                        await expect(execa('git', ['tag', `--list`], { cwd })).resolves.toMatchObject({
                            exitCode: 0,
                            stdout: `v${version}`,
                            stderr: '',
                        });

                        // eslint-disable-next-line jest/no-if
                        if (!cond.notAddNewCommit) {
                            await expect(execa('git', ['commit', '--allow-empty', '-m', 'Second commit'], { cwd }))
                                .resolves.toBeDefined();
                            await expect((async () => {
                                const tagSha1 = (await execa('git', ['rev-parse', `v${version}`], { cwd })).stdout;
                                const headSha1 = (await execa('git', ['rev-parse', 'HEAD'], { cwd })).stdout;
                                expect(headSha1).not.toBe(tagSha1);
                            })()).resolves.toBeUndefined();
                        }
                    }
                } else {
                    await expect(execa('git', ['rev-parse', 'HEAD'], { cwd })).rejects.toBeDefined();
                }

                await expect(execCli(cwd, [])).resolves.toMatchObject({
                    exitCode: 0,
                    stdout: '',
                    stderr: genWarn({ pkgLock: true }),
                });
                await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves
                    .toBe(`${repoURL}/tree/${cond.commitIsh.replace(/%s/g, version)}/index.js`);
            });
        }
    });

    it('invalid data', async () => {
        const cwd = await createTmpDir(__filename, 'invalid-data');
        await writeFilesAsync(cwd, {
            'package.json': {
                version: '1.4.2',
                repository: 'https://github.com/example/repo.git',
            },
            [DEFAULT_TEMPLATE_NAME]: `{{ 42 | repoBrowseURL }}`,
        });

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 1,
            stdout: '',
            stderr: [
                genWarn({ pkgLock: true }),
                `(unknown path)`,
                `  TypeError: repoBrowseURL() filter / Invalid filepath value: 42`,
            ].join('\n'),
        });

        await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
    });
});
