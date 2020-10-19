import hostedGitInfo from 'hosted-git-info';

import { GitTag, ReleasedVersions } from '../../../src/utils/repository';
import { flatMap } from '../../helpers';
import { notFoundRepoURL, repository, tagShaRecord, versions } from '../../helpers/remote-repository';

const gitInfo = hostedGitInfo.fromUrl(repository);
const notFoundGitInfo = hostedGitInfo.fromUrl(notFoundRepoURL);

describe('class GitTag()', () => {
    if (!(gitInfo instanceof hostedGitInfo)) {
        it('gitInfo instanceof hostedGitInfo', () => expect(gitInfo).toBeInstanceOf(hostedGitInfo));
        return;
    }
    const table = flatMap(Object.values(versions), ({ ref: tagName, sha: commitSHA1 }) => {
        const tagSHA1 = tagShaRecord[tagName];
        return [
            { hasTag: true, hasCommit: true },
            { hasTag: true, hasCommit: false },
            { hasTag: false, hasCommit: true },
        ].map(({ hasTag, hasCommit }) => {
            const meta = {
                tagSHA1,
                commitSHA1,
                tagHashOrUndef: hasTag ? tagSHA1 : undefined,
                commitHashOrUndef: hasCommit ? commitSHA1 : undefined,
            };
            if (hasTag && !hasCommit) {
                return [tagName, { tag: tagSHA1 }, meta] as const;
            } else if (!hasTag && hasCommit) {
                return [tagName, { commit: commitSHA1 }, meta] as const;
            } else {
                return [tagName, { tag: tagSHA1, commit: commitSHA1 }, meta] as const;
            }
        });
    });
    describe.each(table)(
        'new GitTag(tagName=%p, sha1Record=%p)',
        (tagName, sha1Record, { commitSHA1, tagHashOrUndef, commitHashOrUndef }) => {
            const gitTag = new GitTag(gitInfo, tagName, sha1Record);

            it.each([tagName])('.tagName === %p', tagName => {
                expect(gitTag.tagName).toBe(tagName);
            });

            it.each([tagHashOrUndef])('.tagSHA1 === %p', tagHashOrUndef => {
                expect(gitTag.tagSHA1).toBe(tagHashOrUndef);
            });

            it.each([commitHashOrUndef])('.commitSHA1 === %p', commitHashOrUndef => {
                expect(gitTag.commitSHA1).toBe(commitHashOrUndef);
            });

            it.each([[commitSHA1, commitHashOrUndef]])(
                'await .fetchCommitSHA1() === %p',
                async (commitSHA1, commitHashOrUndef) => {
                    expect(gitTag.commitSHA1).toBe(commitHashOrUndef);
                    await expect(gitTag.fetchCommitSHA1())
                        .resolves.toBe(commitSHA1);
                    expect(gitTag.commitSHA1).toBe(commitSHA1);
                },
            );
        },
    );
});

describe('class ReleasedVersions()', () => {
    describe('try fetch', () => {
        if (!(gitInfo instanceof hostedGitInfo)) {
            it('gitInfo instanceof hostedGitInfo', () => expect(gitInfo).toBeInstanceOf(hostedGitInfo));
            return;
        }
        const releasedVersions = ReleasedVersions.fetch(gitInfo);

        it('version keys include', async () => {
            await expect(releasedVersions.then(v => [...v.keys()]))
                .resolves.toStrictEqual(expect.arrayContaining(Object.keys(versions)));
        });

        const table = Object.entries(versions);
        it.each(table)('.get(%p) instanceof GitTag', async version => {
            await expect(releasedVersions.then(v => v.get(version)))
                .resolves.toBeInstanceOf(GitTag);
        });
        it.each(table)('.get(%p).tagSHA1', async (version, { ref: tagName }) => {
            const tagSHA1 = tagShaRecord[tagName];
            await expect(releasedVersions.then(v => v.get(version)?.tagSHA1))
                .resolves.toBe(tagSHA1);
        });
        it.each(table)('.get(%p).commitSHA1', async (version, { sha: commitSHA1 }) => {
            await expect(releasedVersions.then(v => v.get(version)?.commitSHA1))
                .resolves.toBeOneOf([commitSHA1, undefined]);
        });
        it.each(table)('.get(%p).fetchCommitSHA1()', async (version, { sha: commitSHA1 }) => {
            await expect(releasedVersions.then(v => v.get(version)?.fetchCommitSHA1()))
                .resolves.toBe(commitSHA1);
        });
    });

    it('not found', async () => {
        expect(notFoundGitInfo).toBeInstanceOf(hostedGitInfo);
        if (!(notFoundGitInfo instanceof hostedGitInfo)) return;

        await expect(ReleasedVersions.fetch(notFoundGitInfo))
            .rejects.toThrow(
                /^command failed\n {2}\$ [^\n]+\n(?:\n {2}> [^\n]+)*\n{2} {2}exited with error code: [0-9]+$/,
            );
    });
});
