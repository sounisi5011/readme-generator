import * as path from 'path';

import { renderNunjucksWithFrontmatter } from '../../src/renderer';
import { npmURL } from '../../src/template-filters/npmURL';
import { getDepsRecord } from '../../src/utils/installed-dependencies';

describe('npmURL', () => {
    it('basic', async () => {
        const templateText = [
            `{{ 'foo' | npmURL }}`,
            `{{ 'foo@1.2.3' | npmURL }}`,
            `{{ 'foo@legacy' | npmURL }}`,
            `{{ '@hoge/bar' | npmURL }}`,
            `{{ '@hoge/bar@0.1.1-alpha' | npmURL }}`,
            `{{ '@hoge/bar@dev' | npmURL }}`,
        ].join('\n');

        const result = renderNunjucksWithFrontmatter(
            templateText,
            {},
            { cwd: '.', filters: { npmURL }, extensions: [] },
        );
        await expect(result)
            .resolves.toBe([
                `https://www.npmjs.com/package/foo`,
                `https://www.npmjs.com/package/foo/v/1.2.3`,
                `https://www.npmjs.com/package/foo/v/legacy`,
                `https://www.npmjs.com/package/@hoge/bar`,
                `https://www.npmjs.com/package/@hoge/bar/v/0.1.1-alpha`,
                `https://www.npmjs.com/package/@hoge/bar/v/dev`,
            ].join('\n'));
    });

    it('convert from deps', async () => {
        const templateText = [
            `{{ deps['package-version-git-tag'] | npmURL }}`,
            `{{ deps.cac | npmURL }}`,
        ].join('\n');
        const cwd = path.resolve(__dirname, './fixtures.npmURL/convert-from-deps');
        const deps = getDepsRecord({
            packageRootFullpath: cwd,
            reportError: () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
        });

        const result = renderNunjucksWithFrontmatter(
            templateText,
            { deps },
            { cwd, filters: { npmURL }, extensions: [] },
        );
        await expect(result).resolves.toBe([
            `https://www.npmjs.com/package/package-version-git-tag/v/2.1.0`,
            `https://www.npmjs.com/package/cac/v/6.5.8`,
        ].join('\n'));
    });

    it('invalid data', async () => {
        const templateText = `{{ 42 | npmURL }}`;

        const result = renderNunjucksWithFrontmatter(
            templateText,
            {},
            { cwd: '.', filters: { npmURL }, extensions: [] },
        );
        await expect(result).rejects.toThrow([
            `(unknown path)`,
            `  TypeError: npmURL() filter / Invalid packageData value: 42`,
        ].join('\n'));
    });
});
