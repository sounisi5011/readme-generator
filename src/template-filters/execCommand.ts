import execa from 'execa';
import npmPath from 'npm-path';

import { cachedPromise, errorMsgTag, isStringArray } from '../utils';

// eslint-disable-next-line @typescript-eslint/promise-function-async
const getEnvRecord = cachedPromise(() =>
    new Promise<Record<string, string>>((resolve, reject) =>
        npmPath.get((error, $PATH) => {
            if (error) {
                reject(error);
            } else if ($PATH) {
                resolve({ [npmPath.PATH]: $PATH });
            } else {
                resolve({});
            }
        })
    )
);

export async function execCommand(command: unknown): Promise<string> {
    const options: execa.Options = {
        all: true,
        env: await getEnvRecord(),
    };
    let proc: execa.ExecaChildProcess | undefined;
    if (typeof command === 'string') {
        proc = execa.command(command, options);
    } else if (isStringArray(command)) {
        const [file, ...args] = command;
        proc = execa(file, args, options);
    }
    if (!proc) {
        throw new TypeError(errorMsgTag`Invalid command value: ${command}`);
    }

    const result = await proc;
    return result.all ?? result.stdout;
}
