import * as path from 'path';

import {
    createTmpDir,
    DEFAULT_TEMPLATE_NAME,
    execCli,
    readFileAsync,
    writeFilesAsync,
} from '../helpers';
import genWarn from '../helpers/warning-message';

describe('setProp', () => {
    describe('assign expression', () => {
        const idPrefix = `assign-expression`;

        it('assign value', async () => {
            const val = 42;

            const cwd = await createTmpDir(
                __filename,
                `${idPrefix}/assign-value`,
            );
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: [
                    `{%- set foo = {} -%}`,
                    `{%- setProp foo.bar = ${JSON.stringify(val)} -%}`,
                    `{{ { foo:foo } | dump(2) }}`,
                ],
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: genWarn({ pkg: true, pkgLock: true }),
            });

            const expectedContext = { foo: { bar: val } };
            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe(JSON.stringify(expectedContext, null, 2));
        });

        it('assign filtered value', async () => {
            const val = 'a-/-A';

            const cwd = await createTmpDir(
                __filename,
                `${idPrefix}/assign-filtered-value`,
            );
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: [
                    `{%- set x = {} -%}`,
                    `{%- setProp x.y = ${JSON.stringify(val)} | lower | e -%}`,
                    `{{ { x:x } | dump(2) }}`,
                ],
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: genWarn({ pkg: true, pkgLock: true }),
            });

            const expectedContext = {
                x: { y: encodeURIComponent(val.toLowerCase()) },
            };
            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe(JSON.stringify(expectedContext, null, 2));
        });

        it('assign to array', async () => {
            const val = 42;

            const cwd = await createTmpDir(
                __filename,
                `${idPrefix}/assign-to-array`,
            );
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: [
                    `{%- set foo = [] -%}`,
                    `{%- setProp foo[0] = ${JSON.stringify(val)} -%}`,
                    `{{ { foo:foo } | dump(2) }}`,
                ],
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: genWarn({ pkg: true, pkgLock: true }),
            });

            const expectedContext = { foo: [val] };
            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe(JSON.stringify(expectedContext, null, 2));
        });

        it('assign to multiple properties', async () => {
            const val = 5;

            const cwd = await createTmpDir(
                __filename,
                `${idPrefix}/assign-to-multi-props`,
            );
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: [
                    `{%- set foo = {} -%}`,
                    `{%- setProp foo.x, foo.y,`,
                    `            foo.z = ${JSON.stringify(val)} -%}`,
                    `{{ { foo:foo } | dump(2) }}`,
                ],
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: genWarn({ pkg: true, pkgLock: true }),
            });

            const expectedContext = { foo: { x: val, y: val, z: val } };
            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe(JSON.stringify(expectedContext, null, 2));
        });

        it('define variable', async () => {
            const val = 'joe';

            const cwd = await createTmpDir(__filename, `${idPrefix}/def-var`);
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: [
                    `{%- setProp foo = ${JSON.stringify(val)} -%}`,
                    `{{ { foo:foo } | dump(2) }}`,
                ],
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: genWarn({ pkg: true, pkgLock: true }),
            });

            const expectedContext = { foo: val };
            await expect(
                readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
            ).resolves.toBe(JSON.stringify(expectedContext, null, 2));
        });
    });

    describe('capture the contents of a block', () => {
        for (const [id, endBlockName] of Object.entries({
            'setprop-endset': 'endset',
            'setprop-endsetprop': 'endsetProp',
        })) {
            const name = `setProp to ${endBlockName}`;
            const idPrefix = `capture-block-contents/${id}`;

            // eslint-disable-next-line jest/valid-title
            describe(name, () => {
                it('basic', async () => {
                    const cwd = await createTmpDir(
                        __filename,
                        `${idPrefix}/basic`,
                    );
                    await writeFilesAsync(cwd, {
                        [DEFAULT_TEMPLATE_NAME]: [
                            `---`,
                            `foo: {}`,
                            `---`,
                            `{%- setProp foo.bar %}hoge{% ${endBlockName} -%}`,
                            `{{ foo | dump }}`,
                        ],
                    });

                    await expect(execCli(cwd, [])).resolves.toMatchObject({
                        exitCode: 0,
                        stdout: '',
                        stderr: genWarn({ pkg: true, pkgLock: true }),
                    });

                    const expectedContext = { foo: { bar: 'hoge' } };
                    await expect(
                        readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
                    ).resolves.toBe(`${JSON.stringify(expectedContext.foo)}`);
                });

                it('convert templates in content', async () => {
                    const cwd = await createTmpDir(
                        __filename,
                        `${idPrefix}/convert-template`,
                    );
                    await writeFilesAsync(cwd, {
                        [DEFAULT_TEMPLATE_NAME]: [
                            `---`,
                            `foo: {}`,
                            `---`,
                            `{%- setProp foo.bar %}hoge{{ 42 }}fuga{% ${endBlockName} -%}`,
                            `{{ foo | dump }}`,
                        ],
                    });

                    await expect(execCli(cwd, [])).resolves.toMatchObject({
                        exitCode: 0,
                        stdout: '',
                        stderr: genWarn({ pkg: true, pkgLock: true }),
                    });

                    const expectedContext = { foo: { bar: 'hoge42fuga' } };
                    await expect(
                        readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
                    ).resolves.toBe(`${JSON.stringify(expectedContext.foo)}`);
                });

                it('assign to array', async () => {
                    const str = 'foo\n  bar\n  ';

                    const cwd = await createTmpDir(
                        __filename,
                        `${idPrefix}/assign-to-array`,
                    );
                    await writeFilesAsync(cwd, {
                        [DEFAULT_TEMPLATE_NAME]: [
                            `{%- set foo = [] -%}`,
                            `{%- setProp foo[0] %}${str}{% ${endBlockName} -%}`,
                            `{{ { foo:foo } | dump(2) }}`,
                        ],
                    });

                    await expect(execCli(cwd, [])).resolves.toMatchObject({
                        exitCode: 0,
                        stdout: '',
                        stderr: genWarn({ pkg: true, pkgLock: true }),
                    });

                    const expectedContext = { foo: [str] };
                    await expect(
                        readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
                    ).resolves.toBe(JSON.stringify(expectedContext, null, 2));
                });

                it('assign to multiple properties', async () => {
                    const str = 'foo\n  bar\n  ';

                    const cwd = await createTmpDir(
                        __filename,
                        `${idPrefix}/assign-to-multi-props`,
                    );
                    await writeFilesAsync(cwd, {
                        [DEFAULT_TEMPLATE_NAME]: [
                            `{%- set foo = {} -%}`,
                            `{%- set bar = { baz: {} } -%}`,
                            `{%- setProp foo.one, bar.two, bar.baz.three, bar.four %}${str}{% ${endBlockName} -%}`,
                            `{{ { foo:foo, bar:bar } | dump(2) }}`,
                        ],
                    });

                    await expect(execCli(cwd, [])).resolves.toMatchObject({
                        exitCode: 0,
                        stdout: '',
                        stderr: genWarn({ pkg: true, pkgLock: true }),
                    });

                    const expectedContext = {
                        foo: {},
                        bar: { baz: {} },
                    };
                    Object.assign(expectedContext.foo, { one: str });
                    Object.assign(expectedContext.bar, { two: str });
                    Object.assign(expectedContext.bar.baz, { three: str });
                    Object.assign(expectedContext.bar, { four: str });
                    await expect(
                        readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
                    ).resolves.toBe(JSON.stringify(expectedContext, null, 2));
                });

                it('trim contents', async () => {
                    const str = {
                        ws: '  str  ',
                        lb: '\nstr\n',
                        wslb: '\n  str  \n',
                    } as const;

                    const cwd = await createTmpDir(
                        __filename,
                        `${idPrefix}/trim-contents`,
                    );
                    await writeFilesAsync(cwd, {
                        [DEFAULT_TEMPLATE_NAME]: [
                            `{%- set ws = {} -%}`,
                            `{%- set lb = {} -%}`,
                            `{%- set wslb = {} -%}`,
                            ``,
                            `{%- setProp ws.noTrim %}${str.ws}{% ${endBlockName} -%}`,
                            `{%- setProp lb.noTrim %}${str.lb}{% ${endBlockName} -%}`,
                            `{%- setProp wslb.noTrim %}${str.wslb}{% ${endBlockName} -%}`,
                            ``,
                            `{%- setProp ws.trimStart -%}${str.ws}{% ${endBlockName} -%}`,
                            `{%- setProp lb.trimStart -%}${str.lb}{% ${endBlockName} -%}`,
                            `{%- setProp wslb.trimStart -%}${str.wslb}{% ${endBlockName} -%}`,
                            ``,
                            `{%- setProp ws.trimEnd %}${str.ws}{%- ${endBlockName} -%}`,
                            `{%- setProp lb.trimEnd %}${str.lb}{%- ${endBlockName} -%}`,
                            `{%- setProp wslb.trimEnd %}${str.wslb}{%- ${endBlockName} -%}`,
                            ``,
                            `{%- setProp ws.trim -%}${str.ws}{%- ${endBlockName} -%}`,
                            `{%- setProp lb.trim -%}${str.lb}{%- ${endBlockName} -%}`,
                            `{%- setProp wslb.trim -%}${str.wslb}{%- ${endBlockName} -%}`,
                            ``,
                            `{{ { ws:ws, lb:lb, wslb:wslb } | dump(2) }}`,
                        ],
                    });

                    await expect(execCli(cwd, [])).resolves.toMatchObject({
                        exitCode: 0,
                        stdout: '',
                        stderr: genWarn({ pkg: true, pkgLock: true }),
                    });

                    const expectedContext = {
                        ws: {
                            noTrim: str.ws,
                            trimStart: str.ws.trimStart(),
                            trimEnd: str.ws.trimEnd(),
                            trim: str.ws.trim(),
                        },
                        lb: {
                            noTrim: str.lb,
                            trimStart: str.lb.trimStart(),
                            trimEnd: str.lb.trimEnd(),
                            trim: str.lb.trim(),
                        },
                        wslb: {
                            noTrim: str.wslb,
                            trimStart: str.wslb.trimStart(),
                            trimEnd: str.wslb.trimEnd(),
                            trim: str.wslb.trim(),
                        },
                    };
                    await expect(
                        readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
                    ).resolves.toBe(JSON.stringify(expectedContext, null, 2));
                });

                it('define variable', async () => {
                    const desc = 'foo\nbar\nbaz\n';

                    const cwd = await createTmpDir(
                        __filename,
                        `${idPrefix}/def-var`,
                    );
                    await writeFilesAsync(cwd, {
                        'description.txt': desc,
                        [DEFAULT_TEMPLATE_NAME]: [
                            `{%- setProp desc %}`,
                            `  {% include 'description.txt' %}`,
                            `{% ${endBlockName} -%}`,
                            `{{ { desc:desc } | dump(2) }}`,
                        ],
                    });

                    await expect(execCli(cwd, [])).resolves.toMatchObject({
                        exitCode: 0,
                        stdout: '',
                        stderr: genWarn({ pkg: true, pkgLock: true }),
                    });

                    const expectedContext = { desc: `\n  ${desc}\n` };
                    await expect(
                        readFileAsync(path.join(cwd, 'README.md'), 'utf8'),
                    ).resolves.toBe(JSON.stringify(expectedContext, null, 2));
                });
            });
        }
    });
});
