import type { JsonObject } from 'type-fest';

import { renderNunjucksWithFrontmatter } from '../../src/renderer';
import { SetPropExtension } from '../../src/template-tags/setProp';
import { createTmpDir, strAndPos, writeFilesAsync } from '../helpers';

type SuccessTable = Readonly<
    Record<
        string,
        () => {
            readonly templateLines: readonly string[];
            readonly expectedContext: JsonObject;
        }
    >
>;

type FailTable = Readonly<
    Record<
        string,
        () => {
            readonly templateText: string;
            readonly expectedErrorMessageLines: readonly string[];
        }
    >
>;

describe('setProp', () => {
    describe('assign expression', () => {
        const table: SuccessTable = {
            'assign value': () => {
                const val = 42;
                return {
                    templateLines: [
                        `{%- set foo = {} -%}`,
                        `{%- setProp foo.bar = ${JSON.stringify(val)} -%}`,
                        `{{ { foo:foo } | dump(2) }}`,
                    ],
                    expectedContext: { foo: { bar: val } },
                };
            },
            'assign filtered value': () => {
                const val = 'a-/-A';
                return {
                    templateLines: [
                        `{%- set x = {} -%}`,
                        `{%- setProp x.y = ${JSON.stringify(val)} | lower | urlencode -%}`,
                        `{{ { x:x } | dump(2) }}`,
                    ],
                    expectedContext: {
                        x: { y: encodeURIComponent(val.toLowerCase()) },
                    },
                };
            },
            'assign to array': () => {
                const val = 42;
                return {
                    templateLines: [
                        `{%- set foo = [] -%}`,
                        `{%- setProp foo[0] = ${JSON.stringify(val)} -%}`,
                        `{{ { foo:foo } | dump(2) }}`,
                    ],
                    expectedContext: { foo: [val] },
                };
            },
            'assign to multiple properties': () => {
                const val = 5;
                return {
                    templateLines: [
                        `{%- set foo = {} -%}`,
                        `{%- setProp foo.x, foo.y,`,
                        `            foo.z = ${JSON.stringify(val)} -%}`,
                        `{{ { foo:foo } | dump(2) }}`,
                    ],
                    expectedContext: { foo: { x: val, y: val, z: val } },
                };
            },
            'assign to object of expression result': () => {
                const val = Math.random();
                return {
                    templateLines: [
                        `{%- set foo = {} -%}`,
                        `{%- setProp [foo][0].bar = ${JSON.stringify(val)} -%}`,
                        `{{ { foo:foo } | dump(2) }}`,
                    ],
                    expectedContext: { foo: { bar: val } },
                };
            },
            'assign to property of expression result': () => {
                const prop = '漢';
                const val = 87;
                return {
                    templateLines: [
                        `{%- set foo = {} -%}`,
                        `{%- set prop = ${JSON.stringify(prop)} -%}`,
                        `{%- setProp foo[prop] = ${JSON.stringify(val)} -%}`,
                        `{{ { foo:foo } | dump(2) }}`,
                    ],
                    expectedContext: { foo: { [prop]: val } },
                };
            },
            'define variable': () => {
                const val = 'joe';
                return {
                    templateLines: [
                        `{%- setProp foo = ${JSON.stringify(val)} -%}`,
                        `{{ { foo:foo } | dump(2) }}`,
                    ],
                    expectedContext: { foo: val },
                };
            },
        };
        it.each(Object.entries(table))('%s', async (_, fn) => {
            const { templateLines, expectedContext } = fn();
            const templateText = templateLines.join('\n');

            const result = renderNunjucksWithFrontmatter(
                templateText,
                {},
                { cwd: '.', filters: {}, extensions: [SetPropExtension] },
            );

            await expect(result).resolves
                .toBe(JSON.stringify(expectedContext, null, 2));
        });

        describe('overwrite defined variable', () => {
            const tests = [
                'set',
                'setProp',
            ];

            it.each(tests)('%s tag', async tagName => {
                const val = Math.random();

                const templateText = [
                    `{%- ${tagName} foo = null -%}`,
                    `{{ { foo:foo } | dump(2) }}`,
                    `{% setProp foo = ${JSON.stringify(val)} -%}`,
                    `{{ { foo:foo } | dump(2) }}`,
                ].join('\n');

                const result = renderNunjucksWithFrontmatter(
                    templateText,
                    {},
                    { cwd: '.', filters: {}, extensions: [SetPropExtension] },
                );

                await expect(result).resolves.toBe([
                    JSON.stringify({ foo: null }, null, 2),
                    JSON.stringify({ foo: val }, null, 2),
                ].join('\n'));
            });
        });
    });

    describe('capture the contents of a block', () => {
        describe.each([
            'endset',
            'endsetProp',
        ])('setProp to %s', endBlockName => {
            const idPrefix = `capture-block-contents/${endBlockName}`;

            const table: SuccessTable = {
                'basic': () => ({
                    templateLines: [
                        `{%- set foo = {} -%}`,
                        `{%- setProp foo.bar %}hoge{% ${endBlockName} -%}`,
                        `{{ { foo:foo } | dump(2) }}`,
                    ],
                    expectedContext: { foo: { bar: 'hoge' } },
                }),
                'convert templates in content': () => ({
                    templateLines: [
                        `{%- set foo = {} -%}`,
                        `{%- setProp foo.bar %}hoge{{ 42 }}fuga{% ${endBlockName} -%}`,
                        `{{ { foo:foo } | dump(2) }}`,
                    ],
                    expectedContext: { foo: { bar: 'hoge42fuga' } },
                }),
                'assign to array': () => {
                    const str = 'foo\n  bar\n  ';
                    return {
                        templateLines: [
                            `{%- set foo = [] -%}`,
                            `{%- setProp foo[0] %}${str}{% ${endBlockName} -%}`,
                            `{{ { foo:foo } | dump(2) }}`,
                        ],
                        expectedContext: { foo: [str] },
                    };
                },
                'assign to multiple properties': () => {
                    const str = 'foo\n  bar\n  ';

                    const templateLines = [
                        `{%- set foo = {} -%}`,
                        `{%- set bar = { baz: {} } -%}`,
                        `{%- setProp foo.one, bar.two, bar.baz.three, bar.four %}${str}{% ${endBlockName} -%}`,
                        `{{ { foo:foo, bar:bar } | dump(2) }}`,
                    ];

                    const expectedContext = {
                        foo: {},
                        bar: { baz: {} },
                    };
                    Object.assign(expectedContext.foo, { one: str });
                    Object.assign(expectedContext.bar, { two: str });
                    Object.assign(expectedContext.bar.baz, { three: str });
                    Object.assign(expectedContext.bar, { four: str });

                    return { templateLines, expectedContext };
                },
                'assign to property of expression result': () => {
                    const prop = 'woo';
                    const str = 'foo\n  bar\n  ';
                    return {
                        templateLines: [
                            `{%- set foo = {} -%}`,
                            `{%- set prop = ${JSON.stringify(prop)} -%}`,
                            `{%- setProp foo[prop | upper] %}${str}{% ${endBlockName} -%}`,
                            `{{ { foo:foo } | dump(2) }}`,
                        ],
                        expectedContext: {
                            foo: { [prop.toUpperCase()]: str },
                        },
                    };
                },
                'assign to object of expression result': () => {
                    const str = 'foo\n  bar\n  ';
                    return {
                        templateLines: [
                            `{%- set foo = {} -%}`,
                            `{%- setProp [foo][0].bar %}${str}{% ${endBlockName} -%}`,
                            `{{ { foo:foo } | dump(2) }}`,
                        ],
                        expectedContext: {
                            foo: { bar: str },
                        },
                    };
                },
                'trim contents': () => {
                    const str = {
                        ws: '  str  ',
                        lb: '\nstr\n',
                        wslb: '\n  str  \n',
                    } as const;
                    return {
                        templateLines: [
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
                        expectedContext: {
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
                        },
                    };
                },
            };
            it.each(Object.entries(table))('%s', async (_, fn) => {
                const { templateLines, expectedContext } = fn();
                const templateText = templateLines.join('\n');

                const result = renderNunjucksWithFrontmatter(
                    templateText,
                    {},
                    { cwd: '.', filters: {}, extensions: [SetPropExtension] },
                );

                await expect(result).resolves
                    .toBe(JSON.stringify(expectedContext, null, 2));
            });

            it('define variable', async () => {
                const desc = 'foo\nbar\nbaz\n';

                const cwd = await createTmpDir(__filename, `${idPrefix}/def-var`);
                await expect(writeFilesAsync(cwd, {
                    'description.txt': desc,
                })).toResolve();
                const templateText = [
                    `{%- setProp desc %}`,
                    `  {% include 'description.txt' %}`,
                    `{% ${endBlockName} -%}`,
                    `{{ { desc:desc } | dump(2) }}`,
                ].join('\n');

                const result = renderNunjucksWithFrontmatter(
                    templateText,
                    {},
                    { cwd, filters: {}, extensions: [SetPropExtension] },
                );

                const expectedContext = { desc: `\n  ${desc}\n` };
                await expect(result).resolves
                    .toBe(JSON.stringify(expectedContext, null, 2));
            });

            describe('overwrite defined variable', () => {
                const tests = [
                    'set',
                    'setProp',
                ];

                it.each(tests)('%s tag', async tagName => {
                    const val = String(Math.random());

                    const templateText = [
                        `{%- ${tagName} foo = null -%}`,
                        `{{ { foo:foo } | dump(2) }}`,
                        `{% setProp foo %}${val}{% ${endBlockName} -%}`,
                        `{{ { foo:foo } | dump(2) }}`,
                    ].join('\n');

                    const result = renderNunjucksWithFrontmatter(
                        templateText,
                        {},
                        { cwd: '.', filters: {}, extensions: [SetPropExtension] },
                    );

                    await expect(result).resolves.toBe([
                        JSON.stringify({ foo: null }, null, 2),
                        JSON.stringify({ foo: val }, null, 2),
                    ].join('\n'));
                });
            });
        });
    });

    describe('expression evaluation order', () => {
        describe('only once execute', () => {
            const table = {
                'variable name first': {
                    initTemplate: `{%- set baz = {} -%}{%- set qux = {} -%}`,
                    args: `foo, bar, baz.hoge, qux.fuga, quux`,
                    expectedContext: {
                        foo: undefined,
                        bar: undefined,
                        baz: { hoge: undefined },
                        qux: { fuga: undefined },
                        quux: undefined,
                    },
                },
                'variable reference first': {
                    initTemplate: `{%- set foo = [] -%}{%- set qux = {} -%}`,
                    args: `foo[0], foo[1], bar, baz, qux.fuga, qux.hogefuga, quux`,
                    expectedContext: {
                        foo: [undefined, undefined],
                        bar: undefined,
                        baz: undefined,
                        qux: { fuga: undefined, hogefuga: undefined },
                        quux: undefined,
                    },
                },
            };

            describe.each(Object.entries(table))('%s', (_, {
                args,
                initTemplate,
                expectedContext,
            }) => {
                const dumpTemplate = `{{ { ${
                    Object.keys(expectedContext)
                        .map(k => `${k}: ${k}`)
                        .join(', ')
                } } | dump(2) }}`;

                it('expression', async () => {
                    const templateText = [
                        `{%- set count = cycler(1, 2, 3, 4, 5, 6, 7, 8, 9) -%}`,
                        initTemplate,
                        `{%- setProp ${args} = { count: count.next() } -%}`,
                        dumpTemplate,
                    ].join('\n');

                    const result = renderNunjucksWithFrontmatter(
                        templateText,
                        {},
                        { cwd: '.', filters: {}, extensions: [SetPropExtension] },
                    );

                    await expect(result).resolves.toBe(JSON.stringify(
                        expectedContext,
                        (_, value) => value === undefined ? { count: 1 } : value,
                        2,
                    ));
                });

                it('contents of a block', async () => {
                    const templateText = [
                        `{%- set count = cycler(1, 2, 3, 4, 5, 6, 7, 8, 9) -%}`,
                        initTemplate,
                        `{%- setProp ${args} -%}`,
                        `count: {{ count.next() }}`,
                        `{%- endset -%}`,
                        dumpTemplate,
                    ].join('\n');

                    const result = renderNunjucksWithFrontmatter(
                        templateText,
                        {},
                        { cwd: '.', filters: {}, extensions: [SetPropExtension] },
                    );

                    await expect(result).resolves.toBe(JSON.stringify(
                        expectedContext,
                        (_, value) => value === undefined ? 'count: 1' : value,
                        2,
                    ));
                });
            });
        });

        it('properties', async () => {
            const templateText = [
                `{%- setProp foo,`,
                `            foo.list[foo.list.length], foo.list[foo.list.length],`,
                `            bar,`,
                `            foo.list[foo.list.length] = { list: [] } -%}`,
                `{{ { fooListLength:foo.list.length } | dump(2) }}`,
            ].join('\n');

            const result = renderNunjucksWithFrontmatter(
                templateText,
                {},
                { cwd: '.', filters: {}, extensions: [SetPropExtension] },
            );

            const expectedContext = { fooListLength: 3 };
            await expect(result).resolves
                .toBe(JSON.stringify(expectedContext, null, 2));
        });
    });

    describe('invalid syntax', () => {
        describe('not variabre name reference', () => {
            const table = [
                {
                    exp: `\v42`,
                },
                {
                    exp: `\vr/^foo.*/`,
                },
                {
                    exp: `\v(foo.baz)`,
                },
                {
                    exp: `\v[foo, bar]`,
                },
                {
                    exp: `\v{ foo: bar }`,
                },
                {
                    name: 'func()',
                    exp: `foo.baz\v()`,
                },
            ];

            it.each(table.map(item => [item.name ?? item.exp.replace(/\v/g, ''), item] as const))(
                '%s',
                async (_, { exp }) => {
                    const { templateText, line, col } = strAndPos([
                        `{% setProp foo.bar, ${exp} = true %}`,
                    ]);

                    const result = renderNunjucksWithFrontmatter(
                        templateText,
                        {},
                        { cwd: '.', filters: {}, extensions: [SetPropExtension] },
                    );
                    await expect(result).rejects.toThrow([
                        `(unknown path) [Line ${line}, Column ${col}]`,
                        `  SetPropExtension#parse: expected variable name or variable reference in setProp tag`,
                    ].join('\n'));
                },
            );
        });

        describe('no variabres', () => {
            const table: FailTable = {
                'end of block': () => {
                    const { templateText, line, col } = strAndPos([
                        `{% setProp     \v%}`,
                    ]);
                    return {
                        templateText,
                        expectedErrorMessageLines: [
                            `(unknown path) [Line ${line}, Column ${col}]`,
                            `  SetPropExtension#parse: expected one or more variable in setProp tag, got no variable`,
                        ],
                    };
                },
                'end of file': () => {
                    return {
                        templateText: `{% setProp     `,
                        expectedErrorMessageLines: [
                            `(unknown path)`,
                            `  SetPropExtension#parse: expected one or more variable in setProp tag, got end of file`,
                        ],
                    };
                },
            };
            it.each(Object.entries(table))('%s', async (_, fn) => {
                const { templateText, expectedErrorMessageLines } = fn();

                const result = renderNunjucksWithFrontmatter(
                    templateText,
                    {},
                    { cwd: '.', filters: {}, extensions: [SetPropExtension] },
                );
                await expect(result).rejects.toThrow(expectedErrorMessageLines.join('\n'));
            });
        });

        describe('no expression', () => {
            const table: FailTable = {
                'end of block': () => {
                    const { templateText, line, col } = strAndPos([
                        `{% setProp foo.bar = \v%}`,
                    ]);
                    return {
                        templateText,
                        expectedErrorMessageLines: [
                            `(unknown path) [Line ${line}, Column ${col}]`,
                            `  SetPropExtension#parse: expected expression in setProp tag, got unexpected token: %}`,
                        ],
                    };
                },
                'end of file': () => {
                    return {
                        templateText: `{% setProp foo.bar =     `,
                        expectedErrorMessageLines: [
                            `(unknown path)`,
                            `  SetPropExtension#parse: expected expression in setProp tag, got end of file`,
                        ],
                    };
                },
            };
            it.each(Object.entries(table))('%s', async (_, fn) => {
                const { templateText, expectedErrorMessageLines } = fn();

                const result = renderNunjucksWithFrontmatter(
                    templateText,
                    {},
                    { cwd: '.', filters: {}, extensions: [SetPropExtension] },
                );
                await expect(result).rejects.toThrow(expectedErrorMessageLines.join('\n'));
            });
        });

        const table: FailTable = {
            'no tag end': () => {
                const { templateText, line, col } = strAndPos([
                    `{% setProp foo.bar   \v`,
                ]);
                return {
                    templateText,
                    expectedErrorMessageLines: [
                        `(unknown path) [Line ${line}, Column ${col}]`,
                        `  SetPropExtension#parse: expected = or block end in setProp tag`,
                    ],
                };
            },
            'no end tag': () => {
                return {
                    templateText: `{% setProp foo.bar %}`,
                    expectedErrorMessageLines: [
                        `(unknown path)`,
                        `  SetPropExtension#parse: unexpected end of file. expected "endsetProp" or "endset" block after setProp tag`,
                    ],
                };
            },
            'missing comma': () => {
                const { templateText, line, col } = strAndPos([
                    `{% setProp foo.bar, a.b \vxxx.yyy, hoge = 42 %}`,
                ]);
                return {
                    templateText,
                    expectedErrorMessageLines: [
                        `(unknown path) [Line ${line}, Column ${col}]`,
                        `  SetPropExtension#parse: expected \`,\` or = in setProp tag`,
                    ],
                };
            },
            'extra comma': () => {
                const { templateText, line, col } = strAndPos([
                    `{% setProp foo.bar, a.b , \v, xxx.yyy, hoge = 42 %}`,
                ]);
                return {
                    templateText,
                    expectedErrorMessageLines: [
                        `(unknown path) [Line ${line}, Column ${col}]`,
                        `  SetPropExtension#parse: expected variable name or variable reference in setProp tag`,
                    ],
                };
            },
            'trailing comma': () => {
                const { templateText, line, col } = strAndPos([
                    `{% setProp foo.bar, a.b, xxx.yyy, hoge , \v= 42 %}`,
                ]);
                return {
                    templateText,
                    expectedErrorMessageLines: [
                        `(unknown path) [Line ${line}, Column ${col}]`,
                        `  SetPropExtension#parse: expected variable name or variable reference in setProp tag`,
                    ],
                };
            },
            'comma only': () => {
                const { templateText, line, col } = strAndPos([
                    `{% setProp \v, = 42 %}`,
                ]);
                return {
                    templateText,
                    expectedErrorMessageLines: [
                        `(unknown path) [Line ${line}, Column ${col}]`,
                        `  SetPropExtension#parse: expected variable name or variable reference in setProp tag`,
                    ],
                };
            },
        };
        it.each(Object.entries(table))('%s', async (_, fn) => {
            const { templateText, expectedErrorMessageLines } = fn();

            const result = renderNunjucksWithFrontmatter(
                templateText,
                {},
                { cwd: '.', filters: {}, extensions: [SetPropExtension] },
            );
            await expect(result).rejects.toThrow(expectedErrorMessageLines.join('\n'));
        });
    });

    describe('assign error', () => {
        const table: FailTable = {
            'undefined variable': () => {
                const { templateText, line, col } = strAndPos([
                    `{% setProp foo\v.bar = 42 %}`,
                ]);
                return {
                    templateText,
                    expectedErrorMessageLines: [
                        `(unknown path) [Line ${line}, Column ${col}]`,
                        `  TypeError: setProp tag / Cannot be assigned to \`foo.bar\`! \`foo\` variable value is undefined, not an object`,
                    ],
                };
            },
            'undefined child variable': () => {
                const { templateText, line, col } = strAndPos([
                    `{% set foo = {} %}`,
                    `{% setProp foo["ba-r"]\v.baz = 42 %}`,
                ]);
                return {
                    templateText,
                    expectedErrorMessageLines: [
                        `(unknown path) [Line ${line}, Column ${col}]`,
                        `  TypeError: setProp tag / Cannot be assigned to \`foo['ba-r'].baz\`! \`foo['ba-r']\` variable value is undefined, not an object`,
                    ],
                };
            },
            'undefined grandchild variable': () => {
                const { templateText, line, col } = strAndPos([
                    `{% set foo = {} %}`,
                    `{% setProp foo["ba-r"]\v.baz.qux['ほげ'] = 42 %}`,
                ]);
                return {
                    templateText,
                    expectedErrorMessageLines: [
                        `(unknown path) [Line ${line}, Column ${col}]`,
                        `  TypeError: setProp tag / Cannot be assigned to \`foo['ba-r'].baz.qux.ほげ\`! \`foo['ba-r']\` variable value is undefined, not an object`,
                    ],
                };
            },
            'null variable': () => {
                const { templateText, line, col } = strAndPos([
                    `{% set foo = null %}`,
                    `{% setProp foo\v['bar'] = 42 %}`,
                ]);
                return {
                    templateText,
                    expectedErrorMessageLines: [
                        `(unknown path) [Line ${line}, Column ${col}]`,
                        `  TypeError: setProp tag / Cannot be assigned to \`foo.bar\`! \`foo\` variable value is null, not an object`,
                    ],
                };
            },
            'number variable': () => {
                const { templateText, line, col } = strAndPos([
                    `{% set foo = 42 %}`,
                    ``,
                    `{% setProp foo\v.bar = 42 %}`,
                ]);
                return {
                    templateText,
                    expectedErrorMessageLines: [
                        `(unknown path) [Line ${line}, Column ${col}]`,
                        `  TypeError: setProp tag / Cannot be assigned to \`foo.bar\`! \`foo\` variable value is number, not an object`,
                    ],
                };
            },
        };
        it.each(Object.entries(table))('%s', async (_, fn) => {
            const { templateText, expectedErrorMessageLines } = fn();

            const result = renderNunjucksWithFrontmatter(
                templateText,
                {},
                { cwd: '.', filters: {}, extensions: [SetPropExtension] },
            );
            await expect(result).rejects.toThrow(expectedErrorMessageLines.join('\n'));
        });
    });
});
