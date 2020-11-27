#!/usr/bin/env node

import { cac } from 'cac';

import { main } from './main';
import { omitPackageScopeName } from './template-filters/omitPackageScope';
import { isObject } from './utils';

// ----- //

(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PKG: unknown = require('../package.json');

    let pkgName: string | undefined;
    let pkgVersion: string | undefined;
    let pkgDescription = '';
    if (isObject(PKG)) {
        if (typeof PKG.name === 'string') pkgName = PKG.name;
        if (typeof PKG.version === 'string') pkgVersion = PKG.version;
        if (typeof PKG.description === 'string') pkgDescription = PKG.description;
    }

    const cli = cac(omitPackageScopeName(pkgName));
    if (pkgVersion) cli.version(pkgVersion, '-V, -v, --version');
    cli.help(
        pkgDescription
            ? sections => {
                sections.splice(1, 0, { body: pkgDescription });
            }
            : undefined,
    );

    cli.option('--template <file>', 'Nunjucks template file path', { default: 'readme-template.njk' });
    cli.option('--test', 'Test if README.md file is overwritten');

    if (cli.commands.length <= 0) cli.usage('[options]');

    const { options } = cli.parse();

    if (options.version || options.help) return;

    const unknownOptions = Object.keys(options)
        .filter(name => name !== '--' && !cli.globalCommand.hasOption(name));
    if (unknownOptions.length > 0) {
        process.exitCode = 1;
        console.error(
            `unknown ${unknownOptions.length > 1 ? 'options' : 'option'}: ${
                unknownOptions
                    .map(name => /^[^-]$/.test(name) ? `-${name}` : `--${name}`)
                    .join(' ')
            }\nTry \`${cli.name} --help\` for valid options.`,
        );
        return;
    }

    main({
        template: options.template,
        test: options.test,
    }).catch(error => {
        process.exitCode = 1;
        console.error(error instanceof Error ? error.message : error);
    });
})();
