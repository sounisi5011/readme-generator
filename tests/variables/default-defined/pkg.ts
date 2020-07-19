import * as path from 'path';

import { createTmpDir, DEFAULT_TEMPLATE_NAME, execCli, readFileAsync, writeFilesAsync } from '../../helpers';
import genWarn from '../../helpers/warning-message';

describe('pkg', () => {
    it('basic', async () => {
        const cwd = await createTmpDir(__filename, 'basic');
        const pkgData = {
            foo: null,
            bar: 'ex',
            pkg: [1, 2, 9],
            html: 'a<br>b',
        };
        await expect(writeFilesAsync(cwd, {
            'package.json': pkgData,
            [DEFAULT_TEMPLATE_NAME]: '{{ pkg | dump }}',
        })).toResolve();

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ repository: true, pkgLock: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe(JSON.stringify(pkgData));
    });

    it('invalid package.json', async () => {
        const cwd = await createTmpDir(__filename, 'invalid-pkg');
        await expect(writeFilesAsync(cwd, {
            'package.json': JSON.stringify(42),
            [DEFAULT_TEMPLATE_NAME]: `foo`,
        })).toResolve();

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkg: true, pkgLock: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe(`foo`);
    });
});
