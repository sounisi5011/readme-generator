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

const repository = `https://github.com/sounisi5011/readme-generator.git`;
const repoURL = `https://github.com/sounisi5011/readme-generator`;

describe('repoBrowseURL', () => {
    it('basic', async () => {
        const version = `9999.7.3`;

        const cwd = await createTmpDir(__filename, 'basic');
        await writeFilesAsync(cwd, {
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
        });

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
        await writeFilesAsync(cwd, {
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
        });

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
        await writeFilesAsync(cwd, {
            'package.json': {
                version,
                repository,
            },
            [DEFAULT_TEMPLATE_NAME]: `{{ './non-exist' | repoBrowseURL }}`,
        });

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
            {
                title: 'same commit',
                existHeadCommit: true,
                existRemote: true,
                existReleasedTag: true,
                notAddNewCommit: true,
                commitIsh: `v%s`,
            },
            {
                title: 'different commit',
                existHeadCommit: true,
                existRemote: true,
                existReleasedTag: true,
                notAddNewCommit: false,
                commitIsh: `master`,
            },
            {
                title: 'non exist tag',
                existHeadCommit: true,
                existRemote: true,
                existReleasedTag: false,
                notAddNewCommit: true,
                commitIsh: `v%s`,
            },
            {
                title: 'non exist tag & different commit',
                existHeadCommit: true,
                existRemote: true,
                existReleasedTag: false,
                notAddNewCommit: false,
                commitIsh: `v%s`,
            },
            {
                title: 'non exist remote repository',
                existHeadCommit: true,
                existRemote: false,
                existReleasedTag: true,
                notAddNewCommit: true,
                commitIsh: `master`,
            },
            {
                title: 'non exist remote repository & different commit',
                existHeadCommit: true,
                existRemote: false,
                existReleasedTag: true,
                notAddNewCommit: false,
                commitIsh: `master`,
            },
            {
                title: 'non exist remote repository & non exist tag',
                existHeadCommit: true,
                existRemote: false,
                existReleasedTag: false,
                notAddNewCommit: true,
                commitIsh: `master`,
            },
            {
                title: 'non exist remote repository & non exist tag & different commit',
                existHeadCommit: true,
                existRemote: false,
                existReleasedTag: false,
                notAddNewCommit: false,
                commitIsh: `master`,
            },
            {
                title: 'non initialized git',
                existHeadCommit: false,
                existRemote: true,
                existReleasedTag: true,
                commitIsh: `v%s`,
            },
            {
                title: 'non initialized git & non exist tag',
                existHeadCommit: false,
                existRemote: true,
                existReleasedTag: false,
                commitIsh: `v%s`,
            },
            {
                title: 'non initialized git & non exist remote repository',
                existHeadCommit: false,
                existRemote: false,
                existReleasedTag: true,
                commitIsh: `v%s`,
            },
            {
                title: 'non initialized git & non exist remote repository & non exist tag',
                existHeadCommit: false,
                existRemote: false,
                existReleasedTag: false,
                commitIsh: `v%s`,
            },
        ] as const;

        for (const cond of table) {
            // eslint-disable-next-line jest/valid-title
            it(cond.title, async () => {
                const gitTagVersion = `0.0.3`;
                // eslint-disable-next-line jest/no-if
                const version = cond.existReleasedTag ? gitTagVersion : `9999.9999.9999`;
                // eslint-disable-next-line jest/no-if
                const repo = cond.existRemote ? repository : `https://github.com/example/repo`;
                // eslint-disable-next-line jest/no-if
                const repoUrl = cond.existRemote ? repoURL : `https://github.com/example/repo`;
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

                // eslint-disable-next-line jest/no-if
                if (cond.existHeadCommit) {
                    await expect(execa('git', [
                        'clone',
                        repository,
                        '--branch',
                        `v${gitTagVersion}`,
                        '--depth',
                        '1',
                        cwd,
                    ], { cwd })).resolves.toBeDefined();
                } else {
                    await expect(execa('git', ['init'], { cwd })).resolves.toBeDefined();
                }
                await writeFilesAsync(cwd, {
                    'package.json': {
                        version,
                        repository: repo,
                    },
                    [DEFAULT_TEMPLATE_NAME]: `{{ '/index.js' | repoBrowseURL }}`,
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
                await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves
                    .toBe(`${repoUrl}/tree/${cond.commitIsh.replace(/%s/g, version)}/index.js`);
            });
        }
    });

    it('invalid data', async () => {
        const cwd = await createTmpDir(__filename, 'invalid-data');
        await writeFilesAsync(cwd, {
            'package.json': {
                version: '9999.1.3',
                repository,
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
