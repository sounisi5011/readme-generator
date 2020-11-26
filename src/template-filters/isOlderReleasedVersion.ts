import type { ReleasedVersions } from '../utils/repository';

export function isOlderReleasedVersionGen(
    { getHeadCommitSha1, getReleasedVersions }: {
        getHeadCommitSha1: () => Promise<string | null>;
        // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
        getReleasedVersions: () => Promise<void | ReleasedVersions>;
    },
) {
    return async function isOlderReleasedVersion(version: string): Promise<boolean | null> {
        const headCommitSha1 = await getHeadCommitSha1();
        if (!headCommitSha1) return null;

        const releasedVersions = await getReleasedVersions();
        if (!releasedVersions) return null;

        const versionTag = releasedVersions.get(version);
        if (!versionTag) return false;

        return (await versionTag.fetchCommitSHA1()) !== headCommitSha1;
    };
}
