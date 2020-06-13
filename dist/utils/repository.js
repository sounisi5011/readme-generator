"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.equalsGitTagAndCommit = exports.fetchReleasedVersions = exports.fetchTagsByApi = void 0;
const util_1 = require("util");
const git_1 = require("@npmcli/git");
const lines_to_revs_1 = __importDefault(require("@npmcli/git/lib/lines-to-revs"));
const bent_1 = __importDefault(require("bent"));
const _1 = require(".");
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
async function bentErrorFixer(error) {
    if (!(error instanceof Error))
        return error;
    if (!_1.isObject(error))
        return error;
    if (error.constructor.name === 'StatusError' && /^Incorrect statusCode: [0-9]+$/.test(error.message)
        && typeof error.statusCode === 'number' && typeof error.text === 'function' && _1.isObject(error.headers)) {
        Object.defineProperty(error, 'name', {
            configurable: true,
            enumerable: false,
            writable: true,
            value: error.constructor.name,
        });
        const errorBody = await error.text();
        Object.defineProperty(error, 'body', {
            configurable: true,
            enumerable: true,
            writable: true,
            value: errorBody,
        });
        delete error.text;
        let messageBodyStr = errorBody;
        if (typeof error.arrayBuffer === 'function')
            delete error.arrayBuffer;
        if (typeof error.json === 'function') {
            try {
                Object.defineProperty(error, 'body', { value: JSON.parse(errorBody) });
                messageBodyStr = util_1.inspect(error.body);
            }
            catch (_a) {
                //
            }
            delete error.json;
        }
        Object.defineProperty(error, 'message', {
            configurable: true,
            enumerable: false,
            writable: true,
            value: [
                `HTTP ${error.statusCode}`,
                _1.indent([
                    ...(Object.entries(error.headers).filter(([name]) => /^x-(?!(?:frame-options|content-type-options|xss-protection)$)/i.test(name)).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([name, value]) => `${name}: ${String(value)}`)),
                    `body:`,
                    _1.indent(messageBodyStr),
                ]),
            ].join('\n'),
        });
    }
    return error;
}
/**
 * @see https://developer.github.com/v3/
 */
const githubApi = bent_1.default(_1.isNonEmptyString(process.env.GITHUB_API_BASIC_AUTH_USER)
    && _1.isNonEmptyString(process.env.GITHUB_API_BASIC_AUTH_TOKEN)
    ? `https://${process.env.GITHUB_API_BASIC_AUTH_USER}:${process.env.GITHUB_API_BASIC_AUTH_TOKEN}@api.github.com`
    : 'https://api.github.com', {
    /** @see https://developer.github.com/v3/#current-version */
    'Accept': 'application/vnd.github.v3+json',
    /** @see https://developer.github.com/v3/#user-agent-required */
    'User-Agent': 'sounisi5011--readme-generator (https://github.com/sounisi5011/readme-generator)',
});
/**
 * Returns a list of tags in a remote repository with a syntax similar to the "git ls-remote" command
 */
async function fetchTagsByApi(gitInfo) {
    if (gitInfo.type === 'github') {
        /**
         * @see https://developer.github.com/v3/git/refs/
         * @see https://stackoverflow.com/a/18999865/4907315
         * Note: Supposedly, GitHub's username and repository name are URL-Safe.
         */
        const stream = await githubApi(`/repos/${gitInfo.user}/${gitInfo.project}/git/refs/tags`)
            .catch(async (error) => {
            throw await bentErrorFixer(error);
        });
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
                return `${sha}  ${ref}`;
            } while (false);
            throw new Error(errorMessage);
        });
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
exports.fetchTagsByApi = fetchTagsByApi;
async function fetchReleasedVersions(gitInfo) {
    try {
        // Note: I tried this on a repository on GitHub.
        //     Apparently, the REST API is faster to fetch than the "git ls-remote" command.
        //     Therefore, this code first tries to get at the REST API.
        return lines_to_revs_1.default(await fetchTagsByApi(gitInfo)).versions;
    }
    catch (error) {
        if (/^HTTP 404$/m.test(error.message))
            throw error;
        try {
            return (await git_1.revs(gitInfo.sshurl())).versions;
        }
        catch (error) {
            throw npmcliGitErrorFixer(error);
        }
    }
}
exports.fetchReleasedVersions = fetchReleasedVersions;
async function noCacheEqualsGitTagAndCommit({ repoType, repoUser, repoProject, tagSHA1, tagName, commitSHA1 }) {
    if (tagSHA1 === commitSHA1)
        return true;
    try {
        // Note: If the tag does not exist, the "git show-ref" command will fail.
        //     Subsequent expressions are only executed if the tag is present.
        const { stdout } = await git_1.spawn(['show-ref', tagName, '--dereference']);
        return [tagSHA1, commitSHA1].every(sha1 => new RegExp(String.raw `^${sha1}(?![\r\n])\s`, 'm').test(stdout));
    }
    catch (_a) {
        //
    }
    if (repoType === 'github') {
        /**
         * @see https://developer.github.com/v3/git/tags/#get-a-tag
         * Note: Supposedly, GitHub's username and repository name are URL-Safe.
         */
        const stream = await githubApi(`/repos/${repoUser}/${repoProject}/git/tags/${tagSHA1}`)
            .catch(async (error) => {
            throw await bentErrorFixer(error);
        });
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
        return data.object.sha === commitSHA1;
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
async function equalsGitTagAndCommit(gitInfo, tagData, commitSHA1) {
    const { type: repoType, user: repoUser, project: repoProject } = gitInfo;
    const { sha: tagSHA1, ref: tagName } = tagData;
    const cacheKey = JSON.stringify({ repoType, repoUser, repoProject, tagName, tagSHA1, commitSHA1 });
    const cachedData = equalsGitTagAndCommitCache.get(cacheKey);
    if (cachedData)
        return await cachedData;
    const result = noCacheEqualsGitTagAndCommit({ repoType, repoUser, repoProject, tagSHA1, tagName, commitSHA1 });
    equalsGitTagAndCommitCache.set(cacheKey, result);
    return await result;
}
exports.equalsGitTagAndCommit = equalsGitTagAndCommit;
const equalsGitTagAndCommitCache = new Map();
//# sourceMappingURL=repository.js.map