"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDepsRecord = void 0;
const path_1 = require("path");
const _1 = require(".");
function tryRequire(filepath) {
    return _1.catchError(() => require(path_1.resolve(filepath)));
}
function parseNpmLock({ packageRootFullpath, reportError }) {
    const pkgLockFileFullpath = path_1.resolve(packageRootFullpath, 'package-lock.json');
    const pkgLock = tryRequire(pkgLockFileFullpath);
    if (!_1.isObject(pkgLock)) {
        reportError(_1.errorMsgTag `Failed to read file ${_1.cwdRelativePath(pkgLockFileFullpath)}`);
        return null;
    }
    const { dependencies } = pkgLock;
    if (!_1.isObject(dependencies)) {
        reportError(_1.errorMsgTag `Failed to read npm lockfile ${_1.cwdRelativePath(pkgLockFileFullpath)}. Reason: Invalid structure where 'dependencies' field does not exist.`);
        return null;
    }
    const deps = Object.entries(dependencies)
        .reduce((deps, [pkgName, pkgData]) => {
        if (_1.isObject(pkgData) && typeof pkgData.version === 'string') {
            deps[pkgName] = {
                name: pkgName,
                version: pkgData.version,
                v: pkgData.version,
            };
        }
        return deps;
    }, {});
    return deps;
}
function getDepsRecord({ packageRootFullpath, reportError }) {
    return parseNpmLock({ packageRootFullpath, reportError });
}
exports.getDepsRecord = getDepsRecord;
//# sourceMappingURL=installed-dependencies.js.map