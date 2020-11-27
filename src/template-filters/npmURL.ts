import npa from 'npm-package-arg';

import { catchError, errorMsgTag, isNonEmptyString, isObject } from '../utils';

function getNpmURL(packageName: string, packageVersion = ''): string {
    return packageVersion
        ? `https://www.npmjs.com/package/${packageName}/v/${packageVersion}`
        : `https://www.npmjs.com/package/${packageName}`;
}

function packageName2npmURL(packageName: string): string | null {
    const result = catchError(() => npa(packageName.trim()));
    if (result && (result.type === 'tag' || result.type === 'version') && isNonEmptyString(result.name)) {
        return getNpmURL(result.name, result.rawSpec);
    }
    return null;
}

export function npmURL(packageData: unknown): string {
    if (typeof packageData === 'string') {
        const npmURL = packageName2npmURL(packageData);
        if (npmURL) return npmURL;
    } else if (isObject(packageData) && isNonEmptyString(packageData.name) && isNonEmptyString(packageData.version)) {
        return getNpmURL(packageData.name, packageData.version);
    }
    throw new TypeError(errorMsgTag`Invalid packageData value: ${packageData}`);
}
