import escapeStringRegexp from 'escape-string-regexp';
import hostedGitInfo from 'hosted-git-info';

import {
    equalsGitTagAndCommit,
    fetchTagsByApi,
    fetchReleasedVersions,
    GitTag,
    ReleasedVersions,
} from '../../../src/utils/repository';
import { flatMap } from '../../helpers';
import { notFoundRepoURL, repository, tagShaRecord, versions } from '../../helpers/remote-repository';

const gitInfo = hostedGitInfo.fromUrl(repository);
const notFoundGitInfo = hostedGitInfo.fromUrl(notFoundRepoURL);

describe('fetchTagsByApi()', () => {
    it('try fetch', async () => {
        await expect(fetchTagsByApi(gitInfo)).resolves.toStrictEqual(
            expect.arrayContaining(
                Object.entries(tagShaRecord).map(([tagName, sha1]) => `${sha1}  refs/tags/${tagName}`),
            ),
        );
    });

    it('not found', async () => {
        await expect(fetchTagsByApi(notFoundGitInfo)).rejects.toThrow(
            new RegExp(
                String.raw`^${
                    escapeStringRegexp(`HTTP 404`)
                }(?:\n {2}x-[a-z-]+: [^\r\n]+)*\n {2}body:(?:\n(?: {4}[^\r\n]+)?)+$`,
            ),
        );
    });
});

describe('fetchReleasedVersions()', () => {
    it('try fetch', async () => {
        await expect(fetchReleasedVersions(gitInfo)).resolves.toMatchObject(
            Object.entries(versions).reduce(
                (versions, [version, data]) => ({
                    ...versions,
                    [version]: { ...data, sha: expect.stringMatching(`^(?:${data.sha}|${tagShaRecord[data.ref]})$`) },
                }),
                {},
            ),
        );
    });

    it('not found', async () => {
        await expect(fetchReleasedVersions(notFoundGitInfo)).rejects.toThrow(
            /^command failed\n {2}\$ [^\n]+\n(?:\n {2}> [^\n]+)*\n{2} {2}exited with error code: [0-9]+$/,
        );
    });
});

describe('equalsGitTagAndCommit()', () => {
    describe('equal', () => {
        for (const tagData of Object.values(versions)) {
            const { ref: tagName, sha: commitSHA1 } = tagData;
            const tagSHA1 = tagShaRecord[tagName];

            // eslint-disable-next-line jest/valid-title
            it(tagName, async () => {
                await expect(equalsGitTagAndCommit(gitInfo, { ...tagData, sha: tagSHA1 }, commitSHA1)).resolves.toBe(
                    true,
                );
            });

            // eslint-disable-next-line jest/valid-title
            it(`${tagName} - cached`, async () => {
                const now = Date.now();
                for (let i = 0; i < 4; i++) {
                    await expect(equalsGitTagAndCommit(gitInfo, { ...tagData, sha: tagSHA1 }, commitSHA1)).resolves
                        .toBe(true);
                }
                expect(Date.now() - now).toBeLessThanOrEqual(25);
            });
        }
    });

    describe('not equal', () => {
        for (const tagData of Object.values(versions)) {
            const { ref: tagName1, sha: commitSHA1 } = tagData;
            for (const [tagName2, tagSHA1] of Object.entries(tagShaRecord)) {
                if (tagName1 === tagName2) continue;
                // eslint-disable-next-line jest/valid-title
                it(`${tagName1} ≠ ${tagName2}`, async () => {
                    await expect(equalsGitTagAndCommit(gitInfo, { ...tagData, sha: tagSHA1 }, commitSHA1)).resolves
                        .toBe(false);
                });

                // eslint-disable-next-line jest/valid-title
                it(`${tagName1} ≠ ${tagName2} - cached`, async () => {
                    const now = Date.now();
                    for (let i = 0; i < 4; i++) {
                        await expect(equalsGitTagAndCommit(gitInfo, { ...tagData, sha: tagSHA1 }, commitSHA1)).resolves
                            .toBe(false);
                    }
                    expect(Date.now() - now).toBeLessThanOrEqual(25);
                });
            }
        }
    });

    {
        const errorMessageRegExp = /HTTP 404(?:\n {2}x-[a-z-]+:[^\r\n]+)*\n {2}body:(?:\n(?: {4}[^\r\n]+)?)+/;
        const tagData = {
            type: 'tag',
            sha: 'd21146fccf5db83314d84dc39df55a5cfe322ac8',
            ref: 'v9999.9999.9999',
            rawRef: '',
        } as const;
        const commitSHA1 = 'ed51c4411634819762cbd8de90c06ab1b4d65d43';
        const errorMsgRegExp = new RegExp(`^${errorMessageRegExp.source}$`);
        const errorTextRegExp = new RegExp(`^StatusError: ${errorMessageRegExp.source}$`);

        it('no exist sha1', async () => {
            const result = equalsGitTagAndCommit(gitInfo, tagData, commitSHA1);
            await expect(result).rejects.toThrow(errorMsgRegExp);
            await expect(result.catch(error => String(error))).resolves.toMatch(errorTextRegExp);
        });

        it(`no exist sha1 - cached`, async () => {
            const now = Date.now();
            for (let i = 0; i < 4; i++) {
                const result = equalsGitTagAndCommit(gitInfo, tagData, commitSHA1);
                await expect(result).rejects.toThrow(errorMsgRegExp);
                await expect(result.catch(error => String(error))).resolves.toMatch(errorTextRegExp);
            }
            expect(Date.now() - now).toBeLessThanOrEqual(25);
        });
    }
});

describe('class GitTag()', () => {
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
        await expect(ReleasedVersions.fetch(notFoundGitInfo))
            .rejects.toThrow(
                /^command failed\n {2}\$ [^\n]+\n(?:\n {2}> [^\n]+)*\n{2} {2}exited with error code: [0-9]+$/,
            );
    });
});
