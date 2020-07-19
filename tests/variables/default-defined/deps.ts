import * as path from 'path';

import execa from 'execa';

import { createTmpDir, DEFAULT_TEMPLATE_NAME, execCli, readFileAsync, writeFilesAsync } from '../../helpers';
import genWarn from '../../helpers/warning-message';

describe('deps', () => {
    it('basic', async () => {
        const cwd = await createTmpDir(__filename, 'basic');
        await expect(writeFilesAsync(cwd, {
            'package.json': {},
            [DEFAULT_TEMPLATE_NAME]: [
                `{{ deps['package-version-git-tag'] | dump }}`,
                `{{ deps.cac | dump }}`,
            ],
        })).toResolve();
        await expect(execa(
            'npm',
            ['install', '--package-lock-only', 'package-version-git-tag@2.1.0'],
            { cwd },
        )).toResolve();

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ repository: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe([
            JSON.stringify({
                name: 'package-version-git-tag',
                version: '2.1.0',
                v: '2.1.0',
            }),
            JSON.stringify({
                name: 'cac',
                version: '6.5.8',
                v: '6.5.8',
            }),
        ].join('\n'));
    });

    it('invalid lock file', async () => {
        const cwd = await createTmpDir(__filename, 'invalid-lock-file');
        await expect(writeFilesAsync(cwd, {
            'package-lock.json': {},
            [DEFAULT_TEMPLATE_NAME]: `foo`,
        })).toResolve();

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn([
                { pkg: true },
                `Failed to read npm lockfile 'package-lock.json'. Reason: Invalid structure where 'dependencies' field does not exist.`,
            ]),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe(`foo`);
    });
});
