import * as path from 'path';

import execa from 'execa';

import { createTmpDir, DEFAULT_TEMPLATE_NAME, execCli, readFileAsync, writeFilesAsync } from '../helpers';
import { notFoundRepoURL, releasedVersion, repository } from '../helpers/remote-repository';
import genWarn from '../helpers/warning-message';

describe('isOlderReleasedVersion', () => {
    const table = [
        ['same commit', {
            existHeadCommit: true,
            existRemote: true,
            existReleasedTag: true,
            notAddNewCommit: true,
            result: false,
        }],
        ['different commit', {
            existHeadCommit: true,
            existRemote: true,
            existReleasedTag: true,
            notAddNewCommit: false,
            result: true,
        }],
        ['non exist tag', {
            existHeadCommit: true,
            existRemote: true,
            existReleasedTag: false,
            notAddNewCommit: true,
            result: false,
        }],
        ['non exist tag & different commit', {
            existHeadCommit: true,
            existRemote: true,
            existReleasedTag: false,
            notAddNewCommit: false,
            result: false,
        }],
        ['non exist remote repository', {
            existHeadCommit: true,
            existRemote: false,
            existReleasedTag: true,
            notAddNewCommit: true,
            result: null,
        }],
        ['non exist remote repository & different commit', {
            existHeadCommit: true,
            existRemote: false,
            existReleasedTag: true,
            notAddNewCommit: false,
            result: null,
        }],
        ['non exist remote repository & non exist tag', {
            existHeadCommit: true,
            existRemote: false,
            existReleasedTag: false,
            notAddNewCommit: true,
            result: null,
        }],
        ['non exist remote repository & non exist tag & different commit', {
            existHeadCommit: true,
            existRemote: false,
            existReleasedTag: false,
            notAddNewCommit: false,
            result: null,
        }],
        ['non initialized git', {
            existHeadCommit: false,
            existRemote: true,
            existReleasedTag: true,
            result: null,
        }],
        ['non initialized git & non exist tag', {
            existHeadCommit: false,
            existRemote: true,
            existReleasedTag: false,
            result: null,
        }],
        ['non initialized git & non exist remote repository', {
            existHeadCommit: false,
            existRemote: false,
            existReleasedTag: true,
            result: null,
        }],
        ['non initialized git & non exist remote repository & non exist tag', {
            existHeadCommit: false,
            existRemote: false,
            existReleasedTag: false,
            result: null,
        }],
    ] as const;

    it.each(table)('%s', async (_, cond) => {
        const version = cond.existReleasedTag ? releasedVersion : `9999.9999.9999`;
        const repo = cond.existRemote ? repository : notFoundRepoURL;
        const cwd = await createTmpDir(
            __filename,
            [
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
                repository: repo,
            },
            [DEFAULT_TEMPLATE_NAME]: [
                `{% set version = ${JSON.stringify(version)} -%}`,
                `{{ version | isOlderReleasedVersion | dump }}`,
            ],
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
            .toBe(JSON.stringify(cond.result));
    });
});
