#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cac_1 = require("cac");
const main_1 = require("./main");
const omitPackageScope_1 = require("./template-filters/omitPackageScope");
const utils_1 = require("./utils");
// ----- //
(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PKG = require('../package.json');
    let pkgName;
    let pkgVersion;
    let pkgDescription = '';
    if (utils_1.isObject(PKG)) {
        if (typeof PKG.name === 'string')
            pkgName = PKG.name;
        if (typeof PKG.version === 'string')
            pkgVersion = PKG.version;
        if (typeof PKG.description === 'string')
            pkgDescription = PKG.description;
    }
    const cli = cac_1.cac(omitPackageScope_1.omitPackageScopeName(pkgName));
    if (pkgVersion)
        cli.version(pkgVersion, '-V, -v, --version');
    cli.help(pkgDescription
        ? sections => {
            sections.splice(1, 0, { body: pkgDescription });
        }
        : undefined);
    cli.option('--template <file>', 'Nunjucks template file path', { default: 'readme-template.njk' });
    cli.option('--test', 'Test if README.md file is overwritten');
    if (cli.commands.length <= 0)
        cli.usage('[options]');
    const { options } = cli.parse();
    if (options.version || options.help)
        return;
    const unknownOptions = Object.keys(options)
        .filter(name => name !== '--' && !cli.globalCommand.hasOption(name));
    if (unknownOptions.length > 0) {
        process.exitCode = 1;
        console.error(`unknown ${unknownOptions.length > 1 ? 'options' : 'option'}: ${unknownOptions
            .map(name => /^[^-]$/.test(name) ? `-${name}` : `--${name}`)
            .join(' ')}\nTry \`${cli.name} --help\` for valid options.`);
        return;
    }
    main_1.main({
        template: options.template,
        test: options.test,
    }).catch(error => {
        process.exitCode = 1;
        console.error(error instanceof Error ? error.message : error);
    });
})();
//# sourceMappingURL=index.js.map