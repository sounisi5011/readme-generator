"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repoBrowseURLGen = void 0;
const path_1 = require("path");
const utils_1 = require("../utils");
function validateFilepathArg(filepath) {
    if (typeof filepath !== 'string') {
        throw new TypeError(utils_1.errorMsgTag `Invalid filepath value: ${filepath}`);
    }
}
function validateOptionsArg(options) {
    if (!utils_1.isObject(options)) {
        throw new TypeError(utils_1.errorMsgTag `Invalid options value: ${options}`);
    }
}
function resolveFilepath({ filepath, templateFullpath, gitRootPath }) {
    return /^\.{1,2}\//.test(filepath)
        ? path_1.resolve(path_1.dirname(templateFullpath), filepath)
        : path_1.resolve(gitRootPath, filepath.replace(/^[/]+/g, ''));
}
async function genCommittish({ getCommittish, options, version, isUseVersionBrowseURL }) {
    const committishInOptions = getCommittish(options);
    if (committishInOptions) {
        return committishInOptions;
    }
    if (version) {
        if (await isUseVersionBrowseURL()) {
            return `v${version}`;
        }
    }
    return '';
}
function repoBrowseURLGen({ templateFullpath, gitRootPath, getCommittish, version, isUseVersionBrowseURL, gitInfo }) {
    return async function repoBrowseURL(filepath, options = {}) {
        validateFilepathArg(filepath);
        validateOptionsArg(options);
        const fileFullpath = resolveFilepath({ filepath, templateFullpath, gitRootPath });
        const gitRepoPath = path_1.relative(gitRootPath, fileFullpath);
        const committish = await genCommittish({ getCommittish, options, version, isUseVersionBrowseURL });
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