#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cac_1 = require("cac");
const fs = require("fs");
const get_roots_1 = require("get-roots");
const nunjucks = require("nunjucks");
const path = require("path");
const util = require("util");
const hostedGitInfo = require("hosted-git-info");
const execa = require("execa");
const matter = require("gray-matter");
const npmPath = require("npm-path");
const npa = require("npm-package-arg");
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
function isObject(value) {
    return typeof value === 'object' && value !== null;
}
function isStringArray(value) {
    return Array.isArray(value) && value.every((v) => typeof v === 'string');
}
function isNonNullable(value) {
    return value !== null && value !== undefined;
}
function copyRegExp(sourceRegExp, { addFlags = '', deleteFlags = '', } = {}) {
    return new RegExp(sourceRegExp.source, sourceRegExp.flags.replace(/./g, (char) => deleteFlags.includes(char) ? '' : char) + addFlags);
}
function catchError(callback, defaultValue) {
    try {
        return callback();
    }
    catch (_) {
        return defaultValue;
    }
}
function getLinesStartPos(text) {
    const lineBreakRegExp = /\r\n?|\n/g;
    const lineStartPosList = [0];
    for (let match; (match = lineBreakRegExp.exec(text));) {
        lineStartPosList.push(match.index + match[0].length);
    }
    return lineStartPosList;
}
function strPos2lineNum(lineStartPosList, strPos) {
    return (lineStartPosList.findIndex((lineStartPos, index) => {
        var _a;
        const nextLineStartPos = (_a = lineStartPosList[index + 1]) !== null && _a !== void 0 ? _a : Infinity;
        return lineStartPos <= strPos && strPos < nextLineStartPos;
    }) + 1);
}
async function tryReadFile(filepath) {
    return readFileAsync(filepath).catch(() => undefined);
}
function tryRequire(filepath) {
    return catchError(() => require(path.resolve(filepath)));
}
function errorMsgTag(template, ...substitutions) {
    return template
        .map((str, index) => index === 0
        ? str
        : util.inspect(substitutions[index - 1], {
            depth: 0,
            breakLength: Infinity,
            maxArrayLength: 5,
        }) + str)
        .join('');
}
function omitPackageScope(packageName) {
    return packageName === null || packageName === void 0 ? void 0 : packageName.replace(/^@[^/]+\//, '');
}
// ----- //
const cwd = process.cwd();
const cwdRelativePath = path.relative.bind(path, cwd);
const nunjucksTags = [
    class SetPropExtension {
        constructor() {
            Object.defineProperty(this, "tags", {
                enumerable: true,
                configurable: true,
                writable: true,
                value: ['setProp']
            });
        }
        parse(parser, nodes) {
            const getObjectPath = (lookupValNode) => lookupValNode instanceof nodes.LookupVal
                ? [
                    ...getObjectPath(lookupValNode.target),
                    String(lookupValNode.val.value),
                ]
                : [lookupValNode.value];
            const value2node = (value, lineno, colno) => {
                if (Array.isArray(value)) {
                    return new nodes.Array(lineno, colno, value.map((v) => value2node(v, lineno, colno)));
                }
                else if (isObject(value)) {
                    if (value instanceof nodes.Node)
                        return value;
                    return new nodes.Dict(lineno, colno, Object.entries(value).map(([prop, value]) => new nodes.Pair(lineno, colno, value2node(prop, lineno, colno), value2node(value, lineno, colno))));
                }
                else {
                    return new nodes.Literal(lineno, colno, value);
                }
            };
            const tagNameSymbolToken = parser.nextToken();
            const argsNodeList = parser.parseSignature(null, true);
            if (tagNameSymbolToken) {
                parser.advanceAfterBlockEnd(tagNameSymbolToken.value);
            }
            const bodyNodeList = parser.parseUntilBlocks('endsetProp', 'endset');
            parser.advanceAfterBlockEnd();
            const objectPathList = argsNodeList.children
                .map((childNode) => {
                if (childNode instanceof nodes.LookupVal ||
                    childNode instanceof nodes.Symbol) {
                    const objectPath = getObjectPath(childNode);
                    return objectPath;
                }
                return null;
            })
                .filter(isNonNullable);
            return new nodes.CallExtension(this, 'run', new nodes.NodeList(argsNodeList.lineno, argsNodeList.colno, [
                value2node({
                    objectPathList,
                }, argsNodeList.lineno, argsNodeList.colno),
            ]), [bodyNodeList]);
        }
        run(context, arg, body) {
            const bodyStr = body();
            for (const objectPath of arg.objectPathList) {
                let obj = context.ctx;
                objectPath.forEach((propName, index) => {
                    const isLast = objectPath.length - 1 === index;
                    if (isLast) {
                        obj[propName] = bodyStr;
                    }
                    else {
                        const o = obj[propName];
                        if (!isObject(o)) {
                            throw new TypeError('setProp tag / Cannot be assigned to `' +
                                this.toPropString(objectPath) +
                                '`! `' +
                                this.toPropString(objectPath.slice(0, index + 1)) +
                                '` variable value is ' +
                                (o === null ? 'null' : typeof o) +
                                ', not an object');
                        }
                        obj = o;
                    }
                });
            }
            return new nunjucks.runtime.SafeString('');
        }
        toPropString(objectPath) {
            /**
             * @see https://www.ecma-international.org/ecma-262/9.0/index.html#prod-IdentifierName
             */
            const ECMAScript2018IdentifierNameRegExp = /^[\p{ID_Start}$_][\p{ID_Continue}$\u{200C}\u{200D}]*$/u;
            return objectPath
                .map((propName, index) => ECMAScript2018IdentifierNameRegExp.test(propName)
                ? index === 0
                    ? propName
                    : `.${propName}`
                : `[${util.inspect(propName)}]`)
                .join('');
        }
    },
];
const nunjucksFilters = {
    omitPackageScope(packageName) {
        if (typeof packageName !== 'string')
            throw new TypeError(errorMsgTag `Invalid packageName value: ${packageName}`);
        return omitPackageScope(packageName);
    },
    npmURL(packageData) {
        do {
            if (typeof packageData === 'string') {
                const result = catchError(() => npa(packageData.trim()));
                if (!result)
                    break;
                if (result.type === 'tag' || result.type === 'version') {
                    return result.rawSpec
                        ? `https://www.npmjs.com/package/${result.name}/v/${result.rawSpec}`
                        : `https://www.npmjs.com/package/${result.name}`;
                }
            }
            else if (isObject(packageData)) {
                if (packageData.name && packageData.version) {
                    return `https://www.npmjs.com/package/${packageData.name}/v/${packageData.version}`;
                }
            }
        } while (false);
        throw new TypeError(errorMsgTag `Invalid packageData value: ${packageData}`);
    },
    async execCommand(command) {
        const $PATH = await new Promise((resolve, reject) => {
            npmPath.get((error, $PATH) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve($PATH);
                }
            });
        });
        const options = {
            all: true,
            env: { [npmPath.PATH]: $PATH },
        };
        let proc;
        if (typeof command === 'string') {
            proc = execa.command(command, options);
        }
        else if (isStringArray(command)) {
            const [file, ...args] = command;
            proc = execa(file, args, options);
        }
        if (!proc)
            throw new TypeError(errorMsgTag `Invalid command value: ${command}`);
        const result = await proc;
        return result.all || result.stdout;
    },
    linesSelectedURL: (() => {
        function isRepoData(value) {
            return (isObject(value) &&
                typeof value.repoType === 'string' &&
                typeof value.fileFullpath === 'string' &&
                typeof value.browseURL === 'string');
        }
        function isOptions(value) {
            return (isObject(value) &&
                value.start instanceof RegExp &&
                (value.end instanceof RegExp || value.end === undefined));
        }
        const cacheStore = new Map();
        return async (repoData, options) => {
            if (!isRepoData(repoData)) {
                throw new TypeError(errorMsgTag `Invalid repoData value: ${repoData}`);
            }
            if (!(options instanceof RegExp || isOptions(options))) {
                throw new TypeError(errorMsgTag `Invalid options value: ${options}`);
            }
            const startLineRegExp = copyRegExp(options instanceof RegExp ? options : options.start, {
                deleteFlags: 'gy',
            });
            const endLineRegExp = options instanceof RegExp
                ? null
                : options.end &&
                    copyRegExp(options.end, { deleteFlags: 'gy' });
            const isFullMatchMode = options instanceof RegExp;
            const fileFullpath = path.resolve(repoData.fileFullpath);
            let fileData = cacheStore.get(fileFullpath);
            if (!fileData) {
                const fileContent = await readFileAsync(cwdRelativePath(fileFullpath), 'utf8');
                fileData = {
                    content: fileContent,
                    lineStartPosList: getLinesStartPos(fileContent),
                };
            }
            const { content: fileContent, lineStartPosList } = fileData;
            const [startLineNumber, endLineNumber] = lineStartPosList.reduce(([startLineNumber, endLineNumber, triedMatch], lineStartPos, index) => {
                const currentLineNumber = index + 1;
                const isTryStartLineMatching = !startLineNumber &&
                    (!startLineRegExp.multiline || !triedMatch.start);
                const isTryEndLineMatching = endLineRegExp &&
                    !endLineNumber &&
                    (!endLineRegExp.multiline || !triedMatch.end);
                if (isTryStartLineMatching || isTryEndLineMatching) {
                    const text = fileContent.substring(lineStartPos);
                    if (isTryStartLineMatching) {
                        const match = startLineRegExp.exec(text);
                        triedMatch.start = true;
                        if (match) {
                            const matchStartPos = lineStartPos + match.index;
                            const matchEndPos = matchStartPos + match[0].length;
                            if (isFullMatchMode) {
                                startLineNumber = strPos2lineNum(lineStartPosList, matchStartPos);
                                endLineNumber = strPos2lineNum(lineStartPosList, matchEndPos);
                            }
                            else {
                                startLineNumber = strPos2lineNum(lineStartPosList, matchEndPos);
                            }
                        }
                    }
                    if (endLineRegExp &&
                        isTryEndLineMatching &&
                        startLineNumber &&
                        startLineNumber <= currentLineNumber) {
                        const match = endLineRegExp.exec(text);
                        triedMatch.end = true;
                        if (match) {
                            const matchEndPos = lineStartPos +
                                match.index +
                                match[0].length;
                            endLineNumber = strPos2lineNum(lineStartPosList, matchEndPos);
                        }
                    }
                }
                return [startLineNumber, endLineNumber, triedMatch];
            }, [0, 0, { start: false, end: false }]);
            if (!startLineNumber) {
                throw new Error(errorMsgTag `RegExp does not match with ${cwdRelativePath(fileFullpath)} contents. The following pattern was passed in` +
                    (options instanceof RegExp
                        ? errorMsgTag ` the argument: ${startLineRegExp}`
                        : errorMsgTag ` the options.start argument: ${startLineRegExp}`));
            }
            if (endLineRegExp && !endLineNumber) {
                throw new Error(errorMsgTag `RegExp does not match with ${cwdRelativePath(fileFullpath)} contents.` +
                    errorMsgTag ` The following pattern was passed in the options.end argument: ${endLineRegExp}`);
            }
            let browseURLSuffix;
            const isMultiLine = endLineNumber && startLineNumber !== endLineNumber;
            if (repoData.repoType === 'github') {
                browseURLSuffix = isMultiLine
                    ? `#L${startLineNumber}-L${endLineNumber}`
                    : `#L${startLineNumber}`;
            }
            else if (repoData.repoType === 'gitlab') {
                browseURLSuffix = isMultiLine
                    ? `#L${startLineNumber}-${endLineNumber}`
                    : `#L${startLineNumber}`;
            }
            else if (repoData.repoType === 'bitbucket') {
                browseURLSuffix = isMultiLine
                    ? `#lines-${startLineNumber}:${endLineNumber}`
                    : `#lines-${startLineNumber}`;
            }
            else if (repoData.repoType === 'gist') {
                browseURLSuffix = isMultiLine
                    ? `-L${startLineNumber}-L${endLineNumber}`
                    : `-L${startLineNumber}`;
            }
            else {
                throw new Error(errorMsgTag `Unknown repoData.repoType value: ${repoData.repoType}`);
            }
            return repoData.browseURL + browseURLSuffix;
        };
    })(),
};
async function renderNunjucks(templateCode, templateContext, nunjucksFilters) {
    const nunjucksEnv = nunjucks.configure(cwd, {
        autoescape: false,
        throwOnUndefined: true,
    });
    nunjucksTags.forEach((ExtensionClass) => {
        nunjucksEnv.addExtension(ExtensionClass.name, new ExtensionClass());
    });
    Object.entries(nunjucksFilters).forEach(([filterName, filterFunc]) => {
        nunjucksEnv.addFilter(filterName, (...args) => {
            const callback = args.pop();
            (async () => filterFunc(args.shift(), ...args))()
                .then((value) => callback(null, value), (error) => {
                if (error instanceof Error)
                    error.message = `${filterName}() filter / ${error.message}`;
                return Promise.reject(error);
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
    if (typeof generateText !== 'string')
        throw new Error('Nunjucks render failed: nunjucks.Environment#renderString() method returned a non-string value');
    return generateText;
}
async function main({ template, test, }) {
    const packageRootFullpath = cwd;
    const templateFullpath = path.resolve(packageRootFullpath, template);
    const destDirFullpath = packageRootFullpath;
    const templateCodeWithFrontmatter = await readFileAsync(cwdRelativePath(templateFullpath), 'utf8');
    const templateContext = {};
    const pkgFileFullpath = path.resolve(packageRootFullpath, 'package.json');
    const pkg = tryRequire(pkgFileFullpath);
    if (!isObject(pkg)) {
        console.error(errorMsgTag `Failed to read file ${cwdRelativePath(pkgFileFullpath)}`);
    }
    else {
        Object.assign(templateContext, { pkg });
        const version = typeof pkg.version === 'string' ? pkg.version : '';
        const repositoryURL = typeof pkg.repository === 'string'
            ? pkg.repository
            : isObject(pkg.repository) &&
                typeof pkg.repository.url === 'string'
                ? pkg.repository.url
                : '';
        const gitInfo = hostedGitInfo.fromUrl(repositoryURL);
        if (!gitInfo) {
            console.error(`Failed to detect remote repository. ` +
                (pkg.repository === undefined
                    ? errorMsgTag `'repository' field does not exist in ${cwdRelativePath(pkgFileFullpath)} file.`
                    : errorMsgTag `Unknown structure of 'repository' field in ${cwdRelativePath(pkgFileFullpath)} file: ${pkg.repository}`));
        }
        else {
            const getCommittish = (kwargs) => {
                for (const prop of [
                    'committish',
                    'commit',
                    'branch',
                    'tag',
                ]) {
                    if (typeof kwargs[prop] === 'string' && kwargs[prop])
                        return kwargs[prop];
                }
                return undefined;
            };
            const gitRootPath = catchError(() => get_roots_1.getGitRoot(packageRootFullpath), packageRootFullpath);
            Object.assign(templateContext, {
                repo: {
                    user: gitInfo.user,
                    project: gitInfo.project,
                    shortcut(...args) {
                        const kwargs = args.pop() || {};
                        const committish = getCommittish(kwargs) ||
                            (kwargs.semver ? `semver:${kwargs.semver}` : '');
                        return gitInfo.shortcut({ committish });
                    },
                },
            });
            Object.assign(nunjucksFilters, {
                repoBrowseURL(filepath, options = {}) {
                    if (typeof filepath !== 'string')
                        throw new TypeError(errorMsgTag `Invalid filepath value: ${filepath}`);
                    if (!isObject(options))
                        throw new TypeError(errorMsgTag `Invalid options value: ${options}`);
                    const fileFullpath = /^\.{1,2}\//.test(filepath)
                        ? path.resolve(path.dirname(templateFullpath), filepath)
                        : path.resolve(gitRootPath, filepath.replace(/^[/]+/g, ''));
                    const gitRepoPath = path.relative(gitRootPath, fileFullpath);
                    const committish = getCommittish(options) ||
                        (version ? `v${version}` : '');
                    const browseURL = gitInfo.browse(gitRepoPath, {
                        committish,
                    });
                    return {
                        repoType: gitInfo.type,
                        gitRepoPath,
                        browseURL,
                        fileFullpath,
                        toString() {
                            return browseURL;
                        },
                    };
                },
            });
        }
    }
    const pkgLockFileFullpath = path.resolve(packageRootFullpath, 'package-lock.json');
    const pkgLock = tryRequire(pkgLockFileFullpath);
    if (!isObject(pkgLock)) {
        console.error(errorMsgTag `Failed to read file ${cwdRelativePath(pkgLockFileFullpath)}`);
    }
    else {
        const { dependencies } = pkgLock;
        if (!isObject(dependencies)) {
            console.error([
                errorMsgTag `Failed to read npm lockfile ${cwdRelativePath(pkgLockFileFullpath)}.`,
                `Reason: Invalid structure where 'dependencies' field does not exist.`,
            ].join(` `));
        }
        else {
            const deps = Object.entries(dependencies).reduce((deps, [pkgName, pkgData]) => {
                if (isObject(pkgData) &&
                    typeof pkgData.version === 'string') {
                    deps[pkgName] = {
                        name: pkgName,
                        version: pkgData.version,
                        v: pkgData.version,
                    };
                }
                return deps;
            }, {});
            Object.assign(templateContext, { deps });
        }
    }
    const generateFileFullpath = path.resolve(destDirFullpath, 'README.md');
    const { content: templateCode, data: templateData } = matter(templateCodeWithFrontmatter);
    Object.assign(templateContext, templateData);
    const generateText = await renderNunjucks(templateCode, templateContext, nunjucksFilters);
    if (test) {
        const origReadmeContent = await tryReadFile(generateFileFullpath);
        if (origReadmeContent &&
            !origReadmeContent.equals(Buffer.from(generateText))) {
            const templateFilename = cwdRelativePath(templateFullpath);
            const generateFilename = cwdRelativePath(generateFileFullpath);
            throw new Error(`Do not edit '${generateFilename}' manually!` +
                ` You MUST edit '${templateFilename}' instead of '${generateFilename}'`);
        }
    }
    else {
        await writeFileAsync(cwdRelativePath(generateFileFullpath), generateText);
    }
}
(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PKG = require('../package.json');
    let pkgName;
    let pkgVersion;
    let pkgDescription = '';
    if (isObject(PKG)) {
        if (typeof PKG.name === 'string')
            pkgName = PKG.name;
        if (typeof PKG.version === 'string')
            pkgVersion = PKG.version;
        if (typeof PKG.description === 'string')
            pkgDescription = PKG.description;
    }
    const cli = cac_1.cac(omitPackageScope(pkgName));
    if (pkgVersion) {
        cli.version(pkgVersion, '-V, -v, --version');
    }
    cli.help(pkgDescription
        ? (sections) => {
            sections.splice(1, 0, { body: pkgDescription });
        }
        : undefined);
    cli.option('--template <file>', 'Nunjucks template file path', {
        default: 'readme-template.njk',
    });
    cli.option('--test', 'Test if README.md file is overwritten');
    if (cli.commands.length <= 0)
        cli.usage('[options]');
    const { options } = cli.parse();
    if (options.version || options.help)
        return;
    const unknownOptions = Object.keys(options).filter((name) => name !== '--' && !cli.globalCommand.hasOption(name));
    if (unknownOptions.length > 0) {
        process.exitCode = 1;
        console.error(`unknown ${unknownOptions.length > 1 ? 'options' : 'option'}: ` +
            `${unknownOptions
                .map((name) => /^[^-]$/.test(name) ? `-${name}` : `--${name}`)
                .join(' ')}\n` +
            `Try \`${cli.name} --help\` for valid options.`);
        return;
    }
    main({
        template: options.template,
        test: options.test,
    }).catch((error) => {
        process.exitCode = 1;
        console.error(error instanceof Error ? error.message : error);
    });
})();
//# sourceMappingURL=index.js.map