import { errorMsgTag } from '../utils';

export function omitPackageScopeName(packageName: string): string;
export function omitPackageScopeName(packageName: undefined): undefined;
export function omitPackageScopeName(packageName: string | undefined): string | undefined;
export function omitPackageScopeName(packageName: string | undefined): string | undefined {
    return packageName?.replace(/^@[^/]+\//, '');
}

export function omitPackageScope(packageName: unknown): string {
    if (typeof packageName !== 'string') {
        throw new TypeError(errorMsgTag`Invalid packageName value: ${packageName}`);
    }
    return omitPackageScopeName(packageName);
}
