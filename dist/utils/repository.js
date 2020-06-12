"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchReleasedVersions = exports.fetchTagsByApi = void 0;
const util_1 = require("util");
const git_1 = require("@npmcli/git");
const lines_to_revs_1 = __importDefault(require("@npmcli/git/lib/lines-to-revs"));
const bent_1 = __importDefault(require("bent"));
const _1 = require(".");
/**
 * @see https://developer.github.com/v3/
 */
const githubApi = bent_1.default('https://api.github.com', {
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
            if (error.constructor.name === 'StatusError' && /^Incorrect statusCode: [0-9]+$/.test(error.message)) {
                Object.defineProperty(error, 'name', {
                    configurable: true,
                    enumerable: false,
                    writable: true,
                    value: error.constructor.name,
                });
                const errorBody = await error.text();
                error.body = errorBody;
                delete error.text;
                let messageBodyStr = errorBody;
                if (typeof error.arrayBuffer === 'function')
                    delete error.arrayBuffer;
                if (typeof error.json === 'function') {
                    try {
                        error.body = JSON.parse(errorBody);
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
                        `HTTP ${String(error.statusCode)}`,
                        _1.indent([
                            ...(Object.entries(error.headers).filter(([name]) => /^x-(?!(?:frame-options|content-type-options|xss-protection)$)/i.test(name)).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([name, value]) => `${name}: ${String(value)}`)),
                            `body:`,
                            _1.indent(messageBodyStr),
                        ]),
                    ].join('\n'),
                });
            }
            throw error;
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
            const { message, cmd, args, stderr, code } = error !== null && error !== void 0 ? error : {};
            if (typeof message === 'string'
                && typeof cmd === 'string'
                && Array.isArray(args)
                && typeof stderr === 'string'
                && typeof code === 'number') {
                error.message = [
                    message,
                    ``,
                    _1.indent([
                        `$ ${cmd} ${args.join(' ')}`,
                        ``,
                        _1.indent(stderr.replace(/[\r\n]+$/, ''), '> '),
                        ``,
                        `exited with error code: ${code}`,
                    ]),
                ].join('\n');
            }
            throw error;
        }
    }
}
exports.fetchReleasedVersions = fetchReleasedVersions;
//# sourceMappingURL=repository.js.map