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

describe('repoBrowseURL', () => {
    it('basic', async () => {
        const cwd = await createTmpDir(__filename, 'basic');
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
                `https://github.com/example/repo/tree/v1.4.2/${
                    path.relative(
                        projectRootDirpath,
                        cwd,
                    )
                }/package.json`,
                `https://github.com/example/repo/tree/v1.4.2/${
                    path.relative(
                        projectRootDirpath,
                        path.dirname(cwd),
                    )
                }/package.json`,
                `https://github.com/example/repo/tree/v1.4.2/package.json`,
                `https://github.com/example/repo/tree/v1.4.2/package.json`,
                ``,
                `https://github.com/example/repo/tree/COMMIT-ISH/package.json`,
                `https://github.com/example/repo/tree/4626dfa/package.json`,
                `https://github.com/example/repo/tree/gh-pages/package.json`,
                `https://github.com/example/repo/tree/foo/package.json`,
            ].join('\n'),
        );
    });

    it('option priority', async () => {
        const cwd = await createTmpDir(__filename, 'option-priority');
        await writeFilesAsync(cwd, {
            'package.json': {
                version: '1.4.2',
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

        await expect(
            readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
        ).resolves.toBe(
            [
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

    it('non exist path', async () => {
        const cwd = await createTmpDir(__filename, 'non-exist-path');
        await writeFilesAsync(cwd, {
            'package.json': {
                version: '1.4.2',
                repository: 'https://github.com/example/repo.git',
            },
            [DEFAULT_TEMPLATE_NAME]: `{{ './non-exist' | repoBrowseURL }}`,
        });

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkgLock: true }),
        });

        await expect(
            readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
        ).resolves.toBe(
            `https://github.com/example/repo/tree/v1.4.2/${
                path.relative(
                    projectRootDirpath,
                    cwd,
                )
            }/non-exist`,
        );
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
