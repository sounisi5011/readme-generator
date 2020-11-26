"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _gitInfo, _tagName, _sha1Record;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReleasedVersions = exports.GitTag = void 0;
const git_1 = require("@npmcli/git");
const lines_to_revs_1 = __importDefault(require("@npmcli/git/lib/lines-to-revs"));
const bent_1 = __importDefault(require("bent"));
const _1 = require(".");
const bent_2 = require("./bent");
function npmcliGitErrorFixer(error) {
    if (!(error instanceof Error))
        return error;
    if (!_1.isObject(error))
        return error;
    /**
     * @see https://github.com/npm/promise-spawn/blob/v1.2.0/index.js#L38-L43
     */
    if (typeof error.cmd === 'string'
        && Array.isArray(error.args)
        && typeof error.stderr === 'string'
        && typeof error.code === 'number') {
        error.message += [
            ``,
            _1.indent([
                `$ ${error.cmd} ${error.args.join(' ')}`,
                ``,
                _1.indent(error.stderr.replace(/[\r\n]+$/, ''), '> '),
                ``,
                `exited with error code: ${error.code}`,
            ]),
        ].join('\n');
    }
    return error;
}
/**
 * @see https://developer.github.com/v3/
 */
const initGithubApi = _1.cachedPromise(async () => {
    if (!_1.isNonEmptyString(process.env.GITHUB_TOKEN)) {
        throw new Error(`Environment variable "GITHUB_TOKEN" is not defined`);
    }
    return bent_1.default('https://api.github.com', {
        /** @see https://docs.github.com/en/rest/overview/resources-in-the-rest-api#authentication */
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        /** @see https://developer.github.com/v3/#current-version */
        'Accept': 'application/vnd.github.v3+json',
        /** @see https://developer.github.com/v3/#user-agent-required */
        'User-Agent': 'sounisi5011--readme-generator (https://github.com/sounisi5011/readme-generator)',
    });
});
class GitTag {
    constructor(gitInfo, tagName, sha1Record) {
        _gitInfo.set(this, void 0);
        _tagName.set(this, void 0);
        _sha1Record.set(this, void 0);
        __classPrivateFieldSet(this, _gitInfo, gitInfo);
        __classPrivateFieldSet(this, _tagName, tagName);
        __classPrivateFieldSet(this, _sha1Record, { tag: undefined, commit: undefined, ...sha1Record });
    }
    get tagName() {
        return __classPrivateFieldGet(this, _tagName);
    }
    get tagSHA1() {
        return __classPrivateFieldGet(this, _sha1Record).tag;
    }
    get commitSHA1() {
        return __classPrivateFieldGet(this, _sha1Record).commit;
    }
    async fetchCommitSHA1() {
        const sha1Record = __classPrivateFieldGet(this, _sha1Record);
        if (sha1Record.commit !== undefined) {
            return sha1Record.commit;
        }
        return (__classPrivateFieldGet(this, _sha1Record).commit = await (this.fetchCommitSHA1FromLocal()
            .catch(async () => await this.fetchCommitSHA1FromAPI(sha1Record.tag))));
    }
    async fetchCommitSHA1FromLocal() {
        const { stdout } = await git_1.spawn(['show-ref', __classPrivateFieldGet(this, _tagName), '--dereference']);
        const peeledTagMatch = /^([0-9a-f]+)(?:(?![\r\n])\s)+[^\r\n]+\^\{\}$/im.exec(stdout);
        if (peeledTagMatch) {
            return peeledTagMatch[1];
        }
        const lightWeightTagMatch = /^([0-9a-f]+)(?:(?![\r\n])\s)+[^\r\n]+$/im.exec(stdout);
        if (lightWeightTagMatch) {
            return lightWeightTagMatch[1];
        }
        throw new Error(`commit SHA-1 hash was not found`);
    }
    async fetchCommitSHA1FromAPI(tagSHA1) {
        const repoType = __classPrivateFieldGet(this, _gitInfo).type;
        if (repoType === 'github') {
            return await this.fetchCommitSHA1FromGithubAPI(tagSHA1);
        }
        else if (repoType === 'gitlab') {
            // TODO
        }
        else if (repoType === 'bitbucket') {
            // TODO
        }
        else if (repoType === 'gist') {
            // TODO
        }
        throw new Error(`The API to get tag data of type "${repoType}" is not yet supported`);
    }
    async fetchCommitSHA1FromGithubAPI(tagSHA1) {
        const { user: repoUser, project: repoProject } = __classPrivateFieldGet(this, _gitInfo);
        const githubApi = await initGithubApi();
        /**
         * @see https://developer.github.com/v3/git/tags/#get-a-tag
         * Note: Supposedly, GitHub's username and repository name are URL-Safe.
         */
        const stream = await githubApi(`/repos/${repoUser}/${repoProject}/git/tags/${tagSHA1}`)
            .catch(bent_2.bentErrorFixer);
        const data = await stream.json();
        if (!_1.isObject(data)) {
            throw new Error(`The GitHub API returned a invalid JSON value: ${_1.inspectValue(data, { depth: 0 })}`);
        }
        if (data.sha !== tagSHA1) {
            throw new Error(`The GitHub API returned a invalid JSON value at "sha" property: ${_1.inspectValue(data.sha, { depth: 0 })}`);
        }
        if (!_1.isObject(data.object)) {
            throw new Error(`The GitHub API returned a invalid JSON value at "object" property: ${_1.inspectValue(data.object, { depth: 0 })}`);
        }
        if (!(typeof data.object.sha === 'string')) {
            throw new Error(`The GitHub API returned a invalid JSON value at "object.sha" property: ${_1.inspectValue(data.object.sha, { depth: 0 })}`);
        }
        return data.object.sha;
    }
}
exports.GitTag = GitTag;
_gitInfo = new WeakMap(), _tagName = new WeakMap(), _sha1Record = new WeakMap();
class ReleasedVersions extends Map {
    constructor(entries) {
        super(entries);
    }
    static async fetch(gitInfo) {
        try {
            const tagLines = await this.fetchTagsFromGit(gitInfo);
            return new ReleasedVersions(this.gitTagEntries(gitInfo, tagLines, false));
        }
        catch (gitError) {
            try {
                const tagLines = await this.fetchTagsFromAPI(gitInfo);
                return new ReleasedVersions(this.gitTagEntries(gitInfo, tagLines, true));
            }
            catch (_a) {
                throw npmcliGitErrorFixer(gitError);
            }
        }
    }
    static gitTagEntries(gitInfo, tagLines, isTagsOnly) {
        const { versions } = lines_to_revs_1.default(tagLines);
        return Object.entries(versions).map(([version, tagData]) => {
            const { ref: tagName } = tagData;
            if (isTagsOnly) {
                const { sha: tagSha1 } = tagData;
                return [version, new GitTag(gitInfo, tagName, { tag: tagSha1 })];
            }
            else {
                const { sha: commitSha1 } = tagData;
                let tagSha1;
                const { rawRef } = tagData;
                for (const line of tagLines) {
                    const match = /^([0-9a-f]+)(?:(?![\r\n])\s)+([^\r\n]+)$/i.exec(line);
                    if (match && match[1] !== commitSha1 && match[2] === rawRef) {
                        tagSha1 = match[1];
                        break;
                    }
                }
                return [version, new GitTag(gitInfo, tagName, { tag: tagSha1, commit: commitSha1 })];
            }
        });
    }
    static async fetchTagsFromGit(gitInfo) {
        const repo = gitInfo.git({ noCommittish: true }) || gitInfo.https({ noGitPlus: true, noCommittish: true });
        const { stdout } = await git_1.spawn(['ls-remote', '--tags', repo]);
        return stdout.trim().split('\n');
    }
    static async fetchTagsFromAPI(gitInfo) {
        if (gitInfo.type === 'github') {
            return await this.fetchTagsFromGithubAPI(gitInfo);
        }
        else if (gitInfo.type === 'gitlab') {
            // TODO
        }
        else if (gitInfo.type === 'bitbucket') {
            // TODO
        }
        else if (gitInfo.type === 'gist') {
            // TODO
        }
        throw new Error(`The API to get tags of type "${gitInfo.type}" is not yet supported`);
    }
    static async fetchTagsFromGithubAPI(gitInfo) {
        const githubApi = await initGithubApi();
        /**
         * @see https://developer.github.com/v3/git/refs/
         * @see https://stackoverflow.com/a/18999865/4907315
         * Note: Supposedly, GitHub's username and repository name are URL-Safe.
         */
        const stream = await githubApi(`/repos/${gitInfo.user}/${gitInfo.project}/git/refs/tags`)
            .catch(bent_2.bentErrorFixer);
        const data = await stream.json();
        if (!Array.isArray(data)) {
            throw new Error(`The GitHub API returned a invalid JSON value: ${_1.inspectValue(data, { depth: 0 })}`);
        }
        return data.map((dataItem, index) => {
            let errorMessage = `The GitHub API returned a invalid JSON value at index ${index}: ${_1.inspectValue(dataItem, { depth: 0 })}`;
            do {
                if (!_1.isObject(dataItem))
                    break;
                const { ref, object } = dataItem;
                if (!(typeof ref === 'string' && _1.isObject(object)))
                    break;
                const { sha } = object;
                if (!(typeof sha === 'string')) {
                    errorMessage = `The GitHub API returned a invalid JSON value at property [${index}].object: ${_1.inspectValue(object, { depth: 0 })}`;
                    break;
                }
                return `${sha}\t${ref}`;
            } while (false);
            throw new Error(errorMessage);
        });
    }
}
exports.ReleasedVersions = ReleasedVersions;
//# sourceMappingURL=repository.js.map