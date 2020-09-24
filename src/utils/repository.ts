import { inspect } from 'util';

import { revs as gitRevs, spawn as gitSpawn } from '@npmcli/git';
import gitLinesToRevs from '@npmcli/git/lib/lines-to-revs';
import bent from 'bent';
import type GitHost from 'hosted-git-info';

import { indent, inspectValue, isNonEmptyString, isObject, PromiseValue } from '.';

type Versions = PromiseValue<ReturnType<typeof gitRevs>>['versions'];

function npmcliGitErrorFixer<T>(error: T): T {
    if (!(error instanceof Error)) return error;
    if (!isObject(error)) return error;

    /**
     * @see https://github.com/npm/promise-spawn/blob/v1.2.0/index.js#L38-L43
     */
    if (
        typeof error.cmd === 'string'
        && Array.isArray(error.args)
        && typeof error.stderr === 'string'
        && typeof error.code === 'number'
    ) {
        error.message += [
            ``,
            indent([
                `$ ${error.cmd} ${error.args.join(' ')}`,
                ``,
                indent(error.stderr.replace(/[\r\n]+$/, ''), '> '),
                ``,
                `exited with error code: ${error.code}`,
            ]),
        ].join('\n');
    }

    return error;
}

async function bentErrorFixer<T>(error: T, apiPath: string): Promise<T> {
    if (!(error instanceof Error)) return error;
    if (!isObject(error)) return error;

    if (
        error.constructor.name === 'StatusError' && /^Incorrect statusCode: [0-9]+$/.test(error.message)
        && typeof error.statusCode === 'number' && typeof error.text === 'function' && isObject(error.headers)
    ) {
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

        if (typeof error.arrayBuffer === 'function') delete error.arrayBuffer;
        if (typeof error.json === 'function') {
            try {
                Object.defineProperty(error, 'body', { value: JSON.parse(errorBody) });
                messageBodyStr = inspect(error.body);
            } catch {
                //
            }
            delete error.json;
        }

        Object.defineProperty(error, 'message', {
            configurable: true,
            enumerable: false,
            writable: true,
            value: [
                `HTTP ${error.statusCode} ${apiPath}`,
                indent([
                    ...(
                        Object.entries(error.headers).filter(([name]) =>
                            /^x-(?!(?:frame-options|content-type-options|xss-protection)$)/i.test(name)
                        ).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([name, value]) =>
                            `${name}: ${String(value)}`
                        )
                    ),
                    `body:`,
                    indent(messageBodyStr),
                ]),
            ].join('\n'),
        });
    }

    return error;
}

/**
 * @see https://developer.github.com/v3/
 */
const githubApi = bent('https://api.github.com', {
    /** @see https://docs.github.com/en/rest/overview/resources-in-the-rest-api#authentication */
    ...(isNonEmptyString(process.env.GITHUB_TOKEN)
        ? { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }
        : null),
    /** @see https://developer.github.com/v3/#current-version */
    'Accept': 'application/vnd.github.v3+json',
    /** @see https://developer.github.com/v3/#user-agent-required */
    'User-Agent': 'sounisi5011--readme-generator (https://github.com/sounisi5011/readme-generator)',
});

/**
 * Returns a list of tags in a remote repository with a syntax similar to the "git ls-remote" command
 */
export async function fetchTagsByApi(gitInfo: GitHost): Promise<string[]> {
    if (gitInfo.type === 'github') {
        /**
         * @see https://developer.github.com/v3/git/refs/
         * @see https://stackoverflow.com/a/18999865/4907315
         * Note: Supposedly, GitHub's username and repository name are URL-Safe.
         */
        const stream = await githubApi(`/repos/${gitInfo.user}/${gitInfo.project}/git/refs/tags`)
            .catch(async error => {
                throw await bentErrorFixer(error, `/repos/${gitInfo.user}/${gitInfo.project}/git/refs/tags`);
            });
        const data = await stream.json();
        if (!Array.isArray(data)) {
            throw new Error(`The GitHub API returned a invalid JSON value: ${inspectValue(data, { depth: 0 })}`);
        }
        return data.map((dataItem, index) => {
            let errorMessage = `The GitHub API returned a invalid JSON value at index ${index}: ${
                inspectValue(dataItem, { depth: 0 })
            }`;
            do {
                if (!isObject(dataItem)) break;
                const { ref, object } = dataItem;
                if (!(typeof ref === 'string' && isObject(object))) break;
                const { sha } = object;
                if (!(typeof sha === 'string')) {
                    errorMessage = `The GitHub API returned a invalid JSON value at property [${index}].object: ${
                        inspectValue(object, { depth: 0 })
                    }`;
                    break;
                }
                return `${sha}  ${ref}`;
            } while (false);
            throw new Error(errorMessage);
        });
    } else if (gitInfo.type === 'gitlab') {
        // TODO
    } else if (gitInfo.type === 'bitbucket') {
        // TODO
    } else if (gitInfo.type === 'gist') {
        // TODO
    }
    throw new Error(`The API to get tags of type "${gitInfo.type}" is not yet supported`);
}

