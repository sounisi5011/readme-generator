import execa from 'execa';
import npmPath from 'npm-path';

import { isStringArray } from '../utils';
import { errorMsgTag } from '../utils/nunjucks';

export async function execCommand(command: unknown): Promise<string> {
    const $PATH = await new Promise<string>((resolve, reject) => {
        npmPath.get((error, $PATH) => {
            if (error) {
                reject(error);
            } else {
                resolve($PATH as string);
            }
        });
    });
    const options: execa.Options = {
        all: true,
        env: { [npmPath.PATH]: $PATH },
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
