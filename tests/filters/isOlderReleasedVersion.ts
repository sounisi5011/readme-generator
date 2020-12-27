import hostedGitInfo from 'hosted-git-info';

import { renderNunjucksWithFrontmatter } from '../../src/renderer';
import { isOlderReleasedVersionGen } from '../../src/template-filters/isOlderReleasedVersion';
import { ReleasedVersions } from '../../src/utils/repository';
import { randomSHA1 } from '../helpers';
import { notFoundRepoURL, releasedVersion, releasedVersionData, repository } from '../helpers/remote-repository';

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
        const templateText = [
            `{% set version = ${JSON.stringify(version)} -%}`,
            `{{ version | isOlderReleasedVersion | dump }}`,
        ].join('\n');
        const gitInfo = hostedGitInfo.fromUrl(repo) as hostedGitInfo;
        const releasedVersionsFetchErrorMessage = Math.random().toString(36).substring(2);

        const isOlderReleasedVersion = isOlderReleasedVersionGen({
            getHeadCommitSha1: async () => {
                if (cond.existHeadCommit) {
                    const releasedVersionSHA1 = releasedVersionData.sha;
                    return cond.notAddNewCommit
                        ? releasedVersionSHA1
                        : randomSHA1({ noMatching: releasedVersionSHA1 });
                }
                // TODO: Throw an Error like the "git rev-parse HEAD" command fails.
                return null;
            },
            getReleasedVersions: async () =>
                await ReleasedVersions.fetch(gitInfo).catch(() => {
                    throw new Error(releasedVersionsFetchErrorMessage);
                }),
        });
        const result = renderNunjucksWithFrontmatter(
            templateText,
            {},
            { cwd: '.', filters: { isOlderReleasedVersion }, extensions: [] },
        );
        if (!cond.existHeadCommit || cond.existRemote) {
            await expect(result).resolves.toBe(JSON.stringify(cond.result));
        } else {
            await expect(result).rejects.toThrow([
                `(unknown path)`,
                `  Error: isOlderReleasedVersion() filter / ${releasedVersionsFetchErrorMessage}`,
            ].join('\n'));
        }
    });

    it('invalid data', async () => {
        const templateText = `{{ 42 | isOlderReleasedVersion }}`;

        const isOlderReleasedVersion = isOlderReleasedVersionGen({
            getHeadCommitSha1: async () => null,
            getReleasedVersions: async () => undefined,
        });
        const result = renderNunjucksWithFrontmatter(
            templateText,
            {},
            { cwd: '.', filters: { isOlderReleasedVersion }, extensions: [] },
        );
        await expect(result).rejects.toThrow([
            `(unknown path)`,
            `  TypeError: isOlderReleasedVersion() filter / Invalid version value: 42`,
        ].join('\n'));
    });
});
