"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.omitPackageScope = exports.omitPackageScopeName = void 0;
const nunjucks_1 = require("../utils/nunjucks");
function omitPackageScopeName(packageName) {
    return packageName === null || packageName === void 0 ? void 0 : packageName.replace(/^@[^/]+\//, '');
}
exports.omitPackageScopeName = omitPackageScopeName;
function omitPackageScope(packageName) {
    if (typeof packageName !== 'string') {
        throw new TypeError(nunjucks_1.errorMsgTag `Invalid packageName value: ${packageName}`);
    }
    return omitPackageScopeName(packageName);
}
exports.omitPackageScope = omitPackageScope;
//# sourceMappingURL=omitPackageScope.js.map