import escapeStringRegexp from 'escape-string-regexp';
import hostedGitInfo from 'hosted-git-info';

import { equalsGitTagAndCommit, fetchTagsByApi, fetchReleasedVersions } from '../../../src/utils/repository';
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
            new RegExp(
                String.raw`^${
                    escapeStringRegexp(`HTTP 404`)
                }(?:\n {2}x-[a-z-]+: [^\r\n]+)*\n {2}body:(?:\n(?: {4}[^\r\n]+)?)+$`,
            ),
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
                expect(Date.now() - now).toBeLessThanOrEqual(5);
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
                    expect(Date.now() - now).toBeLessThanOrEqual(5);
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
            expect(Date.now() - now).toBeLessThanOrEqual(5);
        });
    }
});
