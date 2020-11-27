"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const path_1 = require("path");
const git_1 = require("@npmcli/git");
const get_roots_1 = require("get-roots");
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
const installed_dependencies_1 = require("./utils/installed-dependencies");
const repository_1 = require("./utils/repository");
async function tryReadFile(filepath) {
    return await utils_1.readFileAsync(filepath).catch(() => undefined);
}
function tryRequire(filepath) {
    return utils_1.catchError(() => require(path_1.resolve(filepath)));
}
// ----- //
function parsePkgJson({ packageRootFullpath, templateFullpath, reportError }) {
    const newTemplateContext = {};
    const newFilters = {};
    const pkgFileFullpath = path_1.resolve(packageRootFullpath, 'package.json');
    const pkg = tryRequire(pkgFileFullpath);
    if (!utils_1.isObject(pkg)) {
        reportError(utils_1.errorMsgTag `Failed to read file ${utils_1.cwdRelativePath(pkgFileFullpath)}`);
        return { newTemplateContext, newFilters };
    }
    Object.assign(newTemplateContext, { pkg });
    const version = typeof pkg.version === 'string' ? pkg.version : '';
    const repositoryURL = typeof pkg.repository === 'string'
        ? pkg.repository
        : utils_1.isObject(pkg.repository) && typeof pkg.repository.url === 'string'
            ? pkg.repository.url
            : '';
    const gitInfo = hosted_git_info_1.default.fromUrl(repositoryURL);
    if (!gitInfo) {
        reportError(`Failed to detect remote repository. ` + (pkg.repository === undefined
            ? utils_1.errorMsgTag `'repository' field does not exist in ${utils_1.cwdRelativePath(pkgFileFullpath)} file.`
            : utils_1.errorMsgTag `Unknown structure of 'repository' field in ${utils_1.cwdRelativePath(pkgFileFullpath)} file: ${pkg.repository}`));
        return { newTemplateContext, newFilters };
    }
    const getCommittish = (kwargs) => {
        for (const prop of ['committish', 'commit', 'branch', 'tag']) {
            if (typeof kwargs[prop] === 'string' && kwargs[prop]) {
                return kwargs[prop];
            }
        }
        return undefined;
    };
    const gitRootPath = utils_1.catchError(() => get_roots_1.getGitRoot(packageRootFullpath), packageRootFullpath);
    const getReleasedVersions = utils_1.cachedPromise(async () => await repository_1.ReleasedVersions.fetch(gitInfo).catch(error => reportError(`Failed to fetch git tags for remote repository:${error instanceof Error
        ? `\n${utils_1.indent(error.message)}`
        : utils_1.errorMsgTag ` ${error}`}`)));
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
    Object.assign(newTemplateContext, {
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
    Object.assign(newFilters, {
        isOlderReleasedVersion: isOlderReleasedVersion_1.isOlderReleasedVersionGen({ getHeadCommitSha1, getReleasedVersions }),
        repoBrowseURL: repoBrowseURL_1.repoBrowseURLGen({ templateFullpath, gitRootPath, getCommittish, version, isUseVersionBrowseURL, gitInfo }),
    });
    return { newTemplateContext, newFilters };
}
async function processTest({ templateFullpath, generateFileFullpath, generateText }) {
    const origReadmeContent = await tryReadFile(generateFileFullpath);
    if (!origReadmeContent || origReadmeContent.equals(Buffer.from(generateText)))
        return;
    const templateFilename = utils_1.cwdRelativePath(templateFullpath);
    const generateFilename = utils_1.cwdRelativePath(generateFileFullpath);
    const coloredDiffText = diff_1.createUnifiedDiffText({
        filename: generateFilename,
        oldStr: origReadmeContent.toString('utf8'),
        newStr: generateText,
        indent: ' '.repeat(2),
    });
    throw new Error(`Do not edit '${generateFilename}' manually! You MUST edit '${templateFilename}' instead of '${generateFilename}'`
        + `\n\n${coloredDiffText}\n`);
}
async function main({ template, test, reportError = console.error }) {
    const cwd = process.cwd();
    const packageRootFullpath = cwd;
    const templateFullpath = path_1.resolve(packageRootFullpath, template);
    const destDirFullpath = packageRootFullpath;
    const templateCodeWithFrontmatter = await utils_1.readFileAsync(utils_1.cwdRelativePath(templateFullpath), 'utf8');
    const templateContext = {};
    const nunjucksTags = [setProp_1.SetPropExtension];
    const nunjucksFilters = {
        omitPackageScope: omitPackageScope_1.omitPackageScope,
        npmURL: npmURL_1.npmURL,
        execCommand: execCommand_1.execCommand,
        linesSelectedURL: linesSelectedURL_1.linesSelectedURL,
    };
    const { newTemplateContext, newFilters } = parsePkgJson({ packageRootFullpath, templateFullpath, reportError });
    Object.assign(templateContext, newTemplateContext);
    Object.assign(nunjucksFilters, newFilters);
    const deps = installed_dependencies_1.getDepsRecord({ packageRootFullpath, reportError });
    if (deps)
        Object.assign(templateContext, { deps });
    const generateFileFullpath = path_1.resolve(destDirFullpath, 'README.md');
    const generateText = await renderer_1.renderNunjucksWithFrontmatter(templateCodeWithFrontmatter, templateContext, { cwd, filters: nunjucksFilters, extensions: nunjucksTags });
    if (test) {
        await processTest({ templateFullpath, generateFileFullpath, generateText });
    }
    else {
        await utils_1.writeFileAsync(utils_1.cwdRelativePath(generateFileFullpath), generateText);
    }
}
exports.main = main;
//# sourceMappingURL=main.js.map