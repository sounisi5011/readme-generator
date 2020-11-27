import { dirname, relative as relativePath, resolve as resolvePath } from 'path';

import type hostedGitInfo from 'hosted-git-info';

import { errorMsgTag, isObject } from '../utils';
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
        getCommittish: (options: Record<string, unknown>) => string | undefined;
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

export function repoBrowseURLGen(
    { templateFullpath, gitRootPath, getCommittish, version, isUseVersionBrowseURL, gitInfo }: {
        templateFullpath: string;
        gitRootPath: string;
        getCommittish: (options: Record<string, unknown>) => string | undefined;
        version: string;
        isUseVersionBrowseURL: () => Promise<boolean>;
        gitInfo: hostedGitInfo;
    },
) {
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
