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

describe('test option', () => {
    it('before generation', async () => {
        const cwd = await createTmpDir(__filename, 'before-gen');
        await writeFilesAsync(cwd, {
            [DEFAULT_TEMPLATE_NAME]: 'foo',
        });

        await expect(execCli(cwd, ['--test'])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkg: true, pkgLock: true }),
        });

        await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
    });

    describe('after generation', () => {
        it('same content', async () => {
            const cwd = await createTmpDir(__filename, 'after-gen/same');
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: 'foo',
                'README.md': 'foo',
            });

            await expect(execCli(cwd, ['--test'])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: genWarn({ pkg: true, pkgLock: true }),
            });

            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe('foo');
        });

        it('different content', async () => {
            const cwd = await createTmpDir(__filename, 'after-gen/diff');
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: 'foo',
                'README.md': 'hoge',
            });

            await expect(execCli(cwd, ['--test'])).resolves.toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: [
                    genWarn({ pkg: true, pkgLock: true }),
                    `Do not edit 'README.md' manually! You MUST edit '${DEFAULT_TEMPLATE_NAME}' instead of 'README.md'`,
                ].join('\n'),
            });

            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe('hoge');
        });
    });
});
