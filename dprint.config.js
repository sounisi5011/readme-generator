// @ts-check

/** @type { import("dprint-plugin-typescript").TypeScriptConfiguration } */
exports.tsPluginConfig = {
    quoteStyle: 'preferSingle',
};

/** @type { import("dprint").Configuration } */
exports.config = {
    projectType: 'openSource',
    get plugins() {
        const { TypeScriptPlugin } = require('dprint-plugin-typescript');

        const plugins = [new TypeScriptPlugin(exports.tsPluginConfig)];

        Object.defineProperty(this, 'plugins', { value: plugins });
        return plugins;
    },
    includes: ['**/{,.}*.{ts,js}'],
    excludes: ['**/coverage/**', 'dist/**', 'tests/**/*.test-result/**'],
};
