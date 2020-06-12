import escapeStringRegexp from 'escape-string-regexp';
import hostedGitInfo from 'hosted-git-info';

import { fetchTagsByApi, fetchReleasedVersions } from '../../../src/utils/repository';

const gitInfo = hostedGitInfo.fromUrl('github:sounisi5011/readme-generator');
const versions = {
    '0.0.1': {
        sha: '27b718e05c1c6596513ecbe2c1d0478dc1148fcc',
        ref: 'v0.0.1',
        rawRef: 'refs/tags/v0.0.1',
        type: 'tag',
    },
    '0.0.2': {
        sha: '536eacc3d4762f6de171aecbf3f06efbeb87fd3a',
        ref: 'v0.0.2',
        rawRef: 'refs/tags/v0.0.2',
        type: 'tag',
    },
    '0.0.3': {
        sha: '197cdb32edab666a319dae57ba24911e0b637a49',
        ref: 'v0.0.3',
        rawRef: 'refs/tags/v0.0.3',
        type: 'tag',
    },
};
const notFoundGitInfo = hostedGitInfo.fromUrl('github:sounisi5011/example-repo-private');

describe('fetchTagsByApi()', () => {
    it('try fetch', async () => {
        await expect(fetchTagsByApi(gitInfo)).resolves.toStrictEqual(
            expect.arrayContaining(Object.values(versions).map(({ sha, rawRef }) => `${sha}  ${rawRef}`)),
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
