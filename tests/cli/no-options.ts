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

describe('no options', () => {
    it('basic', async () => {
        const cwd = await createTmpDir(__filename, 'basic');
        await writeFilesAsync(cwd, {
            [DEFAULT_TEMPLATE_NAME]: 'foo',
        });

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkg: true, pkgLock: true }),
        });

        await expect(
            readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
        ).resolves.toBe('foo');
    });

    it('template not found', async () => {
        const cwd = await createTmpDir(__filename, 'template-not-found');

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 1,
            stdout: '',
            stderr: `ENOENT: no such file or directory, open '${DEFAULT_TEMPLATE_NAME}'`,
        });

        await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
    });

    // TODO: Remove this test
    it('fail if node 12.x', () => {
        expect(process.version).not.toMatch(/^v?12\./);
    });
});
