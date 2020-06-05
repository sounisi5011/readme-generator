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
                    // prettier-ignore
                    `{%- setProp x.y = ${JSON.stringify(val)} | lower | urlencode -%}`,
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

        it('assign to property of expression result', async () => {
            const prop = '漢';
            const val = 87;

            const cwd = await createTmpDir(
                __filename,
                `${idPrefix}/assign-to-prop-of-exp-result`,
            );
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: [
                    `{%- set foo = {} -%}`,
                    `{%- set prop = ${JSON.stringify(prop)} -%}`,
                    `{%- setProp foo[prop] = ${JSON.stringify(val)} -%}`,
                    `{{ { foo:foo } | dump(2) }}`,
                ],
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 0,
                stdout: '',
                stderr: genWarn({ pkg: true, pkgLock: true }),
            });

            const expectedContext = { foo: { [prop]: val } };
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
                            `{%- set foo = {} -%}`,
                            `{%- setProp foo.bar %}hoge{% ${endBlockName} -%}`,
                            `{{ { foo:foo } | dump(2) }}`,
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
                    ).resolves.toBe(JSON.stringify(expectedContext, null, 2));
                });

                it('convert templates in content', async () => {
                    const cwd = await createTmpDir(
                        __filename,
                        `${idPrefix}/convert-template`,
                    );
                    await writeFilesAsync(cwd, {
                        [DEFAULT_TEMPLATE_NAME]: [
                            `{%- set foo = {} -%}`,
                            `{%- setProp foo.bar %}hoge{{ 42 }}fuga{% ${endBlockName} -%}`,
                            `{{ { foo:foo } | dump(2) }}`,
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
                    ).resolves.toBe(JSON.stringify(expectedContext, null, 2));
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

                it('assign to property of expression result', async () => {
                    const prop = 'woo';
                    const str = 'foo\n  bar\n  ';

                    const cwd = await createTmpDir(
                        __filename,
                        `${idPrefix}/assign-to-prop-of-exp-result`,
                    );
                    await writeFilesAsync(cwd, {
                        [DEFAULT_TEMPLATE_NAME]: [
                            `{%- set foo = {} -%}`,
                            `{%- set prop = ${JSON.stringify(prop)} -%}`,
                            `{%- setProp foo[prop | upper] %}${str}{% ${endBlockName} -%}`,
                            `{{ { foo:foo } | dump(2) }}`,
                        ],
                    });

                    await expect(execCli(cwd, [])).resolves.toMatchObject({
                        exitCode: 0,
                        stdout: '',
                        stderr: genWarn({ pkg: true, pkgLock: true }),
                    });

                    const expectedContext = {
                        foo: { [prop.toUpperCase()]: str },
                    };
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

    const strAndPos = (
        template: string | string[],
        posChar = '\v',
    ): { templateText: string; index: number; line: number; col: number } => {
        const templateText = Array.isArray(template)
            ? template.join('\n')
            : template;
        const index = templateText.indexOf(posChar);
        if (index < 0) return { templateText, index: NaN, line: NaN, col: NaN };

        const prevText = templateText.substring(0, index);
        const lineStartIndex = prevText.lastIndexOf('\n') + 1;

        return {
            templateText:
                prevText + templateText.substring(index + posChar.length),
            index,
            line: (prevText.match(/\n/g)?.length || 0) + 1,
            col: index - lineStartIndex + 1,
        };
    };

    describe('invalid syntax', () => {
        const idPrefix = `invalid-syntax`;

        describe('not variabre name reference', () => {
            const table = [
                {
                    id: 'exp-num',
                    exp: `\v42`,
                },
                {
                    id: 'exp-regex',
                    exp: `\vr/^foo.*/`,
                },
                {
                    id: 'exp-group',
                    exp: `\v(foo.baz)`,
                },
                {
                    id: 'exp-array',
                    exp: `\v[foo, bar]`,
                },
                {
                    id: 'exp-dict',
                    exp: `\v{ foo: bar }`,
                },
                {
                    id: 'exp-func',
                    name: 'func()',
                    exp: `foo.baz\v()`,
                },
            ];

            for (const { id, exp, name = exp.replace(/\v/g, '') } of table) {
                // eslint-disable-next-line jest/valid-title
                it(name, async () => {
                    const { templateText, line, col } = strAndPos([
                        `{% setProp foo.bar, ${exp} = true %}`,
                    ]);

                    const cwd = await createTmpDir(
                        __filename,
                        `${idPrefix}/not-var-ref/${id}`,
                    );
                    await writeFilesAsync(cwd, {
                        [DEFAULT_TEMPLATE_NAME]: templateText,
                    });

                    await expect(execCli(cwd, [])).resolves.toMatchObject({
                        exitCode: 1,
                        stdout: '',
                        stderr: [
                            genWarn({ pkg: true, pkgLock: true }),
                            `(unknown path) [Line ${line}, Column ${col}]`,
                            `  SetPropExtension#parse: expected variable name or variable reference in setProp tag`,
                        ].join('\n'),
                    });

                    await expect(
                        fileEntryExists(cwd, 'README.md'),
                    ).resolves.toBe(false);
                });
            }
        });

        describe('no variabres', () => {
            it('end of block', async () => {
                const { templateText, line, col } = strAndPos([
                    `{% setProp     \v%}`,
                ]);

                const cwd = await createTmpDir(
                    __filename,
                    `${idPrefix}/no-vars/end-block`,
                );
                await writeFilesAsync(cwd, {
                    [DEFAULT_TEMPLATE_NAME]: templateText,
                });

                await expect(execCli(cwd, [])).resolves.toMatchObject({
                    exitCode: 1,
                    stdout: '',
                    stderr: [
                        genWarn({ pkg: true, pkgLock: true }),
                        `(unknown path) [Line ${line}, Column ${col}]`,
                        `  SetPropExtension#parse: expected one or more variable in setProp tag, got no variable`,
                    ].join('\n'),
                });

                await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                    false,
                );
            });

            it('end of file', async () => {
                const templateText = `{% setProp     `;

                const cwd = await createTmpDir(
                    __filename,
                    `${idPrefix}/no-vars/end-file`,
                );
                await writeFilesAsync(cwd, {
                    [DEFAULT_TEMPLATE_NAME]: templateText,
                });

                await expect(execCli(cwd, [])).resolves.toMatchObject({
                    exitCode: 1,
                    stdout: '',
                    stderr: [
                        genWarn({ pkg: true, pkgLock: true }),
                        `(unknown path)`,
                        `  SetPropExtension#parse: expected one or more variable in setProp tag, got end of file`,
                    ].join('\n'),
                });

                await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                    false,
                );
            });
        });

        describe('no expression', () => {
            it('end of block', async () => {
                const { templateText, line, col } = strAndPos([
                    `{% setProp foo.bar = \v%}`,
                ]);

                const cwd = await createTmpDir(
                    __filename,
                    `${idPrefix}/no-exp/end-block`,
                );
                await writeFilesAsync(cwd, {
                    [DEFAULT_TEMPLATE_NAME]: templateText,
                });

                await expect(execCli(cwd, [])).resolves.toMatchObject({
                    exitCode: 1,
                    stdout: '',
                    stderr: [
                        genWarn({ pkg: true, pkgLock: true }),
                        `(unknown path) [Line ${line}, Column ${col}]`,
                        `  SetPropExtension#parse: expected expression in setProp tag, got unexpected token: %}`,
                    ].join('\n'),
                });

                await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                    false,
                );
            });

            it('end of file', async () => {
                const templateText = `{% setProp foo.bar =     `;

                const cwd = await createTmpDir(
                    __filename,
                    `${idPrefix}/no-exp/end-file`,
                );
                await writeFilesAsync(cwd, {
                    [DEFAULT_TEMPLATE_NAME]: templateText,
                });

                await expect(execCli(cwd, [])).resolves.toMatchObject({
                    exitCode: 1,
                    stdout: '',
                    stderr: [
                        genWarn({ pkg: true, pkgLock: true }),
                        `(unknown path)`,
                        `  SetPropExtension#parse: expected expression in setProp tag, got end of file`,
                    ].join('\n'),
                });

                await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                    false,
                );
            });
        });

        it('no tag end', async () => {
            const { templateText, line, col } = strAndPos([
                `{% setProp foo.bar   \v`,
            ]);

            const cwd = await createTmpDir(
                __filename,
                `${idPrefix}/no-tag-end`,
            );
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: templateText,
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: [
                    genWarn({ pkg: true, pkgLock: true }),
                    `(unknown path) [Line ${line}, Column ${col}]`,
                    `  SetPropExtension#parse: expected = or block end in setProp tag`,
                ].join('\n'),
            });

            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                false,
            );
        });

        it('no end tag', async () => {
            const templateText = `{% setProp foo.bar %}`;

            const cwd = await createTmpDir(
                __filename,
                `${idPrefix}/no-end-tag`,
            );
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: templateText,
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: [
                    genWarn({ pkg: true, pkgLock: true }),
                    `(unknown path)`,
                    `  SetPropExtension#parse: unexpected end of file. expected "endsetProp" or "endset" block after setProp tag`,
                ].join('\n'),
            });

            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                false,
            );
        });

        it('missing comma', async () => {
            const { templateText, line, col } = strAndPos([
                `{% setProp foo.bar, a.b \vxxx.yyy, hoge = 42 %}`,
            ]);

            const cwd = await createTmpDir(
                __filename,
                `${idPrefix}/missing-comma`,
            );
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: templateText,
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: [
                    genWarn({ pkg: true, pkgLock: true }),
                    `(unknown path) [Line ${line}, Column ${col}]`,
                    `  SetPropExtension#parse: expected \`,\` or = in setProp tag`,
                ].join('\n'),
            });

            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                false,
            );
        });
    });

    describe('assign error', () => {
        const idPrefix = `assign-error`;

        it('undefined variable', async () => {
            const { templateText, line, col } = strAndPos([
                `{% setProp foo\v.bar = 42 %}`,
            ]);

            const cwd = await createTmpDir(__filename, `${idPrefix}/undef-var`);
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: templateText,
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: [
                    genWarn({ pkg: true, pkgLock: true }),
                    `(unknown path) [Line ${line}, Column ${col}]`,
                    `  TypeError: setProp tag / Cannot be assigned to \`foo.bar\`! \`foo\` variable value is undefined, not an object`,
                ].join('\n'),
            });

            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                false,
            );
        });

        it('undefined child variable', async () => {
            const { templateText, line, col } = strAndPos([
                `{% set foo = {} %}`,
                `{% setProp foo["ba-r"]\v.baz = 42 %}`,
            ]);

            const cwd = await createTmpDir(
                __filename,
                `${idPrefix}/undef-child-var`,
            );
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: templateText,
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: [
                    genWarn({ pkg: true, pkgLock: true }),
                    `(unknown path) [Line ${line}, Column ${col}]`,
                    `  TypeError: setProp tag / Cannot be assigned to \`foo['ba-r'].baz\`! \`foo['ba-r']\` variable value is undefined, not an object`,
                ].join('\n'),
            });

            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                false,
            );
        });

        it('undefined grandchild variable', async () => {
            const { templateText, line, col } = strAndPos([
                `{% set foo = {} %}`,
                `{% setProp foo["ba-r"]\v.baz.qux['ほげ'] = 42 %}`,
            ]);

            const cwd = await createTmpDir(
                __filename,
                `${idPrefix}/undef-grandchild-var`,
            );
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: templateText,
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: [
                    genWarn({ pkg: true, pkgLock: true }),
                    `(unknown path) [Line ${line}, Column ${col}]`,
                    `  TypeError: setProp tag / Cannot be assigned to \`foo['ba-r'].baz.qux.ほげ\`! \`foo['ba-r']\` variable value is undefined, not an object`,
                ].join('\n'),
            });

            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                false,
            );
        });

        it('null variable', async () => {
            const { templateText, line, col } = strAndPos([
                `{% set foo = null %}`,
                `{% setProp foo\v['bar'] = 42 %}`,
            ]);

            const cwd = await createTmpDir(__filename, `${idPrefix}/null-var`);
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: templateText,
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: [
                    genWarn({ pkg: true, pkgLock: true }),
                    `(unknown path) [Line ${line}, Column ${col}]`,
                    `  TypeError: setProp tag / Cannot be assigned to \`foo.bar\`! \`foo\` variable value is null, not an object`,
                ].join('\n'),
            });

            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                false,
            );
        });

        it('number variable', async () => {
            const { templateText, line, col } = strAndPos([
                `{% set foo = 42 %}`,
                ``,
                `{% setProp foo\v.bar = 42 %}`,
            ]);

            const cwd = await createTmpDir(
                __filename,
                `${idPrefix}/number-var`,
            );
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: templateText,
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: [
                    genWarn({ pkg: true, pkgLock: true }),
                    `(unknown path) [Line ${line}, Column ${col}]`,
                    `  TypeError: setProp tag / Cannot be assigned to \`foo.bar\`! \`foo\` variable value is number, not an object`,
                ].join('\n'),
            });

            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                false,
            );
        });
    });
});
