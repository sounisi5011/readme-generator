import { resolve as resolvePath } from 'path';

import hostedGitInfo from 'hosted-git-info';

import { catchError, cwdRelativePath, errorMsgTag, hasProp, isObject } from '.';
import type { ReportErrorFn } from '../main';

function tryRequire(filepath: string): unknown {
    return catchError(() => require(resolvePath(filepath)));
}

export function readPkgJson(
    {
        packageRootFullpath,
        reportError,
    }: {
        packageRootFullpath: string;
        reportError: ReportErrorFn;
    },
): { pkgFileFullpath: string; pkg: Record<PropertyKey, unknown> } | null {
    const pkgFileFullpath = resolvePath(packageRootFullpath, 'package.json');
    const pkg = tryRequire(pkgFileFullpath);
    if (isObject(pkg)) return { pkgFileFullpath, pkg };

    reportError(errorMsgTag`Failed to read file ${cwdRelativePath(pkgFileFullpath)}`);
    return null;
}

/**
 * @link https://docs.npmjs.com/cli/v6/configuring-npm/package-json#repository
 */
function getRepositoryURL(pkg: { repository: unknown }): string | null {
    if (typeof pkg.repository === 'string') {
        return pkg.repository;
    }
    if (isObject(pkg.repository) && typeof pkg.repository.url === 'string') {
        return pkg.repository.url;
    }
    return null;
}

export function getRepositoryInfo(
    {
        pkgFileFullpath,
        pkg,
        reportError,
    }: {
        pkgFileFullpath: string;
        pkg: { repository?: unknown };
        reportError: ReportErrorFn;
    },
): hostedGitInfo | null {
    if (!hasProp(pkg, 'repository') || pkg.repository === undefined) {
        reportError(
            errorMsgTag`Failed to detect remote repository. 'repository' field does not exist in ${
                cwdRelativePath(pkgFileFullpath)
            } file.`,
        );
        return null;
    }

    const repositoryURL = getRepositoryURL(pkg);
    const gitInfo = repositoryURL && hostedGitInfo.fromUrl(repositoryURL);
    if (!gitInfo) {
        reportError(
            errorMsgTag`Failed to detect remote repository. Unknown structure of 'repository' field in ${
                cwdRelativePath(pkgFileFullpath)
            } file: ${pkg.repository}`,
        );
        return null;
    }

    return gitInfo;
}
