import type { GetHeadCommitSha1Fn, GetReleasedVersionsFn } from '../main';
import { errorMsgTag } from '../utils';
import type { ReleasedVersions } from '../utils/repository';

function validateVersionArg(version: unknown): asserts version is string {
    if (typeof version !== 'string') {
        throw new TypeError(errorMsgTag`Invalid version value: ${version}`);
    }
}

async function getRepoData(
    { getHeadCommitSha1, getReleasedVersions }: {
        getHeadCommitSha1: GetHeadCommitSha1Fn;
        getReleasedVersions: GetReleasedVersionsFn;
    },
): Promise<{ headCommitSha1: string; releasedVersions: ReleasedVersions } | null> {
    const headCommitSha1 = await getHeadCommitSha1();
    if (!headCommitSha1) return null;

    const releasedVersions = await getReleasedVersions();
    if (!releasedVersions) return null;

    return { headCommitSha1, releasedVersions };
}

export function isOlderReleasedVersionGen(
    { getHeadCommitSha1, getReleasedVersions }: {
        getHeadCommitSha1: GetHeadCommitSha1Fn;
        getReleasedVersions: GetReleasedVersionsFn;
    },
) {
    return async function isOlderReleasedVersion(version: unknown): Promise<boolean | null> {
        validateVersionArg(version);

        const data = await getRepoData({ getHeadCommitSha1, getReleasedVersions });
        if (!data) return null;
        const { headCommitSha1, releasedVersions } = data;

        const versionTag = releasedVersions.get(version);
        if (!versionTag) return false;

        return (await versionTag.fetchCommitSHA1()) !== headCommitSha1;
    };
}
