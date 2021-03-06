import * as path from 'path';

import { createTmpDir, DEFAULT_TEMPLATE_NAME, execCli, readFileAsync, strAndPos, writeFilesAsync } from '../helpers';
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

    describe('report valid line number', () => {
        it.each([
            [
                `---`,
                `---`,
            ],
            [
                `---`,
                `x: 0`,
                `---`,
            ],
            [
                `---`,
                `x: 0`,
                `y: 1`,
                `---`,
            ],
            [
                `---`,
                `---`,
                ``,
            ],
            [
                `---`,
                `---`,
                ``,
                ``,
            ],
            [
                `---`,
                `---\r`,
            ],
            [
                `---`,
                `---\r\n`,
            ],
            [
                `---`,
                `---\r\r`,
            ],
            [
                `---`,
                `---\r\n\r`,
            ],
        ].map((v, k) => [v, k] as const))('%j', async (frontmatterLines, index) => {
            const { templateText, line, col } = strAndPos([
                ...frontmatterLines,
                `{% \vxxxxxxxx %}`,
            ]);

            const cwd = await createTmpDir(__filename, `valid-line-number/${index}`);

            await expect(writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: templateText,
            })).toResolve();

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: genWarn([
                    { pkg: true, pkgLock: true },
                    `(unknown path) [Line ${line}, Column ${col}]`,
                    `  unknown block tag: xxxxxxxx`,
                ]),
            });
        });
    });
});
