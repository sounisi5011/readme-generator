import type { ReleasedVersions } from '../utils/repository';

type GetHeadCommitSha1Fn = () => Promise<string | null>;
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
type GetReleasedVersions = () => Promise<void | ReleasedVersions>;

async function getRepoData(
    { getHeadCommitSha1, getReleasedVersions }: {
        getHeadCommitSha1: GetHeadCommitSha1Fn;
        getReleasedVersions: GetReleasedVersions;
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
        getReleasedVersions: GetReleasedVersions;
    },
) {
    return async function isOlderReleasedVersion(version: string): Promise<boolean | null> {
        const data = await getRepoData({ getHeadCommitSha1, getReleasedVersions });
        if (!data) return null;
        const { headCommitSha1, releasedVersions } = data;

        const versionTag = releasedVersions.get(version);
        if (!versionTag) return false;

        return (await versionTag.fetchCommitSHA1()) !== headCommitSha1;
    };
}
