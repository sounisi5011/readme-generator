#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const util_1 = require("util");
const git_1 = require("@npmcli/git");
const cac_1 = require("cac");
const execa_1 = __importDefault(require("execa"));
const get_roots_1 = require("get-roots");
const gray_matter_1 = __importDefault(require("gray-matter"));
const hosted_git_info_1 = __importDefault(require("hosted-git-info"));
const npm_package_arg_1 = __importDefault(require("npm-package-arg"));
const npm_path_1 = __importDefault(require("npm-path"));
const nunjucks_1 = require("nunjucks");
const setProp_1 = require("./template-tags/setProp");
const utils_1 = require("./utils");
const repository_1 = require("./utils/repository");
const readFileAsync = util_1.promisify(fs_1.readFile);
const writeFileAsync = util_1.promisify(fs_1.writeFile);
function isStringArray(value) {
    return Array.isArray(value) && value.every(v => typeof v === 'string');
}
function copyRegExp(sourceRegExp, { addFlags = '', deleteFlags = '' } = {}) {
    return new RegExp(sourceRegExp.source, (sourceRegExp.flags
        .replace(/./g, char => deleteFlags.includes(char) ? '' : char)) + addFlags);
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
    })) + 1;
}
async function tryReadFile(filepath) {
    return await readFileAsync(filepath).catch(() => undefined);
}
function tryRequire(filepath) {
    return catchError(() => require(path_1.resolve(filepath)));
}
function errorMsgTag(template, ...substitutions) {
    return template
        .map((str, index) => index === 0
        ? str
        : (util_1.inspect(substitutions[index - 1], {
            depth: 0,
            breakLength: Infinity,
            maxArrayLength: 5,
        })) + str)
        .join('');
}
function omitPackageScope(packageName) {
    return packageName === null || packageName === void 0 ? void 0 : packageName.replace(/^@[^/]+\//, '');
}
// ----- //
const cwd = process.cwd();
const cwdRelativePath = path_1.relative.bind(null, cwd);
const nunjucksTags = [setProp_1.SetPropExtension];
const nunjucksFilters = {
    omitPackageScope(packageName) {
        if (typeof packageName !== 'string') {
            throw new TypeError(errorMsgTag `Invalid packageName value: ${packageName}`);
        }
        return omitPackageScope(packageName);
    },
    npmURL(packageData) {
        do {
            if (typeof packageData === 'string') {
                const result = catchError(() => npm_package_arg_1.default(packageData.trim()));
                if (!result)
                    break;
                if ((result.type === 'tag' || result.type === 'version') && utils_1.isNonEmptyString(result.name)) {
                    return result.rawSpec
                        ? `https://www.npmjs.com/package/${result.name}/v/${result.rawSpec}`
                        : `https://www.npmjs.com/package/${result.name}`;
                }
            }
            else if (utils_1.isObject(packageData)) {
                if (utils_1.isNonEmptyString(packageData.name) && utils_1.isNonEmptyString(packageData.version)) {
                    return `https://www.npmjs.com/package/${packageData.name}/v/${packageData.version}`;
                }
            }
        } while (false);
        throw new TypeError(errorMsgTag `Invalid packageData value: ${packageData}`);
    },
    async execCommand(command) {
        var _a;
        const $PATH = await new Promise((resolve, reject) => {
            npm_path_1.default.get((error, $PATH) => {
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
            env: { [npm_path_1.default.PATH]: $PATH },
        };
        let proc;
        if (typeof command === 'string') {
            proc = execa_1.default.command(command, options);
        }
        else if (isStringArray(command)) {
            const [file, ...args] = command;
            proc = execa_1.default(file, args, options);
        }
        if (!proc) {
            throw new TypeError(errorMsgTag `Invalid command value: ${command}`);
        }
        const result = await proc;
        return (_a = result.all) !== null && _a !== void 0 ? _a : result.stdout;
    },
    linesSelectedURL: (() => {
        function isRepoData(value) {
            return (utils_1.isObject(value)
                && typeof value.repoType === 'string'
                && typeof value.fileFullpath === 'string'
                && typeof value.browseURL === 'string');
        }
        function isOptions(value) {
            return (utils_1.isObject(value)
                && value.start instanceof RegExp
                && (value.end instanceof RegExp || value.end === undefined));
        }
        const cacheStore = new Map();
        return async (repoData, options) => {
            if (!isRepoData(repoData)) {
                throw new TypeError(errorMsgTag `Invalid repoData value: ${repoData}`);
            }
            if (!(options instanceof RegExp || isOptions(options))) {
                throw new TypeError(errorMsgTag `Invalid options value: ${options}`);
            }
            const startLineRegExp = copyRegExp(options instanceof RegExp ? options : options.start, { deleteFlags: 'gy' });
            const endLineRegExp = options instanceof RegExp
                ? null
                : options.end && copyRegExp(options.end, { deleteFlags: 'gy' });
            const isFullMatchMode = options instanceof RegExp;
            const fileFullpath = path_1.resolve(repoData.fileFullpath);
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
                const isTryStartLineMatching = !startLineNumber
                    && (!startLineRegExp.multiline || !triedMatch.start);
                const isTryEndLineMatching = endLineRegExp
                    && !endLineNumber
                    && (!endLineRegExp.multiline || !triedMatch.end);
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
                    if (endLineRegExp
                        && isTryEndLineMatching
                        && startLineNumber
                        && startLineNumber <= currentLineNumber) {
                        const match = endLineRegExp.exec(text);
                        triedMatch.end = true;
                        if (match) {
                            const matchEndPos = lineStartPos + match.index + match[0].length;
                            endLineNumber = strPos2lineNum(lineStartPosList, matchEndPos);
                        }
                    }
                }
                return [startLineNumber, endLineNumber, triedMatch];
            }, [0, 0, { start: false, end: false }]);
            if (!startLineNumber) {
                throw new Error(errorMsgTag `RegExp does not match with ${cwdRelativePath(fileFullpath)} contents. The following pattern was passed in`
                    + (options instanceof RegExp
                        ? errorMsgTag ` the argument: ${startLineRegExp}`
                        : errorMsgTag ` the options.start argument: ${startLineRegExp}`));
            }
            if (endLineRegExp && !endLineNumber) {
                throw new Error(errorMsgTag `RegExp does not match with ${cwdRelativePath(fileFullpath)} contents.`
                    + errorMsgTag ` The following pattern was passed in the options.end argument: ${endLineRegExp}`);
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
    const nunjucksEnv = nunjucks_1.configure(cwd, {
        autoescape: false,
        throwOnUndefined: true,
    });
    nunjucksTags.forEach(ExtensionClass => {
        nunjucksEnv.addExtension(ExtensionClass.name, new ExtensionClass());
    });
    Object.entries(nunjucksFilters).forEach(([filterName, filterFunc]) => {
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
async function main({ template, test }) {
    const packageRootFullpath = cwd;
    const templateFullpath = path_1.resolve(packageRootFullpath, template);
    const destDirFullpath = packageRootFullpath;
    const templateCodeWithFrontmatter = await readFileAsync(cwdRelativePath(templateFullpath), 'utf8');
    const templateContext = {};
    const pkgFileFullpath = path_1.resolve(packageRootFullpath, 'package.json');
    const pkg = tryRequire(pkgFileFullpath);
    if (!utils_1.isObject(pkg)) {
        console.error(errorMsgTag `Failed to read file ${cwdRelativePath(pkgFileFullpath)}`);
    }
    else {
        Object.assign(templateContext, { pkg });
        const version = typeof pkg.version === 'string' ? pkg.version : '';
        const repositoryURL = typeof pkg.repository === 'string'
            ? pkg.repository
            : utils_1.isObject(pkg.repository) && typeof pkg.repository.url === 'string'
                ? pkg.repository.url
                : '';
        const gitInfo = hosted_git_info_1.default.fromUrl(repositoryURL);
        if (!gitInfo) {
            console.error(`Failed to detect remote repository. `
                + (pkg.repository === undefined
                    ? errorMsgTag `'repository' field does not exist in ${cwdRelativePath(pkgFileFullpath)} file.`
                    : errorMsgTag `Unknown structure of 'repository' field in ${cwdRelativePath(pkgFileFullpath)} file: ${pkg.repository}`));
        }
        else {
            const getCommittish = (kwargs) => {
                for (const prop of ['committish', 'commit', 'branch', 'tag']) {
                    if (typeof kwargs[prop] === 'string' && kwargs[prop]) {
                        return kwargs[prop];
                    }
                }
                return undefined;
            };
            const gitRootPath = catchError(() => get_roots_1.getGitRoot(packageRootFullpath), packageRootFullpath);
            const getReleasedVersions = utils_1.cachedPromise(async () => await repository_1.fetchReleasedVersions(gitInfo).catch(error => {
                console.error(`Failed to fetch git tags for remote repository:${error instanceof Error
                    ? `\n${utils_1.indent(error.message)}`
                    : errorMsgTag ` ${error}`}`);
            }));
            const getHeadCommitSha1 = utils_1.cachedPromise(async () => await git_1.spawn(['rev-parse', 'HEAD']).then(({ stdout }) => stdout.trim()).catch(() => null));
            const isUseVersionBrowseURL = utils_1.cachedPromise(async () => {
                const headCommitSha1 = await getHeadCommitSha1();
                if (!headCommitSha1)
                    return false;
                const releasedVersions = await getReleasedVersions();
                if (!releasedVersions)
                    return false;
                if (!releasedVersions[version])
                    return true;
                return await repository_1.equalsGitTagAndCommit(gitInfo, releasedVersions[version], headCommitSha1);
            });
            Object.assign(templateContext, {
                repo: {
                    user: gitInfo.user,
                    project: gitInfo.project,
                    shortcut(...args) {
                        var _a, _b;
                        const kwargs = (_a = args.pop()) !== null && _a !== void 0 ? _a : {};
                        const committish = (_b = getCommittish(kwargs)) !== null && _b !== void 0 ? _b : (kwargs.semver ? `semver:${kwargs.semver}` : '');
                        return gitInfo.shortcut({ committish });
                    },
                },
            });
            Object.assign(nunjucksFilters, {
                async isReleasedVersion(version) {
                    if (!await getHeadCommitSha1())
                        return null;
                    const releasedVersions = await getReleasedVersions();
                    if (!releasedVersions)
                        return null;
                    return Boolean(releasedVersions[version]);
                },
                async isOlderReleasedVersion(version) {
                    const headCommitSha1 = await getHeadCommitSha1();
                    if (!headCommitSha1)
                        return null;
                    const releasedVersions = await getReleasedVersions();
                    if (!releasedVersions)
                        return null;
                    if (!releasedVersions[version])
                        return false;
                    return !(await repository_1.equalsGitTagAndCommit(gitInfo, releasedVersions[version], headCommitSha1));
                },
                async repoBrowseURL(filepath, options = {}) {
                    var _a;
                    if (typeof filepath !== 'string') {
                        throw new TypeError(errorMsgTag `Invalid filepath value: ${filepath}`);
                    }
                    if (!utils_1.isObject(options)) {
                        throw new TypeError(errorMsgTag `Invalid options value: ${options}`);
                    }
                    const fileFullpath = /^\.{1,2}\//.test(filepath)
                        ? path_1.resolve(path_1.dirname(templateFullpath), filepath)
                        : path_1.resolve(gitRootPath, filepath.replace(/^[/]+/g, ''));
                    const gitRepoPath = path_1.relative(gitRootPath, fileFullpath);
                    const committish = (_a = getCommittish(options)) !== null && _a !== void 0 ? _a : (version && (await isUseVersionBrowseURL()) ? `v${version}` : '');
                    const browseURL = gitInfo.browse(gitRepoPath, { committish });
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
    const pkgLockFileFullpath = path_1.resolve(packageRootFullpath, 'package-lock.json');
    const pkgLock = tryRequire(pkgLockFileFullpath);
    if (!utils_1.isObject(pkgLock)) {
        console.error(errorMsgTag `Failed to read file ${cwdRelativePath(pkgLockFileFullpath)}`);
    }
    else {
        const { dependencies } = pkgLock;
        if (!utils_1.isObject(dependencies)) {
            console.error(errorMsgTag `Failed to read npm lockfile ${cwdRelativePath(pkgLockFileFullpath)}. Reason: Invalid structure where 'dependencies' field does not exist.`);
        }
        else {
            const deps = Object.entries(dependencies)
                .reduce((deps, [pkgName, pkgData]) => {
                if (utils_1.isObject(pkgData) && typeof pkgData.version === 'string') {
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
    const generateFileFullpath = path_1.resolve(destDirFullpath, 'README.md');
    const { content: templateCode, data: templateData } = gray_matter_1.default(templateCodeWithFrontmatter);
    Object.assign(templateContext, templateData);
    const generateText = await renderNunjucks(templateCode, templateContext, nunjucksFilters);
    if (test) {
        const origReadmeContent = await tryReadFile(generateFileFullpath);
        if (origReadmeContent && !origReadmeContent.equals(Buffer.from(generateText))) {
            const templateFilename = cwdRelativePath(templateFullpath);
            const generateFilename = cwdRelativePath(generateFileFullpath);
            throw new Error(`Do not edit '${generateFilename}' manually! You MUST edit '${templateFilename}' instead of '${generateFilename}'`);
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
    if (utils_1.isObject(PKG)) {
        if (typeof PKG.name === 'string')
            pkgName = PKG.name;
        if (typeof PKG.version === 'string')
            pkgVersion = PKG.version;
        if (typeof PKG.description === 'string')
            pkgDescription = PKG.description;
    }
    const cli = cac_1.cac(omitPackageScope(pkgName));
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
    main({
        template: options.template,
        test: options.test,
    }).catch(error => {
        process.exitCode = 1;
        console.error(error instanceof Error ? error.message : error);
    });
})();
//# sourceMappingURL=index.js.map