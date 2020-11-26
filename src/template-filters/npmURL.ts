import npa from 'npm-package-arg';

import { catchError, isNonEmptyString, isObject } from '../utils';
import { errorMsgTag } from '../utils/nunjucks';

export function npmURL(packageData: unknown): string {
    do {
        if (typeof packageData === 'string') {
            const result = catchError(() => npa(packageData.trim()));
            if (!result) break;
            if ((result.type === 'tag' || result.type === 'version') && isNonEmptyString(result.name)) {
                return result.rawSpec
                    ? `https://www.npmjs.com/package/${result.name}/v/${result.rawSpec}`
                    : `https://www.npmjs.com/package/${result.name}`;
            }
        } else if (isObject(packageData)) {
            if (isNonEmptyString(packageData.name) && isNonEmptyString(packageData.version)) {
                return `https://www.npmjs.com/package/${packageData.name}/v/${packageData.version}`;
            }
        }
    } while (false);
    throw new TypeError(errorMsgTag`Invalid packageData value: ${packageData}`);
}
