const path = require('path');

/**
 * @param {string} basename
 * @returns {function(string): boolean}
 */
function baseFilter(basename) {
  return (filename) => path.basename(filename) === basename;
}

/**
 * @param  {...string} extList
 * @returns {function(string): boolean}
 */
function extFilter(...extList) {
  extList = extList.map((ext) => ext.replace(/^\.?/, '.'));
  return (filename) => extList.includes(path.extname(filename));
}

module.exports = {
  '*': (/** @type {string[]} */ filenames) => {
    /** @type {string[]} */
    const commands = [];

    if (filenames.includes(path.resolve('README.md')))
      commands.push('run-s test:readme');

    const prettierTargetFiles = filenames.filter(
      extFilter('ts', 'js', 'json', 'yaml', 'yml'),
    );
    if (1 <= prettierTargetFiles.length)
      commands.push(`prettier --write ${prettierTargetFiles.join(' ')}`);

    const pkgFiles = filenames.filter(baseFilter('package.json'));
    if (1 <= pkgFiles.length)
      commands.push(
        `prettier-package-json --write ${pkgFiles.join(' ')}`,
        `sort-package-json ${pkgFiles.join(' ')}`,
      );

    const tsFiles = filenames.filter(extFilter('ts'));
    if (1 <= tsFiles.length)
      commands.push(
        `eslint --fix ${tsFiles.join(' ')}`,
        'run-s release:build',
        'git add ./dist/',
      );

    if (filenames.some((filename) => path.resolve('README.md') !== filename))
      commands.push('run-s build:readme', 'git add ./README.md');

    return commands;
  },
};
