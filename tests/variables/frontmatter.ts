import * as path from 'path';

import { createTmpDir, DEFAULT_TEMPLATE_NAME, execCli, readFileAsync, writeFilesAsync } from '../helpers';
import genWarn from '../helpers/warning-message';

describe('frontmatter', () => {
    it('basic', async () => {
        const cwd = await createTmpDir(__filename, 'basic');
        await expect(writeFilesAsync(cwd, {
            [DEFAULT_TEMPLATE_NAME]: [
                `---`,
                `foo: ~`,
                `bar: 42`,
                `baz: hoge`,
                `qux:`,
                `  - 1`,
                `  - 9`,
                `  - 7`,
                `quux:`,
                `  hoge: 0x7E`,
                `  fuga: True`,
                `---`,
                `{{ [ foo, bar, baz, qux, quux ] | dump }}`,
            ],
        })).toResolve();

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkg: true, pkgLock: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe(JSON.stringify([
            null,
            42,
            'hoge',
            [1, 9, 7],
            { hoge: 0x7e, fuga: true },
        ]));
    });

    it('blank line', async () => {
        const cwd = await createTmpDir(__filename, 'blank-line');
        await expect(writeFilesAsync(cwd, {
            [DEFAULT_TEMPLATE_NAME]: [
                `---`,
                `var: foo`,
                `---`,
                ``,
                `{{ var }}`,
            ],
        })).toResolve();

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkg: true, pkgLock: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe('\nfoo');
    });

    it('overwrite default variables', async () => {
        const cwd = await createTmpDir(__filename, 'overwrite-default-vars');
        await expect(writeFilesAsync(cwd, {
            'package.json': {
                name: 'foo',
                version: '3.2.1',
            },
            [DEFAULT_TEMPLATE_NAME]: [
                `---`,
                `pkg: { foo: bar }`,
                `---`,
                `{{ pkg | dump }}`,
            ],
        })).toResolve();

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ repository: true, pkgLock: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe(JSON.stringify({ foo: 'bar' }));
    });
});
