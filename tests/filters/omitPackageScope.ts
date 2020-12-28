import { renderNunjucksWithFrontmatter } from '../../src/renderer';
import { omitPackageScope } from '../../src/template-filters/omitPackageScope';

describe('omitPackageScope', () => {
    it('basic', async () => {
        const templateText = `>>> {{ '@user/package' | omitPackageScope }} <<<`;

        const result = renderNunjucksWithFrontmatter(
            templateText,
            {},
            { cwd: '.', filters: { omitPackageScope }, extensions: [] },
        );
        await expect(result).resolves.toBe('>>> package <<<');
    });

    it('invalid data', async () => {
        const templateText = `>>> {{ 42 | omitPackageScope }} <<<`;

        const result = renderNunjucksWithFrontmatter(
            templateText,
            {},
            { cwd: '.', filters: { omitPackageScope }, extensions: [] },
        );
        await expect(result).rejects.toThrow([
            `(unknown path)`,
            `  TypeError: omitPackageScope() filter / Invalid packageName value: 42`,
        ].join('\n'));
    });
});
