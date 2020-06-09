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
