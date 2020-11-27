"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderNunjucks = void 0;
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
exports.renderNunjucks = renderNunjucks;
//# sourceMappingURL=renderer.js.map