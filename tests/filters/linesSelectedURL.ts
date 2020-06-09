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

import hostedGitInfo = require('hosted-git-info');

const dataRecord: Record<hostedGitInfo.Hosts, { singleLineTemplate: string; multiLineTemplate: string }> = {
    github: {
        singleLineTemplate: `#L1`,
        multiLineTemplate: `#L1-L9`,
    },
    gitlab: {
        singleLineTemplate: `#L1`,
        multiLineTemplate: `#L1-9`,
    },
    bitbucket: {
        singleLineTemplate: `#lines-1`,
        multiLineTemplate: `#lines-1:9`,
    },
    gist: {
        singleLineTemplate: `-L1`,
        multiLineTemplate: `-L1-L9`,
    },
};

function replaceTemplate(
    lineTemplate: typeof dataRecord[keyof typeof dataRecord],
    startLine: number,
    endLine?: number,
): string {
    if (typeof endLine === 'number' && startLine !== endLine) {
        return lineTemplate.multiLineTemplate
            .replace(/[19]/g, match =>
                String(
                    match === '1'
                        ? Math.min(startLine, endLine)
                        : Math.max(startLine, endLine),
                ));
    } else {
        return lineTemplate.singleLineTemplate
            .replace(/[19]/g, String(startLine));
    }
}

