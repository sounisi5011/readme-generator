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

import execa = require('execa');

describe('execCommand', () => {
    describe('basic', () => {
        it('string', async () => {
            const cwd = await createTmpDir(__filename, 'basic/string');
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: `{{ 'node --version' | execCommand }}`,
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: genWarn({ pkg: true, pkgLock: true }),
            });

            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe((await execa.command('node --version')).stdout);
        });

        it('array', async () => {
            const cwd = await createTmpDir(__filename, 'basic/array');
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: `{{ ['npm', '--version'] | execCommand }}`,
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: genWarn({ pkg: true, pkgLock: true }),
            });

            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe((await execa('npm', ['--version'])).stdout);
        });
    });

    it('execute local bin', async () => {
        const rand = String(Math.random());

        const cwd = await createTmpDir(__filename, 'exec-local-bin');
        await writeFilesAsync(cwd, {
            'package.json': {},
            'scripts/hoge/package.json': {
                name: 'hoge',
                version: '0.0.0',
                bin: 'index.js',
            },
            'scripts/hoge/index.js': [
                `#!/usr/bin/env node`,
                `console.log(${JSON.stringify(rand)});`,
            ],
            [DEFAULT_TEMPLATE_NAME]: `{{ ['hoge'] | execCommand }}`,
        });
        await expect(
            execa('npm', ['install', './scripts/hoge'], {
                cwd,
            }),
        ).resolves.toBeDefined();

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ repository: true }),
        });

        await expect(
            readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
        ).resolves.toBe(rand);
    }, 15000);

    it('stdout and stderr', async () => {
        const cwd = await createTmpDir(__filename, 'stdout+stderr');
        await writeFilesAsync(cwd, {
            [DEFAULT_TEMPLATE_NAME]: [
                `---`,
                `cmdText: ${
                    JSON.stringify(
                        `[...Array(10).keys()].forEach(i => setTimeout(() => process[i%2 === 0 ? 'stdout' : 'stderr'].write(' ' + i), i*100))`,
                    )
                }`,
                `---`,
                `{{ ['node', '-e', cmdText] | execCommand }}`,
            ],
        });

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkg: true, pkgLock: true }),
        });

        await expect(
            readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
        ).resolves.toBe(` 0 1 2 3 4 5 6 7 8 9`);
    });

    it('invalid data', async () => {
        const cwd = await createTmpDir(__filename, 'invalid-data');
        await writeFilesAsync(cwd, {
            [DEFAULT_TEMPLATE_NAME]: `{{ 42 | execCommand }}`,
        });

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 1,
            stdout: '',
            stderr: [
                genWarn({ pkg: true, pkgLock: true }),
                `(unknown path)`,
                `  TypeError: execCommand() filter / Invalid command value: 42`,
            ].join('\n'),
        });

        await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
    });
});
