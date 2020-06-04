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
            });
        }
    });
});