describe('linesSelectedURL', () => {
    const textLines = [
        `0001`,
        `0002`,
        `0003`,
        `0004`,
        `0005`,
        `0006`,
        `0007`,
        `0008`,
        `0009`,
    ];

    describe('basic', () => {
        for (const [repoType, lineTemplate] of Object.entries(dataRecord)) {
            // eslint-disable-next-line jest/valid-title
            it(repoType, async () => {
                const cwd = await createTmpDir(__filename, `basic/${repoType}`);
                const filedata = {
                    repoType,
                    fileFullpath: path.resolve(cwd, 'text.txt'),
                    browseURL: `http://example.com/usr/repo/tree/master/text.txt`,
                };
                await writeFilesAsync(cwd, {
                    'text.txt': textLines,
                    [DEFAULT_TEMPLATE_NAME]: [
                        `---`,
                        `filedata: ${JSON.stringify(filedata)}`,
                        `---`,
                        String.raw`{{ filedata | linesSelectedURL(r/2/) }}`,
                        String.raw`{{ filedata | linesSelectedURL(start=r/5/) }}`,
                        String.raw`{{ filedata | linesSelectedURL(start=r/3/, end=r/8/) }}`,
                    ],
                });

                await expect(execCli(cwd, [])).resolves.toMatchObject({
                    exitCode: 0,
                    stdout: '',
                    stderr: genWarn({ pkg: true, pkgLock: true }),
                });

                await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe([
                    filedata.browseURL + replaceTemplate(lineTemplate, 2),
                    filedata.browseURL + replaceTemplate(lineTemplate, 5),
                    filedata.browseURL + replaceTemplate(lineTemplate, 3, 8),
                ].join('\n'));
            });
        }
    });

    it('one regex', async () => {
        const cwd = await createTmpDir(__filename, `basic/one-regex`);
        const filedata = {
            repoType: 'github',
            fileFullpath: path.resolve(cwd, 'text.txt'),
            browseURL: `http://example.com/usr/repo/tree/master/text.txt`,
        } as const;
        const lineTemplate = dataRecord[filedata.repoType];

        await writeFilesAsync(cwd, {
            'text.txt': textLines,
            [DEFAULT_TEMPLATE_NAME]: [
                `---`,
                `filedata: ${JSON.stringify(filedata)}`,
                `---`,
                String.raw`{{ filedata | linesSelectedURL(r/2/) }}`,
                String.raw`{{ filedata | linesSelectedURL(r/2\n/) }}`,
                ``,
                String.raw`{{ filedata | linesSelectedURL(r/^0*5[\s\S]*?$/) }}`,
                String.raw`{{ filedata | linesSelectedURL(r/^0*5[\s\S]*?$/m) }}`,
            ],
        });

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkg: true, pkgLock: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe([
            filedata.browseURL + replaceTemplate(lineTemplate, 2),
            filedata.browseURL + replaceTemplate(lineTemplate, 2, 3),
            ``,
            filedata.browseURL + replaceTemplate(lineTemplate, 5, textLines.length),
            filedata.browseURL + replaceTemplate(lineTemplate, 5),
        ].join('\n'));
    });

    it('start argument only', async () => {
        const cwd = await createTmpDir(__filename, `basic/start-arg-only`);
        const filedata = {
            repoType: 'github',
            fileFullpath: path.resolve(cwd, 'text.txt'),
            browseURL: `http://example.com/usr/repo/tree/master/text.txt`,
        } as const;
        const lineTemplate = dataRecord[filedata.repoType];

        await writeFilesAsync(cwd, {
            'text.txt': textLines,
            [DEFAULT_TEMPLATE_NAME]: [
                `---`,
                `filedata: ${JSON.stringify(filedata)}`,
                `---`,
                String.raw`{{ filedata | linesSelectedURL(start=r/2/) }}`,
                String.raw`{{ filedata | linesSelectedURL(start=r/2\n/) }}`,
            ],
        });

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkg: true, pkgLock: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe([
            filedata.browseURL + replaceTemplate(lineTemplate, 2),
            filedata.browseURL + replaceTemplate(lineTemplate, 3),
        ].join('\n'));
    });

    it('start and end arguments', async () => {
        const cwd = await createTmpDir(__filename, `basic/start+end-args`);
        const filedata = {
            repoType: 'github',
            fileFullpath: path.resolve(cwd, 'text.txt'),
            browseURL: `http://example.com/usr/repo/tree/master/text.txt`,
        } as const;
        const lineTemplate = dataRecord[filedata.repoType];

        await writeFilesAsync(cwd, {
            'text.txt': textLines,
            [DEFAULT_TEMPLATE_NAME]: [
                `---`,
                `filedata: ${JSON.stringify(filedata)}`,
                `---`,
                String.raw`{{ filedata | linesSelectedURL(start=r/2/, end=r/6/) }}`,
                String.raw`{{ filedata | linesSelectedURL(start=r/2\n/, end=r/6/) }}`,
                String.raw`{{ filedata | linesSelectedURL(start=r/2/, end=r/6\n/) }}`,
                String.raw`{{ filedata | linesSelectedURL(start=r/2\n/, end=r/6\n/) }}`,
                ``,
                String.raw`{{ filedata | linesSelectedURL(start=r/^0*5/, end=r/$/) }}`,
                String.raw`{{ filedata | linesSelectedURL(start=r/^0*5/, end=r/$/m) }}`,
                ``,
                String.raw`{{ filedata | linesSelectedURL(start=r/^/, end=r/$/) }}`,
                String.raw`{{ filedata | linesSelectedURL(start=r/^/, end=r/$/m) }}`,
            ],
        });

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 0,
            stdout: '',
            stderr: genWarn({ pkg: true, pkgLock: true }),
        });

        await expect(readFileAsync(path.join(cwd, 'README.md'), 'utf8')).resolves.toBe([
            filedata.browseURL + replaceTemplate(lineTemplate, 2, 6),
            filedata.browseURL + replaceTemplate(lineTemplate, 3, 6),
            filedata.browseURL + replaceTemplate(lineTemplate, 2, 7),
            filedata.browseURL + replaceTemplate(lineTemplate, 3, 7),
            ``,
            filedata.browseURL + replaceTemplate(lineTemplate, 5, textLines.length),
            filedata.browseURL + replaceTemplate(lineTemplate, 5),
            ``,
            filedata.browseURL + replaceTemplate(lineTemplate, 1, textLines.length),
            filedata.browseURL + replaceTemplate(lineTemplate, 1),
        ].join('\n'));
    });

    it('invalid data', async () => {
        const cwd = await createTmpDir(__filename, 'invalid-data');
        await writeFilesAsync(cwd, {
            [DEFAULT_TEMPLATE_NAME]: `{{ 42 | linesSelectedURL(r/4/) }}`,
        });

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 1,
            stdout: '',
            stderr: [
                genWarn({ pkg: true, pkgLock: true }),
                `(unknown path)`,
                `  TypeError: linesSelectedURL() filter / Invalid repoData value: 42`,
            ].join('\n'),
        });

        await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
    });

    it('invalid repoType', async () => {
        const cwd = await createTmpDir(__filename, 'invalid-repo-type');
        const filedata = {
            repoType: 'xxx-git',
            fileFullpath: path.resolve(cwd, 'text.txt'),
            browseURL: `http://example.com/usr/repo/tree/master/text.txt`,
        };
        await writeFilesAsync(cwd, {
            'text.txt': textLines,
            [DEFAULT_TEMPLATE_NAME]: [
                `---`,
                `filedata: ${JSON.stringify(filedata)}`,
                `---`,
                `{{ filedata | linesSelectedURL(r/4/) }}`,
            ],
        });

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 1,
            stdout: '',
            stderr: [
                genWarn({ pkg: true, pkgLock: true }),
                `(unknown path)`,
                `  Error: linesSelectedURL() filter / Unknown repoData.repoType value: 'xxx-git'`,
            ].join('\n'),
        });

        await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
    });

    describe('invalid arguments', () => {
        it('empty option', async () => {
            const cwd = await createTmpDir(
                __filename,
                'invalid-args/empty-opts',
            );
            const filedata = {
                repoType: 'github',
                fileFullpath: path.resolve(cwd, 'text.txt'),
                browseURL: `http://example.com/usr/repo/tree/master/text.txt`,
            };
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: [
                    `---`,
                    `filedata: ${JSON.stringify(filedata)}`,
                    `---`,
                    String.raw`{{ filedata | linesSelectedURL }}`,
                ],
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: [
                    genWarn({ pkg: true, pkgLock: true }),
                    `(unknown path)`,
                    `  TypeError: linesSelectedURL() filter / Invalid options value: undefined`,
                ].join('\n'),
            });

            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
        });

        it('invalid type option', async () => {
            const cwd = await createTmpDir(
                __filename,
                'invalid-args/invalid-type-opts',
            );
            const filedata = {
                repoType: 'github',
                fileFullpath: path.resolve(cwd, 'text.txt'),
                browseURL: `http://example.com/usr/repo/tree/master/text.txt`,
            };
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: [
                    `---`,
                    `filedata: ${JSON.stringify(filedata)}`,
                    `---`,
                    String.raw`{{ filedata | linesSelectedURL(42) }}`,
                ],
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: [
                    genWarn({ pkg: true, pkgLock: true }),
                    `(unknown path)`,
                    `  TypeError: linesSelectedURL() filter / Invalid options value: 42`,
                ].join('\n'),
            });

            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
        });

        it('end argument only', async () => {
            const cwd = await createTmpDir(
                __filename,
                'invalid-args/end-arg-only',
            );
            const filedata = {
                repoType: 'github',
                fileFullpath: path.resolve(cwd, 'text.txt'),
                browseURL: `http://example.com/usr/repo/tree/master/text.txt`,
            };
            await writeFilesAsync(cwd, {
                [DEFAULT_TEMPLATE_NAME]: [
                    `---`,
                    `filedata: ${JSON.stringify(filedata)}`,
                    `---`,
                    String.raw`{{ filedata | linesSelectedURL(end=r/6/) }}`,
                ],
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: [
                    genWarn({ pkg: true, pkgLock: true }),
                    `(unknown path)`,
                    `  TypeError: linesSelectedURL() filter / Invalid options value: { end: /6/, __keywords: true }`,
                ].join('\n'),
            });

            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
        });
    });

    it('file not exist', async () => {
        const cwd = await createTmpDir(__filename, 'file-not-exist');
        const filedata = {
            repoType: 'github',
            fileFullpath: path.resolve(cwd, 'text.txt'),
            browseURL: `http://example.com/usr/repo/tree/master/text.txt`,
        };
        await writeFilesAsync(cwd, {
            [DEFAULT_TEMPLATE_NAME]: [
                `---`,
                `filedata: ${JSON.stringify(filedata)}`,
                `---`,
                String.raw`{{ filedata | linesSelectedURL(r/3/) }}`,
            ],
        });

        await expect(execCli(cwd, [])).resolves.toMatchObject({
            exitCode: 1,
            stdout: '',
            stderr: [
                genWarn({ pkg: true, pkgLock: true }),
                `(unknown path)`,
                `  Error: linesSelectedURL() filter / ENOENT: no such file or directory, open 'text.txt'`,
            ].join('\n'),
        });

        await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
    });

    describe('non match', () => {
        it('one regex', async () => {
            const cwd = await createTmpDir(__filename, 'non-match/one-regex');
            const filedata = {
                repoType: 'github',
                fileFullpath: path.resolve(cwd, 'text.txt'),
                browseURL: `http://example.com/usr/repo/tree/master/text.txt`,
            };
            await writeFilesAsync(cwd, {
                'text.txt': textLines,
                [DEFAULT_TEMPLATE_NAME]: [
                    `---`,
                    `filedata: ${JSON.stringify(filedata)}`,
                    `---`,
                    String.raw`{{ filedata | linesSelectedURL(r/(?!)/) }}`,
                ],
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: [
                    genWarn({ pkg: true, pkgLock: true }),
                    `(unknown path)`,
                    `  Error: linesSelectedURL() filter / RegExp does not match with 'text.txt' contents. The following pattern was passed in the argument: /(?!)/`,
                ].join('\n'),
            });

            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
        });

        it('start argument', async () => {
            const cwd = await createTmpDir(__filename, 'non-match/start-arg');
            const filedata = {
                repoType: 'github',
                fileFullpath: path.resolve(cwd, 'text.txt'),
                browseURL: `http://example.com/usr/repo/tree/master/text.txt`,
            };
            await writeFilesAsync(cwd, {
                'text.txt': textLines,
                [DEFAULT_TEMPLATE_NAME]: [
                    `---`,
                    `filedata: ${JSON.stringify(filedata)}`,
                    `---`,
                    String.raw`{{ filedata | linesSelectedURL(start=r/(?!)/) }}`,
                ],
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: [
                    genWarn({ pkg: true, pkgLock: true }),
                    `(unknown path)`,
                    `  Error: linesSelectedURL() filter / RegExp does not match with 'text.txt' contents. The following pattern was passed in the options.start argument: /(?!)/`,
                ].join('\n'),
            });

            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
        });

        it('end argument', async () => {
            const cwd = await createTmpDir(__filename, 'non-match/end-arg');
            const filedata = {
                repoType: 'github',
                fileFullpath: path.resolve(cwd, 'text.txt'),
                browseURL: `http://example.com/usr/repo/tree/master/text.txt`,
            };
            await writeFilesAsync(cwd, {
                'text.txt': textLines,
                [DEFAULT_TEMPLATE_NAME]: [
                    `---`,
                    `filedata: ${JSON.stringify(filedata)}`,
                    `---`,
                    String.raw`{{ filedata | linesSelectedURL(start=r/^/, end=r/(?!)/) }}`,
                ],
            });

            await expect(execCli(cwd, [])).resolves.toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: [
                    genWarn({ pkg: true, pkgLock: true }),
                    `(unknown path)`,
                    `  Error: linesSelectedURL() filter / RegExp does not match with 'text.txt' contents. The following pattern was passed in the options.end argument: /(?!)/`,
                ].join('\n'),
            });

            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
        });
    });
});
