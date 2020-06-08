// @ts-check
const { TypeScriptPlugin } = require('dprint-plugin-typescript');

/** @type { import("dprint").Configuration } */
module.exports.config = {
  projectType: 'openSource',
  plugins: [
    new TypeScriptPlugin({
      quoteStyle: 'preferSingle',
    }),
  ],
  includes: ['**/*.{ts,js}'],
};
