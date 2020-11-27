import { dirname, relative as relativePath, resolve as resolvePath } from 'path';

import type hostedGitInfo from 'hosted-git-info';

import { errorMsgTag, isObject } from '../utils';
import type { RepoData } from './linesSelectedURL';

type RepoBrowseURLResult = RepoData & { gitRepoPath: string; toString: () => string };

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
        if (typeof filepath !== 'string') {
            throw new TypeError(errorMsgTag`Invalid filepath value: ${filepath}`);
        }
        if (!isObject(options)) {
            throw new TypeError(errorMsgTag`Invalid options value: ${options}`);
        }

        const fileFullpath = /^\.{1,2}\//.test(filepath)
            ? resolvePath(dirname(templateFullpath), filepath)
            : resolvePath(gitRootPath, filepath.replace(/^[/]+/g, ''));
        const gitRepoPath = relativePath(gitRootPath, fileFullpath);

        const committish = getCommittish(options)
            ?? (version && (await isUseVersionBrowseURL()) ? `v${version}` : '');
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
