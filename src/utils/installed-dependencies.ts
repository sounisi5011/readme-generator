import { resolve as resolvePath } from 'path';

import { cwdRelativePath, errorMsgTag, isObject, tryRequire } from '.';
import type { ReportErrorFn } from '../main';

interface ParserOptions {
    packageRootFullpath: string;
    reportError: ReportErrorFn;
}

interface DepsRecord {
    [pkgName: string]: {
        name: string;
        version: string;
        v: string;
    };
}

function parseNpmLock(
    {
        packageRootFullpath,
        reportError,
    }: ParserOptions,
): DepsRecord | null {
    const pkgLockFileFullpath = resolvePath(packageRootFullpath, 'package-lock.json');
    const pkgLock = tryRequire(pkgLockFileFullpath);

    if (!isObject(pkgLock)) {
        reportError(errorMsgTag`Failed to read file ${cwdRelativePath(pkgLockFileFullpath)}`);
        return null;
    }

    const { dependencies } = pkgLock;
    if (!isObject(dependencies)) {
        reportError(
            errorMsgTag`Failed to read npm lockfile ${
                cwdRelativePath(pkgLockFileFullpath)
            }. Reason: Invalid structure where 'dependencies' field does not exist.`,
        );
        return null;
    }

    const deps = Object.entries(dependencies)
        .reduce<DepsRecord>((deps, [pkgName, pkgData]) => {
            if (isObject(pkgData) && typeof pkgData.version === 'string') {
                deps[pkgName] = {
                    name: pkgName,
                    version: pkgData.version,
                    v: pkgData.version,
                };
            }
            return deps;
        }, {});

    return deps;
}

export function getDepsRecord(
    {
        packageRootFullpath,
        reportError,
    }: ParserOptions,
): DepsRecord | null {
    return parseNpmLock({ packageRootFullpath, reportError });
}
