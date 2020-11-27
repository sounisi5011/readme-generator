"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repoBrowseURLGen = void 0;
const path_1 = require("path");
const utils_1 = require("../utils");
function repoBrowseURLGen({ templateFullpath, gitRootPath, getCommittish, version, isUseVersionBrowseURL, gitInfo }) {
    return async function repoBrowseURL(filepath, options = {}) {
        var _a;
        if (typeof filepath !== 'string') {
            throw new TypeError(utils_1.errorMsgTag `Invalid filepath value: ${filepath}`);
        }
        if (!utils_1.isObject(options)) {
            throw new TypeError(utils_1.errorMsgTag `Invalid options value: ${options}`);
        }
        const fileFullpath = /^\.{1,2}\//.test(filepath)
            ? path_1.resolve(path_1.dirname(templateFullpath), filepath)
            : path_1.resolve(gitRootPath, filepath.replace(/^[/]+/g, ''));
        const gitRepoPath = path_1.relative(gitRootPath, fileFullpath);
        const committish = (_a = getCommittish(options)) !== null && _a !== void 0 ? _a : (version && (await isUseVersionBrowseURL()) ? `v${version}` : '');
        const browseURL = gitInfo.browse(gitRepoPath, { committish });
        return {
            repoType: gitInfo.type,
            gitRepoPath,
            browseURL,
            fileFullpath,
            toString() {
                return browseURL;
            },
        };
    };
}
exports.repoBrowseURLGen = repoBrowseURLGen;
//# sourceMappingURL=repoBrowseURL.js.map