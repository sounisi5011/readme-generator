import * as path from 'path';

import {
    createTmpDir,
    DEFAULT_TEMPLATE_NAME,
    execCli,
    fileEntryExists,
    readFileAsync,
    writeFilesAsync,
} from '../helpers';
import genWarn from '../helpers/warning-message';

describe('omitPackageScope', () => {
    it('basic', async () => {
        const cwd = await createTmpDir(__filename, 'basic');
        await expect(writeFilesAsync(cwd, {
            [DEFAULT_TEMPLATE_NAME]: `>>> {{ '@user/package' | omitPackageScope }} <<<`,
        })).toResolve();

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkg: true, pkgLock: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe('>>> package <<<');
    });

    it('invalid data', async () => {
        const cwd = await createTmpDir(__filename, 'invalid-data');
        await expect(writeFilesAsync(cwd, {
            [DEFAULT_TEMPLATE_NAME]: `>>> {{ 42 | omitPackageScope }} <<<`,
        })).toResolve();

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 1,
            stdout: '',
            stderr: genWarn([
                { pkg: true, pkgLock: true },
                `(unknown path)`,
                `  TypeError: omitPackageScope() filter / Invalid packageName value: 42`,
            ]),
        });

        await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
    });
});
