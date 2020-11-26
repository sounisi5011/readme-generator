"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOlderReleasedVersionGen = void 0;
function isOlderReleasedVersionGen({ getHeadCommitSha1, getReleasedVersions }) {
    return async function isOlderReleasedVersion(version) {
        const headCommitSha1 = await getHeadCommitSha1();
        if (!headCommitSha1)
            return null;
        const releasedVersions = await getReleasedVersions();
        if (!releasedVersions)
            return null;
        const versionTag = releasedVersions.get(version);
        if (!versionTag)
            return false;
        return (await versionTag.fetchCommitSHA1()) !== headCommitSha1;
    };
}
exports.isOlderReleasedVersionGen = isOlderReleasedVersionGen;
//# sourceMappingURL=isOlderReleasedVersion.js.map