#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const git_1 = require("@npmcli/git");
const cac_1 = require("cac");
const get_roots_1 = require("get-roots");
const gray_matter_1 = __importDefault(require("gray-matter"));
const hosted_git_info_1 = __importDefault(require("hosted-git-info"));
const renderer_1 = require("./renderer");
const execCommand_1 = require("./template-filters/execCommand");
const isOlderReleasedVersion_1 = require("./template-filters/isOlderReleasedVersion");
const linesSelectedURL_1 = require("./template-filters/linesSelectedURL");
const npmURL_1 = require("./template-filters/npmURL");
const omitPackageScope_1 = require("./template-filters/omitPackageScope");
const repoBrowseURL_1 = require("./template-filters/repoBrowseURL");
const setProp_1 = require("./template-tags/setProp");
const utils_1 = require("./utils");
const diff_1 = require("./utils/diff");
const repository_1 = require("./utils/repository");
async function tryReadFile(filepath) {
    return await utils_1.readFileAsync(filepath).catch(() => undefined);
}
function tryRequire(filepath) {
    return utils_1.catchError(() => require(path_1.resolve(filepath)));
}
// ----- //
const cwd = process.cwd();
const cwdRelativePath = path_1.relative.bind(null, cwd);
const nunjucksTags = [setProp_1.SetPropExtension];
const nunjucksFilters = {
    omitPackageScope: omitPackageScope_1.omitPackageScope,
    npmURL: npmURL_1.npmURL,
    execCommand: execCommand_1.execCommand,
    linesSelectedURL: linesSelectedURL_1.linesSelectedURLGen({ cwdRelativePath }),
};
async function main({ template, test }) {
    const packageRootFullpath = cwd;
    const templateFullpath = path_1.resolve(packageRootFullpath, template);
    const destDirFullpath = packageRootFullpath;
    const templateCodeWithFrontmatter = await utils_1.readFileAsync(cwdRelativePath(templateFullpath), 'utf8');
    const templateContext = {};
    const pkgFileFullpath = path_1.resolve(packageRootFullpath, 'package.json');
    const pkg = tryRequire(pkgFileFullpath);
    if (!utils_1.isObject(pkg)) {
        console.error(utils_1.errorMsgTag `Failed to read file ${cwdRelativePath(pkgFileFullpath)}`);
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
                    ? utils_1.errorMsgTag `'repository' field does not exist in ${cwdRelativePath(pkgFileFullpath)} file.`
                    : utils_1.errorMsgTag `Unknown structure of 'repository' field in ${cwdRelativePath(pkgFileFullpath)} file: ${pkg.repository}`));
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
            const gitRootPath = utils_1.catchError(() => get_roots_1.getGitRoot(packageRootFullpath), packageRootFullpath);
            const getReleasedVersions = utils_1.cachedPromise(async () => await repository_1.ReleasedVersions.fetch(gitInfo).catch(error => {
                console.error(`Failed to fetch git tags for remote repository:${error instanceof Error
                    ? `\n${utils_1.indent(error.message)}`
                    : utils_1.errorMsgTag ` ${error}`}`);
            }));
            const getHeadCommitSha1 = utils_1.cachedPromise(async () => await git_1.spawn(['rev-parse', 'HEAD']).then(({ stdout }) => stdout.trim()).catch(() => null));
            const isUseVersionBrowseURL = utils_1.cachedPromise(async () => {
                const headCommitSha1 = await getHeadCommitSha1();
                if (!headCommitSha1)
                    return false;
                const releasedVersions = await getReleasedVersions();
                if (!releasedVersions)
                    return false;
                const versionTag = releasedVersions.get(version);
                if (!versionTag)
                    return true;
                return (await versionTag.fetchCommitSHA1()) === headCommitSha1;
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
                isOlderReleasedVersion: isOlderReleasedVersion_1.isOlderReleasedVersionGen({ getHeadCommitSha1, getReleasedVersions }),
                repoBrowseURL: repoBrowseURL_1.repoBrowseURLGen({ templateFullpath, gitRootPath, getCommittish, version, isUseVersionBrowseURL, gitInfo }),
            });
        }
    }
    const pkgLockFileFullpath = path_1.resolve(packageRootFullpath, 'package-lock.json');
    const pkgLock = tryRequire(pkgLockFileFullpath);
    if (!utils_1.isObject(pkgLock)) {
        console.error(utils_1.errorMsgTag `Failed to read file ${cwdRelativePath(pkgLockFileFullpath)}`);
    }
    else {
        const { dependencies } = pkgLock;
        if (!utils_1.isObject(dependencies)) {
            console.error(utils_1.errorMsgTag `Failed to read npm lockfile ${cwdRelativePath(pkgLockFileFullpath)}. Reason: Invalid structure where 'dependencies' field does not exist.`);
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
    const templateFrontmatter = templateCodeWithFrontmatter.substring(0, templateCodeWithFrontmatter.length - templateCode.length);
    const dummyFrontmatter = templateFrontmatter.replace(/[^\n]+/g, '');
    const templateCodeWithDummyFrontmatter = dummyFrontmatter + templateCode;
    Object.assign(templateContext, templateData);
    const generateTextWithDummyFrontmatter = await renderer_1.renderNunjucks(templateCodeWithDummyFrontmatter, templateContext, { cwd, filters: nunjucksFilters, extensions: nunjucksTags });
    const generateText = generateTextWithDummyFrontmatter.substring(dummyFrontmatter.length);
    if (test) {
        const origReadmeContent = await tryReadFile(generateFileFullpath);
        if (origReadmeContent && !origReadmeContent.equals(Buffer.from(generateText))) {
            const templateFilename = cwdRelativePath(templateFullpath);
            const generateFilename = cwdRelativePath(generateFileFullpath);
            const coloredDiffText = diff_1.createUnifiedDiffText({
                filename: generateFilename,
                oldStr: origReadmeContent.toString('utf8'),
                newStr: generateText,
                indent: ' '.repeat(2),
            });
            throw new Error(`Do not edit '${generateFilename}' manually! You MUST edit '${templateFilename}' instead of '${generateFilename}'`
                + `\n\n${coloredDiffText}\n`);
        }
    }
    else {
        await utils_1.writeFileAsync(cwdRelativePath(generateFileFullpath), generateText);
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
    main({
        template: options.template,
        test: options.test,
    }).catch(error => {
        process.exitCode = 1;
        console.error(error instanceof Error ? error.message : error);
    });
})();
//# sourceMappingURL=index.js.map