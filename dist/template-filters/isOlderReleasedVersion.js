"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOlderReleasedVersionGen = void 0;
async function getRepoData({ getHeadCommitSha1, getReleasedVersions }) {
    const headCommitSha1 = await getHeadCommitSha1();
    if (!headCommitSha1)
        return null;
    const releasedVersions = await getReleasedVersions();
    if (!releasedVersions)
        return null;
    return { headCommitSha1, releasedVersions };
}
function isOlderReleasedVersionGen({ getHeadCommitSha1, getReleasedVersions }) {
    return async function isOlderReleasedVersion(version) {
        const data = await getRepoData({ getHeadCommitSha1, getReleasedVersions });
        if (!data)
            return null;
        const { headCommitSha1, releasedVersions } = data;
        const versionTag = releasedVersions.get(version);
        if (!versionTag)
            return false;
        return (await versionTag.fetchCommitSHA1()) !== headCommitSha1;
    };
}
exports.isOlderReleasedVersionGen = isOlderReleasedVersionGen;
//# sourceMappingURL=isOlderReleasedVersion.js.map