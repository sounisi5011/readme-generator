import { inspect } from 'util';

import { spawn as gitSpawn } from '@npmcli/git';
import gitLinesToRevs from '@npmcli/git/lib/lines-to-revs';
import bent from 'bent';
import type GitHost from 'hosted-git-info';

import { indent, inspectValue, isNonEmptyString, isObject } from '.';

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

async function bentErrorFixer<T>(error: T): Promise<T> {
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
                `HTTP ${error.statusCode}`,
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

export class GitTag {
    #gitInfo: GitHost;
    #tagName: string;
    #sha1Record:
        | { readonly tag: string; commit: string }
        | { readonly tag: string; commit: undefined }
        | { readonly tag: undefined; commit: string };

    constructor(
        gitInfo: GitHost,
        tagName: string,
        sha1Record:
            | Readonly<{ tag: string; commit: string }>
            | Readonly<{ tag: string }>
            | Readonly<{ commit: string }>,
    ) {
        this.#gitInfo = gitInfo;
        this.#tagName = tagName;
        this.#sha1Record = { tag: undefined, commit: undefined, ...sha1Record };
    }

    get tagName(): string {
        return this.#tagName;
    }

    get tagSHA1(): string | undefined {
        return this.#sha1Record.tag;
    }

    get commitSHA1(): string | undefined {
        return this.#sha1Record.commit;
    }

    async fetchCommitSHA1(): Promise<string> {
        const sha1Record = this.#sha1Record;

        if (sha1Record.commit !== undefined) {
            return sha1Record.commit;
        }

        return (
            this.#sha1Record.commit = await (
                this.fetchCommitSHA1FromLocal()
                    .catch(async () => await this.fetchCommitSHA1FromAPI(sha1Record.tag))
            )
        );
    }

    private async fetchCommitSHA1FromLocal(): Promise<string> {
        const { stdout } = await gitSpawn(['show-ref', this.#tagName, '--dereference']);

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

    private async fetchCommitSHA1FromAPI(tagSHA1: string): Promise<string> {
        const repoType = this.#gitInfo.type;

        if (repoType === 'github') {
            return await this.fetchCommitSHA1FromGithubAPI(tagSHA1);
        } else if (repoType === 'gitlab') {
            // TODO
        } else if (repoType === 'bitbucket') {
            // TODO
        } else if (repoType === 'gist') {
            // TODO
        }

        throw new Error(`The API to get tag data of type "${repoType}" is not yet supported`);
    }

    private async fetchCommitSHA1FromGithubAPI(tagSHA1: string): Promise<string> {
        const { user: repoUser, project: repoProject } = this.#gitInfo;

        /**
         * @see https://developer.github.com/v3/git/tags/#get-a-tag
         * Note: Supposedly, GitHub's username and repository name are URL-Safe.
         */
        const stream = await githubApi(`/repos/${repoUser}/${repoProject}/git/tags/${tagSHA1}`)
            .catch(async error => {
                throw await bentErrorFixer(error);
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

        return data.object.sha;
    }
}

export class ReleasedVersions extends Map<string, GitTag> {
    private constructor(entries?: ReadonlyArray<readonly [string, GitTag]>) {
        super(entries);
    }

    static async fetch(gitInfo: GitHost): Promise<ReleasedVersions> {
        try {
            const tagLines = await this.fetchTagsFromGit(gitInfo);
            return new ReleasedVersions(this.gitTagEntries(gitInfo, tagLines, false));
        } catch (gitError) {
            try {
                const tagLines = await this.fetchTagsFromAPI(gitInfo);
                return new ReleasedVersions(this.gitTagEntries(gitInfo, tagLines, true));
            } catch {
                throw npmcliGitErrorFixer(gitError);
            }
        }
    }

    private static gitTagEntries(
        gitInfo: GitHost,
        tagLines: readonly string[],
        isTagsOnly: boolean,
    ): Array<[string, GitTag]> {
        const { versions } = gitLinesToRevs(tagLines);

        return Object.entries(versions).map(([version, tagData]) => {
            const { ref: tagName } = tagData;
            if (isTagsOnly) {
                const { sha:tagSha1 } = tagData;
                return [version, new GitTag(gitInfo, tagName, { tag: tagSha1 })];
            } else {
                const { sha:commitSha1 } = tagData;

                let tagSha1: string | undefined;
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

    private static async fetchTagsFromGit(gitInfo: GitHost): Promise<string[]> {
        const repo = gitInfo.git({ noCommittish: true }) || gitInfo.https({ noGitPlus: true, noCommittish: true });
        const { stdout } = await gitSpawn(['ls-remote', '--tags', repo]);
        return stdout.trim().split('\n');
    }

    private static async fetchTagsFromAPI(gitInfo: GitHost): Promise<string[]> {
        if (gitInfo.type === 'github') {
            return await this.fetchTagsFromGithubAPI(gitInfo);
        } else if (gitInfo.type === 'gitlab') {
            // TODO
        } else if (gitInfo.type === 'bitbucket') {
            // TODO
        } else if (gitInfo.type === 'gist') {
            // TODO
        }
        throw new Error(`The API to get tags of type "${gitInfo.type}" is not yet supported`);
    }

    private static async fetchTagsFromGithubAPI(gitInfo: GitHost): Promise<string[]> {
        /**
         * @see https://developer.github.com/v3/git/refs/
         * @see https://stackoverflow.com/a/18999865/4907315
         * Note: Supposedly, GitHub's username and repository name are URL-Safe.
         */
        const stream = await githubApi(`/repos/${gitInfo.user}/${gitInfo.project}/git/refs/tags`)
            .catch(async error => {
                throw await bentErrorFixer(error);
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
                return `${sha}\t${ref}`;
            } while (false);
            throw new Error(errorMessage);
        });
    }
}
