import * as path from 'path';

import type hostedGitInfo from 'hosted-git-info';

import { renderNunjucksWithFrontmatter } from '../../src/renderer';
import { linesSelectedURL, RepoData } from '../../src/template-filters/linesSelectedURL';

interface LineTemplate {
    singleLineTemplate: string;
    multiLineTemplate: string;
}
const dataRecord: Record<hostedGitInfo.Hosts, LineTemplate> = {
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
    lineTemplate: LineTemplate,
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
    const textLinesFilepath = 'tests/filters/fixtures.linesSelectedURL/text.txt';
    const textLinesFileFullpath = path.resolve(textLinesFilepath);

    describe('basic', () => {
        it.each(Object.entries(dataRecord))('%s', async (repoType, lineTemplate) => {
            const filedata = {
                repoType,
                fileFullpath: textLinesFileFullpath,
                browseURL: `http://example.com/usr/repo/tree/master/text.txt`,
            };
            const templateText = [
                `---`,
                `filedata: ${JSON.stringify(filedata)}`,
                `---`,
                `{{ filedata | linesSelectedURL(r/2/) }}`,
                `{{ filedata | linesSelectedURL(start=r/5/) }}`,
                `{{ filedata | linesSelectedURL(start=r/3/, end=r/8/) }}`,
            ].join('\n');

            const result = renderNunjucksWithFrontmatter(
                templateText,
                {},
                { cwd: '.', filters: { linesSelectedURL }, extensions: [] },
            );
            await expect(result).resolves.toBe([
                filedata.browseURL + replaceTemplate(lineTemplate, 2),
                filedata.browseURL + replaceTemplate(lineTemplate, 5),
                filedata.browseURL + replaceTemplate(lineTemplate, 3, 8),
            ].join('\n'));
        });
    });

    const table: ReadonlyArray<
        readonly [
            string,
            {
                templateLines: (arg: { filedata: RepoData }) => string[];
                expected: (arg: { filedata: RepoData; lineTemplate: LineTemplate }) => string[];
            },
        ]
    > = [
        ['one regex', {
            templateLines: ({ filedata }) => [
                `---`,
                `filedata: ${JSON.stringify(filedata)}`,
                `---`,
                String.raw`{{ filedata | linesSelectedURL(r/2/) }}`,
                String.raw`{{ filedata | linesSelectedURL(r/2\n/) }}`,
                ``,
                String.raw`{{ filedata | linesSelectedURL(r/^0*5[\s\S]*?$/) }}`,
                String.raw`{{ filedata | linesSelectedURL(r/^0*5[\s\S]*?$/m) }}`,
            ],
            expected: ({ filedata, lineTemplate }) => [
                filedata.browseURL + replaceTemplate(lineTemplate, 2),
                filedata.browseURL + replaceTemplate(lineTemplate, 2, 3),
                ``,
                filedata.browseURL + replaceTemplate(lineTemplate, 5, 9),
                filedata.browseURL + replaceTemplate(lineTemplate, 5),
            ],
        }],
        ['start argument only', {
            templateLines: ({ filedata }) => [
                `---`,
                `filedata: ${JSON.stringify(filedata)}`,
                `---`,
                String.raw`{{ filedata | linesSelectedURL(start=r/2/) }}`,
                String.raw`{{ filedata | linesSelectedURL(start=r/2\n/) }}`,
            ],
            expected: ({ filedata, lineTemplate }) => [
                filedata.browseURL + replaceTemplate(lineTemplate, 2),
                filedata.browseURL + replaceTemplate(lineTemplate, 3),
            ],
        }],
        ['start and end arguments', {
            templateLines: ({ filedata }) => [
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
            expected: ({ filedata, lineTemplate }) => [
                filedata.browseURL + replaceTemplate(lineTemplate, 2, 6),
                filedata.browseURL + replaceTemplate(lineTemplate, 3, 6),
                filedata.browseURL + replaceTemplate(lineTemplate, 2, 7),
                filedata.browseURL + replaceTemplate(lineTemplate, 3, 7),
                ``,
                filedata.browseURL + replaceTemplate(lineTemplate, 5, 9),
                filedata.browseURL + replaceTemplate(lineTemplate, 5),
                ``,
                filedata.browseURL + replaceTemplate(lineTemplate, 1, 9),
                filedata.browseURL + replaceTemplate(lineTemplate, 1),
            ],
        }],
    ];
    it.each(table)('%s', async (_, { templateLines, expected }) => {
        const filedata = {
            repoType: 'github',
            fileFullpath: textLinesFileFullpath,
            browseURL: `http://example.com/usr/repo/tree/master/text.txt`,
        } as const;
        const lineTemplate = dataRecord[filedata.repoType];
        const templateText = templateLines({ filedata }).join('\n');

        const result = renderNunjucksWithFrontmatter(
            templateText,
            {},
            { cwd: '.', filters: { linesSelectedURL }, extensions: [] },
        );
        await expect(result).resolves.toBe(expected({ filedata, lineTemplate }).join('\n'));
    });

    it('invalid data', async () => {
        const templateText = `{{ 42 | linesSelectedURL(r/4/) }}`;

        const result = renderNunjucksWithFrontmatter(
            templateText,
            {},
            { cwd: '.', filters: { linesSelectedURL }, extensions: [] },
        );
        await expect(result).rejects.toThrow([
            `(unknown path)`,
            `  TypeError: linesSelectedURL() filter / Invalid repoData value: 42`,
        ].join('\n'));
    });

    it('invalid repoType', async () => {
        const filedata = {
            repoType: 'xxx-git',
            fileFullpath: textLinesFileFullpath,
            browseURL: `http://example.com/usr/repo/tree/master/text.txt`,
        };
        const templateText = [
            `---`,
            `filedata: ${JSON.stringify(filedata)}`,
            `---`,
            `{{ filedata | linesSelectedURL(r/4/) }}`,
        ].join('\n');

        const result = renderNunjucksWithFrontmatter(
            templateText,
            {},
            { cwd: '.', filters: { linesSelectedURL }, extensions: [] },
        );
        await expect(result).rejects.toThrow([
            `(unknown path)`,
            `  Error: linesSelectedURL() filter / Unknown repoData.repoType value: 'xxx-git'`,
        ].join('\n'));
    });

    describe('invalid arguments', () => {
        const table: ReadonlyArray<
            readonly [
                string,
                {
                    templateLines: (arg: { filedata: RepoData }) => string[];
                    expected: readonly string[];
                },
            ]
        > = [
            ['empty option', {
                templateLines: ({ filedata }) => [
                    `---`,
                    `filedata: ${JSON.stringify(filedata)}`,
                    `---`,
                    `{{ filedata | linesSelectedURL }}`,
                ],
                expected: [
                    `(unknown path)`,
                    `  TypeError: linesSelectedURL() filter / Invalid options value: undefined`,
                ],
            }],
            ['invalid type option', {
                templateLines: ({ filedata }) => [
                    `---`,
                    `filedata: ${JSON.stringify(filedata)}`,
                    `---`,
                    `{{ filedata | linesSelectedURL(42) }}`,
                ],
                expected: [
                    `(unknown path)`,
                    `  TypeError: linesSelectedURL() filter / Invalid options value: 42`,
                ],
            }],
            ['end argument only', {
                templateLines: ({ filedata }) => [
                    `---`,
                    `filedata: ${JSON.stringify(filedata)}`,
                    `---`,
                    `{{ filedata | linesSelectedURL(end=r/6/) }}`,
                ],
                expected: [
                    `(unknown path)`,
                    `  TypeError: linesSelectedURL() filter / Invalid options value: { end: /6/, __keywords: true }`,
                ],
            }],
        ];
        it.each(table)('%s', async (_, { templateLines, expected }) => {
            const filedata = {
                repoType: 'github',
                fileFullpath: textLinesFileFullpath,
                browseURL: `http://example.com/usr/repo/tree/master/text.txt`,
            } as const;
            const templateText = templateLines({ filedata }).join('\n');

            const result = renderNunjucksWithFrontmatter(
                templateText,
                {},
                { cwd: '.', filters: { linesSelectedURL }, extensions: [] },
            );
            await expect(result).rejects.toThrow(expected.join('\n'));
        });
    });

    it('file not exist', async () => {
        const filedata = {
            repoType: 'github',
            fileFullpath: `${textLinesFileFullpath}.none`,
            browseURL: `http://example.com/usr/repo/tree/master/text.txt`,
        };
        const templateText = [
            `---`,
            `filedata: ${JSON.stringify(filedata)}`,
            `---`,
            `{{ filedata | linesSelectedURL(r/3/) }}`,
        ].join('\n');

        const result = renderNunjucksWithFrontmatter(
            templateText,
            {},
            { cwd: '.', filters: { linesSelectedURL }, extensions: [] },
        );
        await expect(result).rejects.toThrow([
            `(unknown path)`,
            `  Error: linesSelectedURL() filter / ENOENT: no such file or directory, open '${textLinesFilepath}.none'`,
        ].join('\n'));
    });

    describe('non match', () => {
        const table: ReadonlyArray<
            readonly [
                string,
                {
                    templateLines: (arg: { filedata: RepoData }) => string[];
                    expected: readonly string[];
                },
            ]
        > = [
            ['one regex', {
                templateLines: ({ filedata }) => [
                    `---`,
                    `filedata: ${JSON.stringify(filedata)}`,
                    `---`,
                    `{{ filedata | linesSelectedURL(r/(?!)/) }}`,
                ],
                expected: [
                    `(unknown path)`,
                    `  Error: linesSelectedURL() filter / RegExp does not match with '${textLinesFilepath}' contents. The following pattern was passed in the argument: /(?!)/`,
                ],
            }],
            ['start argument', {
                templateLines: ({ filedata }) => [
                    `---`,
                    `filedata: ${JSON.stringify(filedata)}`,
                    `---`,
                    `{{ filedata | linesSelectedURL(start=r/(?!)/) }}`,
                ],
                expected: [
                    `(unknown path)`,
                    `  Error: linesSelectedURL() filter / RegExp does not match with '${textLinesFilepath}' contents. The following pattern was passed in the options.start argument: /(?!)/`,
                ],
            }],
            ['end argument', {
                templateLines: ({ filedata }) => [
                    `---`,
                    `filedata: ${JSON.stringify(filedata)}`,
                    `---`,
                    `{{ filedata | linesSelectedURL(start=r/^/, end=r/(?!)/) }}`,
                ],
                expected: [
                    `(unknown path)`,
                    `  Error: linesSelectedURL() filter / RegExp does not match with '${textLinesFilepath}' contents. The following pattern was passed in the options.end argument: /(?!)/`,
                ],
            }],
        ];
        it.each(table)('%s', async (_, { templateLines, expected }) => {
            const filedata = {
                repoType: 'github',
                fileFullpath: textLinesFileFullpath,
                browseURL: `http://example.com/usr/repo/tree/master/text.txt`,
            } as const;
            const templateText = templateLines({ filedata }).join('\n');

            const result = renderNunjucksWithFrontmatter(
                templateText,
                {},
                { cwd: '.', filters: { linesSelectedURL }, extensions: [] },
            );
            await expect(result).rejects.toThrow(expected.join('\n'));
        });
    });
});
