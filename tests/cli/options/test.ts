import * as path from 'path';

import { Instance as ChalkInstance } from 'chalk';
import objOmit from 'omit.js';
import stripAnsi from 'strip-ansi';

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
        await expect(writeFilesAsync(cwd, {
            [DEFAULT_TEMPLATE_NAME]: 'foo',
        })).toResolve();

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
            await expect(writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: 'foo',
                'README.md': 'foo',
            })).toResolve();

            await expect(execCli(cwd, ['--test'])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: genWarn({ pkg: true, pkgLock: true }),
            });

            await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe('foo');
        });

        describe('different content', () => {
            const chalk = new ChalkInstance({ level: 1 });
            const coloredDiffLineList = [
                chalk`  {white.bgBlack Index: README.md\u001B[K}`,
                chalk`  {white.bgBlack ===================================================================\u001B[K}`,
                chalk`  {white.bgBlack ${chalk.red('--- README.md')}\u001B[K}`,
                chalk`  {white.bgBlack ${chalk.green('+++ README.md')}\u001B[K}`,
                chalk`  {white.bgBlack ${chalk.cyan('@@ -1,1 +1,1 @@')}\u001B[K}`,
                chalk`  {white.bgBlack ${chalk.red('-hoge')}\u001B[K}`,
                chalk`  {white.bgBlack \\ No newline at end of file\u001B[K}`,
                chalk`  {white.bgBlack ${chalk.green('+foo')}\u001B[K}`,
                chalk`  {white.bgBlack \\ No newline at end of file\u001B[K}`,
            ];

            const cwdAsync = createTmpDir(__filename, `after-gen/diff`);
            const sourceEnv = objOmit(
                process.env,
                ['FORCE_COLOR', 'TERM', 'CI', 'TEAMCITY_VERSION', 'COLORTERM', 'TERM_PROGRAM'],
            );

            it.each([
                [{ FORCE_COLOR: '1' }, true],
                [{ FORCE_COLOR: '0' }, false],
            ])('env = %p', async (envObj, isEnableColor) => {
                const cwd = await cwdAsync;
                await expect(writeFilesAsync(cwd, {
                    [DEFAULT_TEMPLATE_NAME]: 'foo',
                    'README.md': 'hoge',
                })).toResolve();

                await expect(execCli(cwd, ['--test'], { extendEnv: false, env: { ...sourceEnv, ...envObj } })).resolves
                    .toMatchObject({
                        exitCode: 1,
                        stdout: '',
                        stderr: genWarn([
                            { pkg: true, pkgLock: true },
                            `Do not edit 'README.md' manually! You MUST edit '${DEFAULT_TEMPLATE_NAME}' instead of 'README.md'`,
                            ``,
                            ...(isEnableColor ? coloredDiffLineList : [
                                ...coloredDiffLineList.map(stripAnsi),
                                `  // end of diff text`,
                            ]),
                            ``,
                        ]),
                    });

                await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe('hoge');
            });
        });
    });
});
