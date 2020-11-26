"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.npmURL = void 0;
const npm_package_arg_1 = __importDefault(require("npm-package-arg"));
const utils_1 = require("../utils");
const nunjucks_1 = require("../utils/nunjucks");
function npmURL(packageData) {
    do {
        if (typeof packageData === 'string') {
            const result = utils_1.catchError(() => npm_package_arg_1.default(packageData.trim()));
            if (!result)
                break;
            if ((result.type === 'tag' || result.type === 'version') && utils_1.isNonEmptyString(result.name)) {
                return result.rawSpec
                    ? `https://www.npmjs.com/package/${result.name}/v/${result.rawSpec}`
                    : `https://www.npmjs.com/package/${result.name}`;
            }
        }
        else if (utils_1.isObject(packageData)) {
            if (utils_1.isNonEmptyString(packageData.name) && utils_1.isNonEmptyString(packageData.version)) {
                return `https://www.npmjs.com/package/${packageData.name}/v/${packageData.version}`;
            }
        }
    } while (false);
    throw new TypeError(nunjucks_1.errorMsgTag `Invalid packageData value: ${packageData}`);
}
exports.npmURL = npmURL;
//# sourceMappingURL=npmURL.js.map