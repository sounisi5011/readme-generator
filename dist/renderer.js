"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderNunjucksWithFrontmatter = void 0;
const gray_matter_1 = __importDefault(require("gray-matter"));
const nunjucks_1 = require("nunjucks");
async function renderNunjucks(templateCode, templateContext, { cwd, filters, extensions }) {
    const nunjucksEnv = nunjucks_1.configure(cwd, {
        autoescape: false,
        throwOnUndefined: true,
    });
    extensions.forEach(ExtensionClass => {
        nunjucksEnv.addExtension(ExtensionClass.name, new ExtensionClass());
    });
    Object.entries(filters).forEach(([filterName, filterFunc]) => {
        nunjucksEnv.addFilter(filterName, (...args) => {
            const callback = args.pop();
            (async () => filterFunc(args.shift(), ...args))()
                .then(value => callback(null, value), async (error) => {
                if (error instanceof Error) {
                    error.message = `${filterName}() filter / ${error.message}`;
                }
                throw error;
            })
                .catch(callback);
        }, true);
    });
    const generateText = await new Promise((resolve, reject) => {
        nunjucksEnv.renderString(templateCode, templateContext, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result);
            }
        });
    });
    if (typeof generateText !== 'string') {
        throw new Error('Nunjucks render failed: nunjucks.Environment#renderString() method returned a non-string value');
    }
    return generateText;
}
async function renderNunjucksWithFrontmatter(templateCodeWithFrontmatter, templateContext, { cwd, filters, extensions }) {
    const { content: templateCode, data: templateData } = gray_matter_1.default(templateCodeWithFrontmatter);
    const frontmatterEndPos = templateCodeWithFrontmatter.length - templateCode.length;
    const templateFrontmatter = templateCodeWithFrontmatter.substring(0, frontmatterEndPos);
    const dummyFrontmatter = templateFrontmatter.replace(/[^\n]+/g, '');
    const templateCodeWithDummyFrontmatter = dummyFrontmatter + templateCode;
    const generateTextWithDummyFrontmatter = await renderNunjucks(templateCodeWithDummyFrontmatter, { ...templateContext, ...templateData }, { cwd, filters, extensions });
    const generateText = generateTextWithDummyFrontmatter.substring(dummyFrontmatter.length);
    return generateText;
}
exports.renderNunjucksWithFrontmatter = renderNunjucksWithFrontmatter;
//# sourceMappingURL=renderer.js.map