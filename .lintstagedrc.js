const path = require('path');

/**
 * @param {string} fullPath
 * @param {string} searchPath
 * @returns {boolean}
 */
function startsWith(fullPath, searchPath) {
  return fullPath.startsWith(
    (
      path.resolve(searchPath)
        .replace(new RegExp(`\\${path.sep}+$`), '')
    ) + path.sep,
  );
}

/**
 * @param {string} basename
 * @returns {function(string): boolean}
 */
function baseFilter(basename) {
  return filename => path.basename(filename) === basename;
}

/**
 * @param  {...string} extList
 * @returns {function(string): boolean}
 */
function extFilter(...extList) {
  extList = extList.map(ext => ext.replace(/^\.?/, '.'));
  return filename => extList.includes(path.extname(filename));
}

module.exports = {
  /**
   * @param {string[]} filenames
   */
  '*': filenames => {
    /** @type {string[]} */
    const commands = [];

    if (filenames.includes(path.resolve('README.md'))) {
      commands.push(
        'run-s test:readme',
      );
    }

    const prettierTargetFiles = filenames.filter(extFilter('json', 'yaml', 'yml'));
    if (prettierTargetFiles.length >= 1) {
      commands.push(
        `prettier --write ${prettierTargetFiles.join(' ')}`,
      );
    }

    const pkgFiles = filenames.filter(baseFilter('package.json'));
    if (pkgFiles.length >= 1) {
      commands.push(
        `prettier-package-json --write ${pkgFiles.join(' ')}`,
        `sort-package-json ${pkgFiles.join(' ')}`,
      );
    }

    const tsOrJsFiles = filenames.filter(extFilter('ts', 'js'));
    if (tsOrJsFiles.length >= 1) {
      commands.push(
        `eslint --fix ${tsOrJsFiles.join(' ')}`,
      );
    }

    if (filenames.some(filename => path.extname(filename) === '.ts' || startsWith(filename, 'dist'))) {
      commands.push(
        'run-s release:build',
        'git add ./dist/',
      );
    }

    if (filenames.some(filename => path.resolve('README.md') !== filename)) {
      commands.push(
        'run-s build:readme',
        'git add ./README.md',
      );
    }

    return commands;
  },
};
