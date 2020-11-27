import matter from 'gray-matter';
import { configure as nunjucksConfigure, Extension as NunjucksExtension } from 'nunjucks';

type NunjucksRenderStringArgs = Parameters<ReturnType<typeof nunjucksConfigure>['renderString']>;
type NunjucksFilterFn = (...args: [unknown, ...unknown[]]) => unknown;
type NunjucksExtensionConstructor = new () => NunjucksExtension;
type FiltersRecord = Record<string, NunjucksFilterFn>;
type ExtensionsArray = readonly NunjucksExtensionConstructor[];

async function renderNunjucks(
    templateCode: NunjucksRenderStringArgs[0],
    templateContext: NunjucksRenderStringArgs[1],
    { cwd, filters, extensions }: { cwd: string; filters: FiltersRecord; extensions: ExtensionsArray },
): Promise<string> {
    const nunjucksEnv = nunjucksConfigure(cwd, {
        autoescape: false,
        throwOnUndefined: true,
    });

    extensions.forEach(ExtensionClass => {
        nunjucksEnv.addExtension(ExtensionClass.name, new ExtensionClass());
    });

    Object.entries(filters).forEach(([filterName, filterFunc]) => {
        nunjucksEnv.addFilter(
            filterName,
            (...args) => {
                const callback = args.pop();
                (async () => filterFunc(args.shift(), ...args))()
                    .then(
                        value => callback(null, value),
                        async error => {
                            if (error instanceof Error) {
                                error.message = `${filterName}() filter / ${error.message}`;
                            }
                            throw error;
                        },
                    )
                    .catch(callback);
            },
            true,
        );
    });

    type renderStringReturnType = Parameters<Exclude<NunjucksRenderStringArgs[2], undefined>>[1];
    const generateText = await new Promise<renderStringReturnType>(
        (resolve, reject) => {
            nunjucksEnv.renderString(
                templateCode,
                templateContext,
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                },
            );
        },
    );
    if (typeof generateText !== 'string') {
        throw new Error(
            'Nunjucks render failed: nunjucks.Environment#renderString() method returned a non-string value',
        );
    }

    return generateText;
}

export async function renderNunjucksWithFrontmatter(
    templateCodeWithFrontmatter: string,
    templateContext: Record<string, unknown>,
    { cwd, filters, extensions }: { cwd: string; filters: FiltersRecord; extensions: ExtensionsArray },
): Promise<string> {
    const { content: templateCode, data: templateData } = matter(templateCodeWithFrontmatter);
    const frontmatterEndPos = templateCodeWithFrontmatter.length - templateCode.length;
    const templateFrontmatter = templateCodeWithFrontmatter.substring(0, frontmatterEndPos);
    const dummyFrontmatter = templateFrontmatter.replace(/[^\n]+/g, '');
    const templateCodeWithDummyFrontmatter = dummyFrontmatter + templateCode;

    const generateTextWithDummyFrontmatter = await renderNunjucks(
        templateCodeWithDummyFrontmatter,
        { ...templateContext, ...templateData },
        { cwd, filters, extensions },
    );
    const generateText = generateTextWithDummyFrontmatter.substring(dummyFrontmatter.length);

    return generateText;
}