export async function fetchReleasedVersions(gitInfo: GitHost): Promise<Versions> {
    try {
        const repo = gitInfo.git({ noCommittish: true }) || gitInfo.https({ noGitPlus: true, noCommittish: true });
        return (await gitRevs(repo)).versions;
    } catch (gitError) {
        try {
            return gitLinesToRevs(await fetchTagsByApi(gitInfo)).versions;
        } catch {
            throw npmcliGitErrorFixer(gitError);
        }
    }
}

async function noCacheEqualsGitTagAndCommit(
    { repoType, repoUser, repoProject, tagSHA1, tagName, commitSHA1 }: {
        repoType: GitHost.Hosts;
        repoUser: string;
        repoProject: string;
        tagSHA1: string;
        tagName: string;
        commitSHA1: string;
    },
): Promise<boolean> {
    if (tagSHA1 === commitSHA1) return true;

    try {
        // Note: If the tag does not exist, the "git show-ref" command will fail.
        //     Subsequent expressions are only executed if the tag is present.
        const { stdout } = await gitSpawn(['show-ref', tagName, '--dereference']);
        return [tagSHA1, commitSHA1].every(sha1 => new RegExp(String.raw`^${sha1}(?![\r\n])\s`, 'm').test(stdout));
    } catch {
        //
    }

    if (repoType === 'github') {
        /**
         * @see https://developer.github.com/v3/git/tags/#get-a-tag
         * Note: Supposedly, GitHub's username and repository name are URL-Safe.
         */
        const stream = await githubApi(`/repos/${repoUser}/${repoProject}/git/tags/${tagSHA1}`)
            .catch(async error => {
                throw await bentErrorFixer(error, `/repos/${repoUser}/${repoProject}/git/tags/${tagSHA1}`);
            });

        const data = await stream.json();
        if (!isObject(data)) {
            throw new Error(`The GitHub API returned a invalid JSON value: ${inspectValue(data, { depth: 0 })}`);
        }
        if (data.sha !== tagSHA1) {
            throw new Error(
                `The GitHub API returned a invalid JSON value at "sha" property: ${
                    inspectValue(data.sha, { depth: 0 })
                }`,
            );
        }
        if (!isObject(data.object)) {
            throw new Error(
                `The GitHub API returned a invalid JSON value at "object" property: ${
                    inspectValue(data.object, { depth: 0 })
                }`,
            );
        }
        if (!(typeof data.object.sha === 'string')) {
            throw new Error(
                `The GitHub API returned a invalid JSON value at "object.sha" property: ${
                    inspectValue(data.object.sha, { depth: 0 })
                }`,
            );
        }

        return data.object.sha === commitSHA1;
    } else if (repoType === 'gitlab') {
        // TODO
    } else if (repoType === 'bitbucket') {
        // TODO
    } else if (repoType === 'gist') {
        // TODO
    }

    throw new Error(`The API to get tag data of type "${repoType}" is not yet supported`);
}

export async function equalsGitTagAndCommit(
    gitInfo: GitHost,
    tagData: Versions[string],
    commitSHA1: string,
): Promise<boolean> {
    const { type: repoType, user: repoUser, project: repoProject } = gitInfo;
    const { sha: tagSHA1, ref: tagName } = tagData;

    const cacheKey = JSON.stringify({ repoType, repoUser, repoProject, tagName, tagSHA1, commitSHA1 });
    const cachedData = equalsGitTagAndCommitCache.get(cacheKey);
    if (cachedData) return await cachedData;

    const result = noCacheEqualsGitTagAndCommit({ repoType, repoUser, repoProject, tagSHA1, tagName, commitSHA1 });
    equalsGitTagAndCommitCache.set(cacheKey, result);
    return await result;
}

const equalsGitTagAndCommitCache = new Map<string, Promise<boolean>>();
