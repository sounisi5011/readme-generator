"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.npmURL = void 0;
const npm_package_arg_1 = __importDefault(require("npm-package-arg"));
const utils_1 = require("../utils");
function getNpmURL(packageName, packageVersion = '') {
    return packageVersion
        ? `https://www.npmjs.com/package/${packageName}/v/${packageVersion}`
        : `https://www.npmjs.com/package/${packageName}`;
}
function packageName2npmURL(packageName) {
    const result = utils_1.catchError(() => npm_package_arg_1.default(packageName.trim()));
    if (result && (result.type === 'tag' || result.type === 'version') && utils_1.isNonEmptyString(result.name)) {
        return getNpmURL(result.name, result.rawSpec);
    }
    return null;
}
function npmURL(packageData) {
    if (typeof packageData === 'string') {
        const npmURL = packageName2npmURL(packageData);
        if (npmURL)
            return npmURL;
    }
    else if (utils_1.isObject(packageData) && utils_1.isNonEmptyString(packageData.name) && utils_1.isNonEmptyString(packageData.version)) {
        return getNpmURL(packageData.name, packageData.version);
    }
    throw new TypeError(utils_1.errorMsgTag `Invalid packageData value: ${packageData}`);
}
exports.npmURL = npmURL;
//# sourceMappingURL=npmURL.js.map