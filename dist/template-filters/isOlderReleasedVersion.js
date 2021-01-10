"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOlderReleasedVersionGen = void 0;
const utils_1 = require("../utils");
async function getRepoData({ getHeadCommitSha1, getReleasedVersions, }) {
    // TODO: Ensure that Promise returns null even if it fails
    const headCommitSha1 = await getHeadCommitSha1();
    if (!headCommitSha1)
        return null;
    const releasedVersions = await getReleasedVersions();
    if (!releasedVersions)
        return null;
    return { headCommitSha1, releasedVersions };
}
function isOlderReleasedVersionGen({ getHeadCommitSha1, getReleasedVersions, }) {
    return async function isOlderReleasedVersion(version) {
        utils_1.validateString(version, new TypeError(utils_1.errorMsgTag `Invalid version value: ${version}`));
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