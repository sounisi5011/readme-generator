import * as path from 'path';

import execa from 'execa';

import {
    createTmpDir,
    DEFAULT_TEMPLATE_NAME,
    execCli,
    fileEntryExists,
    projectRootDirpath,
    readFileAsync,
    writeFilesAsync,
} from '../helpers';
import { notFoundRepoURL, releasedVersion, repository, repoURL } from '../helpers/remote-repository';
import genWarn from '../helpers/warning-message';

describe('repoBrowseURL', () => {
    it('basic', async () => {
        const version = `9999.7.3`;

        const cwd = await createTmpDir(__filename, 'basic');
        await expect(writeFilesAsync(cwd, {
            'package.json': {
                version,
                repository,
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
        })).toResolve();

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkgLock: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe([
            `${repoURL}/tree/v${version}/${
                path.relative(
                    projectRootDirpath,
                    cwd,
                )
            }/package.json`,
            `${repoURL}/tree/v${version}/${
                path.relative(
                    projectRootDirpath,
                    path.dirname(cwd),
                )
            }/package.json`,
            `${repoURL}/tree/v${version}/package.json`,
            `${repoURL}/tree/v${version}/package.json`,
            ``,
            `${repoURL}/tree/COMMIT-ISH/package.json`,
            `${repoURL}/tree/4626dfa/package.json`,
            `${repoURL}/tree/gh-pages/package.json`,
            `${repoURL}/tree/foo/package.json`,
        ].join('\n'));
    });

    it('option priority', async () => {
        const version = `9999.2.6`;

        const cwd = await createTmpDir(__filename, 'option-priority');
        await expect(writeFilesAsync(cwd, {
            'package.json': {
                version,
                repository,
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
        })).toResolve();

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkgLock: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe([
            `* < committish`,
            `${repoURL}/tree/COMMIT-ISH/package.json`,
            `${repoURL}/tree/COMMIT-ISH/package.json`,
            `${repoURL}/tree/COMMIT-ISH/package.json`,
            ``,
            `* < commit < committish`,
            `${repoURL}/tree/4626dfa/package.json`,
            `${repoURL}/tree/4626dfa/package.json`,
            `${repoURL}/tree/4626dfa/package.json`,
            ``,
            `* < branch < commit < committish`,
            `${repoURL}/tree/gh-pages/package.json`,
            `${repoURL}/tree/gh-pages/package.json`,
            `${repoURL}/tree/gh-pages/package.json`,
            ``,
            `tag < branch < commit < committish`,
            `${repoURL}/tree/foo/package.json`,
            `${repoURL}/tree/foo/package.json`,
            ``,
            `other options are ignored`,
            `${repoURL}/tree/v${version}/package.json`,
            `${repoURL}/tree/v${version}/package.json`,
            `${repoURL}/tree/v${version}/package.json`,
        ].join('\n'));
    });

    it('non exist path', async () => {
        const version = `9999.8.1`;

        const cwd = await createTmpDir(__filename, 'non-exist-path');
        await expect(writeFilesAsync(cwd, {
            'package.json': {
                version,
                repository,
            },
            [DEFAULT_TEMPLATE_NAME]: `{{ './non-exist' | repoBrowseURL }}`,
        })).toResolve();

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkgLock: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves
            .toBe(`${repoURL}/tree/v${version}/${path.relative(projectRootDirpath, cwd)}/non-exist`);
    });

    describe('git', () => {
        const table = [
            ['same commit', {
                existHeadCommit: true,
                existRemote: true,
                existReleasedTag: true,
                notAddNewCommit: true,
                commitIsh: `v%s`,
            }],
            ['different commit', {
                existHeadCommit: true,
                existRemote: true,
                existReleasedTag: true,
                notAddNewCommit: false,
                commitIsh: `master`,
            }],
            ['non exist tag', {
                existHeadCommit: true,
                existRemote: true,
                existReleasedTag: false,
                notAddNewCommit: true,
                commitIsh: `v%s`,
            }],
            ['non exist tag & different commit', {
                existHeadCommit: true,
                existRemote: true,
                existReleasedTag: false,
                notAddNewCommit: false,
                commitIsh: `v%s`,
            }],
            ['non exist remote repository', {
                existHeadCommit: true,
                existRemote: false,
                existReleasedTag: true,
                notAddNewCommit: true,
                commitIsh: `master`,
            }],
            ['non exist remote repository & different commit', {
                existHeadCommit: true,
                existRemote: false,
                existReleasedTag: true,
                notAddNewCommit: false,
                commitIsh: `master`,
            }],
            ['non exist remote repository & non exist tag', {
                existHeadCommit: true,
                existRemote: false,
                existReleasedTag: false,
                notAddNewCommit: true,
                commitIsh: `master`,
            }],
            ['non exist remote repository & non exist tag & different commit', {
                existHeadCommit: true,
                existRemote: false,
                existReleasedTag: false,
                notAddNewCommit: false,
                commitIsh: `master`,
            }],
            ['non initialized git', {
                existHeadCommit: false,
                existRemote: true,
                existReleasedTag: true,
                commitIsh: `master`,
            }],
            ['non initialized git & non exist tag', {
                existHeadCommit: false,
                existRemote: true,
                existReleasedTag: false,
                commitIsh: `master`,
            }],
            ['non initialized git & non exist remote repository', {
                existHeadCommit: false,
                existRemote: false,
                existReleasedTag: true,
                commitIsh: `master`,
            }],
            ['non initialized git & non exist remote repository & non exist tag', {
                existHeadCommit: false,
                existRemote: false,
                existReleasedTag: false,
                commitIsh: `master`,
            }],
        ] as const;

        it.each(table)('%s', async (_, cond) => {
            const version = cond.existReleasedTag ? releasedVersion : `9999.9999.9999`;
            const repo = cond.existRemote ? repository : notFoundRepoURL;
            const repoUrl = cond.existRemote ? repoURL : notFoundRepoURL;
            const cwd = await createTmpDir(
                __filename,
                [
                    `git`,
                    cond.existHeadCommit ? `init-git` : `non-init-git`,
                    cond.existRemote ? `exist-remote` : `non-exist-remote`,
                    cond.existReleasedTag ? `exist-tag` : `non-exist-tag`,
                ]
                    .concat(cond.existHeadCommit ? (cond.notAddNewCommit ? `same-commit` : `diff-commit`) : [])
                    .join('/'),
            );

            if (cond.existHeadCommit) {
                await expect(execa('git', [
                    'clone',
                    repository,
                    '--branch',
                    `v${releasedVersion}`,
                    '--depth',
                    '1',
                    cwd,
                ], { cwd })).toResolve();
            } else {
                await expect(execa('git', ['init'], { cwd })).toResolve();
            }
            await expect(writeFilesAsync(cwd, {
                'package.json': {
                    version,
                    repository: repo,
                },
                [DEFAULT_TEMPLATE_NAME]: `{{ '/index.js' | repoBrowseURL }}`,
            })).toResolve();
            if (cond.existHeadCommit) {
                if (!cond.notAddNewCommit) {
                    await expect(execa('git', ['add', '.'], { cwd })).toResolve();
                    await expect(execa('git', ['commit', '-m', 'exam'], { cwd })).toResolve();
                }
            } else {
                await expect(execa('git', ['rev-parse', 'HEAD'], { cwd })).toReject();
            }

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: genWarn([
                    !cond.existHeadCommit || cond.existRemote
                        ? null
                        : /Failed to fetch git tags for remote repository:(?:\n(?: {2}[^\n]+)?)+/,
                    cond.existHeadCommit ? null : { pkgLock: true },
                ]),
            });
            await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves
                .toBe(`${repoUrl}/tree/${cond.commitIsh.replace(/%s/g, version)}/index.js`);
        });
    });

    it('invalid data', async () => {
        const cwd = await createTmpDir(__filename, 'invalid-data');
        await expect(writeFilesAsync(cwd, {
            'package.json': {
                version: '1.4.2',
                repository,
            },
            [DEFAULT_TEMPLATE_NAME]: `{{ 42 | repoBrowseURL }}`,
        })).toResolve();

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 1,
            stdout: '',
            stderr: genWarn([
                { pkgLock: true },
                `(unknown path)`,
                `  TypeError: repoBrowseURL() filter / Invalid filepath value: 42`,
            ]),
        });

        await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
    });
});
