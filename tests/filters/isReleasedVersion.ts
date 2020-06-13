import * as path from 'path';

import execa from 'execa';

import { createTmpDir, DEFAULT_TEMPLATE_NAME, execCli, readFileAsync, writeFilesAsync } from '../helpers';
import { notFoundRepoURL, releasedVersion, repository } from '../helpers/remote-repository';
import genWarn from '../helpers/warning-message';

describe('isReleasedVersion', () => {
    const table = [
        {
            title: 'same commit',
            existHeadCommit: true,
            existRemote: true,
            existReleasedTag: true,
            notAddNewCommit: true,
            result: true,
        },
        {
            title: 'different commit',
            existHeadCommit: true,
            existRemote: true,
            existReleasedTag: true,
            notAddNewCommit: false,
            result: true,
        },
        {
            title: 'non exist tag',
            existHeadCommit: true,
            existRemote: true,
            existReleasedTag: false,
            notAddNewCommit: true,
            result: false,
        },
        {
            title: 'non exist tag & different commit',
            existHeadCommit: true,
            existRemote: true,
            existReleasedTag: false,
            notAddNewCommit: false,
            result: false,
        },
        {
            title: 'non exist remote repository',
            existHeadCommit: true,
            existRemote: false,
            existReleasedTag: true,
            notAddNewCommit: true,
            result: null,
        },
        {
            title: 'non exist remote repository & different commit',
            existHeadCommit: true,
            existRemote: false,
            existReleasedTag: true,
            notAddNewCommit: false,
            result: null,
        },
        {
            title: 'non exist remote repository & non exist tag',
            existHeadCommit: true,
            existRemote: false,
            existReleasedTag: false,
            notAddNewCommit: true,
            result: null,
        },
        {
            title: 'non exist remote repository & non exist tag & different commit',
            existHeadCommit: true,
            existRemote: false,
            existReleasedTag: false,
            notAddNewCommit: false,
            result: null,
        },
        {
            title: 'non initialized git',
            existHeadCommit: false,
            existRemote: true,
            existReleasedTag: true,
            result: null,
        },
        {
            title: 'non initialized git & non exist tag',
            existHeadCommit: false,
            existRemote: true,
            existReleasedTag: false,
            result: null,
        },
        {
            title: 'non initialized git & non exist remote repository',
            existHeadCommit: false,
            existRemote: false,
            existReleasedTag: true,
            result: null,
        },
        {
            title: 'non initialized git & non exist remote repository & non exist tag',
            existHeadCommit: false,
            existRemote: false,
            existReleasedTag: false,
            result: null,
        },
    ] as const;

    for (const cond of table) {
        // eslint-disable-next-line jest/valid-title
        it(cond.title, async () => {
            // eslint-disable-next-line jest/no-if
            const version = cond.existReleasedTag ? releasedVersion : `9999.9999.9999`;
            // eslint-disable-next-line jest/no-if
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

            // eslint-disable-next-line jest/no-if
            if (cond.existHeadCommit) {
                await expect(execa('git', [
                    'clone',
                    repository,
                    '--branch',
                    `v${releasedVersion}`,
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
                    `{{ version | isReleasedVersion | dump }}`,
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
                stderr: expect.stringMatching(
                    '^' + ([] as string[]).concat(
                        !cond.existHeadCommit || cond.existRemote
                            ? []
                            : String.raw`Failed to fetch git tags for remote repository:(?:\n(?:  [^\n]+)?)+`,
                    ).concat(
                        cond.existHeadCommit
                            ? []
                            : genWarn({ pkgLock: true, injectRegExp: true }),
                    ).join('\n') + '$',
                ),
            });
            await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves
                .toBe(JSON.stringify(cond.result));
        });
    }
});