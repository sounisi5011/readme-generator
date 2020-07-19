import * as path from 'path';

import execa from 'execa';

import {
    createTmpDir,
    DEFAULT_TEMPLATE_NAME,
    execCli,
    fileEntryExists,
    readFileAsync,
    writeFilesAsync,
} from '../helpers';
import genWarn from '../helpers/warning-message';

describe('npmURL', () => {
    it('basic', async () => {
        const cwd = await createTmpDir(__filename, 'basic');
        await writeFilesAsync(cwd, {
            [DEFAULT_TEMPLATE_NAME]: [
                `{{ 'foo' | npmURL }}`,
                `{{ 'foo@1.2.3' | npmURL }}`,
                `{{ 'foo@legacy' | npmURL }}`,
                `{{ '@hoge/bar' | npmURL }}`,
                `{{ '@hoge/bar@0.1.1-alpha' | npmURL }}`,
                `{{ '@hoge/bar@dev' | npmURL }}`,
            ],
        });

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkg: true, pkgLock: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe([
            `https://www.npmjs.com/package/foo`,
            `https://www.npmjs.com/package/foo/v/1.2.3`,
            `https://www.npmjs.com/package/foo/v/legacy`,
            `https://www.npmjs.com/package/@hoge/bar`,
            `https://www.npmjs.com/package/@hoge/bar/v/0.1.1-alpha`,
            `https://www.npmjs.com/package/@hoge/bar/v/dev`,
        ].join('\n'));
    });

    it('convert from deps', async () => {
        const cwd = await createTmpDir(__filename, 'convert-from-deps');
        await writeFilesAsync(cwd, {
            'package.json': {},
            [DEFAULT_TEMPLATE_NAME]: [
                `{{ deps['package-version-git-tag'] | npmURL }}`,
                `{{ deps.cac | npmURL }}`,
            ],
        });
        await execa(
            'npm',
            ['install', '--package-lock-only', 'package-version-git-tag@2.1.0'],
            { cwd },
        );

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ repository: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe([
            `https://www.npmjs.com/package/package-version-git-tag/v/2.1.0`,
            `https://www.npmjs.com/package/cac/v/6.5.8`,
        ].join('\n'));
    });

    it('invalid data', async () => {
        const cwd = await createTmpDir(__filename, 'invalid-data');
        await writeFilesAsync(cwd, {
            [DEFAULT_TEMPLATE_NAME]: `{{ 42 | npmURL }}`,
        });

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 1,
            stdout: '',
            stderr: genWarn([
                { pkg: true, pkgLock: true },
                `(unknown path)`,
                `  TypeError: npmURL() filter / Invalid packageData value: 42`,
            ]),
        });

        await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
    });
});
