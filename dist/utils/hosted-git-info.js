"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommittish = void 0;
function getCommittish(kwargs) {
    for (const prop of ['committish', 'commit', 'branch', 'tag']) {
        if (typeof kwargs[prop] === 'string' && kwargs[prop]) {
            return kwargs[prop];
        }
    }
    return undefined;
}
exports.getCommittish = getCommittish;
//# sourceMappingURL=hosted-git-info.js.map