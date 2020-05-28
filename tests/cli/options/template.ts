import * as path from 'path';

import {
    createTmpDir,
    DEFAULT_TEMPLATE_NAME,
    execCli,
    fileEntryExists,
    readFileAsync,
    writeFilesAsync,
} from '../../helpers';
import genWarn from '../../helpers/warning-message';

describe('template option', () => {
    it('basic', async () => {
        const cwd = await createTmpDir(__filename, 'basic');
        await writeFilesAsync(cwd, {
            [DEFAULT_TEMPLATE_NAME]: 'foo',
            'custom-template.njk': 'bar',
        });

        await expect(
            execCli(cwd, ['--template', 'custom-template.njk']),
        ).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkg: true, pkgLock: true }),
        });

        await expect(
            readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
        ).resolves.toBe('bar');
    });

    it('template not found', async () => {
        const templateName = 'custom-template.njk';

        const cwd = await createTmpDir(__filename, 'template-not-found');
        await writeFilesAsync(cwd, {
            [DEFAULT_TEMPLATE_NAME]: 'foo',
        });

        await expect(
            execCli(cwd, ['--template', templateName]),
        ).resolves.toMatchObject({
            exitCode: 1,
            stdout: '',
            stderr: `ENOENT: no such file or directory, open '${templateName}'`,
        });

        await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
    });
});
