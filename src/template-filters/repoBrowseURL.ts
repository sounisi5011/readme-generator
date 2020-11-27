import { dirname, relative as relativePath, resolve as resolvePath } from 'path';

import type hostedGitInfo from 'hosted-git-info';

import type { GetCommittishFn, GetHeadCommitSha1Fn, GetReleasedVersionsFn } from '../main';
import { cachedPromise, errorMsgTag, isObject } from '../utils';
import type { RepoData } from './linesSelectedURL';

type RepoBrowseURLResult = RepoData & { gitRepoPath: string; toString: () => string };

function validateFilepathArg(filepath: unknown): asserts filepath is string {
    if (typeof filepath !== 'string') {
        throw new TypeError(errorMsgTag`Invalid filepath value: ${filepath}`);
    }
}

function validateOptionsArg(options: unknown): asserts options is Record<PropertyKey, unknown> {
    if (!isObject(options)) {
        throw new TypeError(errorMsgTag`Invalid options value: ${options}`);
    }
}

function resolveFilepath(
    { filepath, templateFullpath, gitRootPath }: { filepath: string; templateFullpath: string; gitRootPath: string },
): string {
    return /^\.{1,2}\//.test(filepath)
        ? resolvePath(dirname(templateFullpath), filepath)
        : resolvePath(gitRootPath, filepath.replace(/^[/]+/g, ''));
}

async function genCommittish(
    { getCommittish, options, version, isUseVersionBrowseURL }: {
        getCommittish: GetCommittishFn;
        options: Record<PropertyKey, unknown>;
        version: string;
        isUseVersionBrowseURL: () => Promise<boolean>;
    },
): Promise<string> {
    const committishInOptions = getCommittish(options);
    if (committishInOptions) {
        return committishInOptions;
    }

    if (version) {
        if (await isUseVersionBrowseURL()) {
            return `v${version}`;
        }
    }
    return '';
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
export function repoBrowseURLGen(
    { templateFullpath, gitRootPath, getCommittish, getHeadCommitSha1, getReleasedVersions, version, gitInfo }: {
        templateFullpath: string;
        gitRootPath: string;
        getCommittish: GetCommittishFn;
        getHeadCommitSha1: GetHeadCommitSha1Fn;
        getReleasedVersions: GetReleasedVersionsFn;
        version: string;
        gitInfo: hostedGitInfo;
    },
) {
    const isUseVersionBrowseURL = cachedPromise(async () => {
        const headCommitSha1 = await getHeadCommitSha1();
        if (!headCommitSha1) return false;

        const releasedVersions = await getReleasedVersions();
        if (!releasedVersions) return false;

        const versionTag = releasedVersions.get(version);
        if (!versionTag) return true;

        return (await versionTag.fetchCommitSHA1()) === headCommitSha1;
    });

    return async function repoBrowseURL(filepath: unknown, options: unknown = {}): Promise<RepoBrowseURLResult> {
        validateFilepathArg(filepath);
        validateOptionsArg(options);

        const fileFullpath = resolveFilepath({ filepath, templateFullpath, gitRootPath });
        const gitRepoPath = relativePath(gitRootPath, fileFullpath);

        const committish = await genCommittish({ getCommittish, options, version, isUseVersionBrowseURL });
        const browseURL = gitInfo.browse(gitRepoPath, { committish });
        return {
            repoType: gitInfo.type,
            gitRepoPath,
            browseURL,
            fileFullpath,
            toString() {
                return browseURL;
            },
        };
    };
}
