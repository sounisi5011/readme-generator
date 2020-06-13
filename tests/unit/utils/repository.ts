import escapeStringRegexp from 'escape-string-regexp';
import hostedGitInfo from 'hosted-git-info';

import { fetchTagsByApi, fetchReleasedVersions } from '../../../src/utils/repository';
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
        await expect(fetchReleasedVersions(gitInfo)).resolves.toMatchObject(versions);
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
