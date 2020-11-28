"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepositoryInfo = exports.readPkgJson = void 0;
const path_1 = require("path");
const hosted_git_info_1 = __importDefault(require("hosted-git-info"));
const _1 = require(".");
function tryRequire(filepath) {
    return _1.catchError(() => require(path_1.resolve(filepath)));
}
function readPkgJson({ packageRootFullpath, reportError, }) {
    const pkgFileFullpath = path_1.resolve(packageRootFullpath, 'package.json');
    const pkg = tryRequire(pkgFileFullpath);
    if (_1.isObject(pkg))
        return { pkgFileFullpath, pkg };
    reportError(_1.errorMsgTag `Failed to read file ${_1.cwdRelativePath(pkgFileFullpath)}`);
    return null;
}
exports.readPkgJson = readPkgJson;
/**
 * @link https://docs.npmjs.com/cli/v6/configuring-npm/package-json#repository
 */
function getRepositoryURL(pkg) {
    if (typeof pkg.repository === 'string') {
        return pkg.repository;
    }
    if (_1.isObject(pkg.repository) && typeof pkg.repository.url === 'string') {
        return pkg.repository.url;
    }
    return null;
}
function getRepositoryInfo({ pkgFileFullpath, pkg, reportError, }) {
    if (!_1.hasProp(pkg, 'repository') || pkg.repository === undefined) {
        reportError(_1.errorMsgTag `Failed to detect remote repository. 'repository' field does not exist in ${_1.cwdRelativePath(pkgFileFullpath)} file.`);
        return null;
    }
    const repositoryURL = getRepositoryURL(pkg);
    const gitInfo = repositoryURL && hosted_git_info_1.default.fromUrl(repositoryURL);
    if (!gitInfo) {
        reportError(_1.errorMsgTag `Failed to detect remote repository. Unknown structure of 'repository' field in ${_1.cwdRelativePath(pkgFileFullpath)} file: ${pkg.repository}`);
        return null;
    }
    return gitInfo;
}
exports.getRepositoryInfo = getRepositoryInfo;
//# sourceMappingURL=package-json.js.map