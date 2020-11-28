"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const path_1 = require("path");
const git_1 = require("@npmcli/git");
const get_roots_1 = require("get-roots");
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
const hosted_git_info_1 = require("./utils/hosted-git-info");
const installed_dependencies_1 = require("./utils/installed-dependencies");
const package_json_1 = require("./utils/package-json");
const repository_1 = require("./utils/repository");
async function tryReadFile(filepath) {
    return await utils_1.readFileAsync(filepath).catch(() => undefined);
}
function getRepositoryVars({ gitInfo }) {
    return {
        repo: {
            user: gitInfo.user,
            project: gitInfo.project,
            shortcut(...args) {
                var _a, _b;
                const kwargs = (_a = args.pop()) !== null && _a !== void 0 ? _a : {};
                const committish = (_b = hosted_git_info_1.getCommittish(kwargs)) !== null && _b !== void 0 ? _b : (kwargs.semver ? `semver:${kwargs.semver}` : '');
                return gitInfo.shortcut({ committish });
            },
        },
    };
}
function getRepositoryFilters({ packageRootFullpath, pkg, templateFullpath, gitInfo, reportError, }) {
    const version = typeof pkg.version === 'string' ? pkg.version : '';
    const gitRootPath = utils_1.catchError(() => get_roots_1.getGitRoot(packageRootFullpath), packageRootFullpath);
    const getReleasedVersions = utils_1.cachedPromise(async () => await repository_1.ReleasedVersions.fetch(gitInfo)
        .catch(error => {
        if (error instanceof Error) {
            reportError(`Failed to fetch git tags for remote repository:\n${utils_1.indent(error.message)}`);
        }
        else {
            reportError(utils_1.errorMsgTag `Failed to fetch git tags for remote repository: ${error}`);
        }
        return undefined;
    }));
    const getHeadCommitSha1 = utils_1.cachedPromise(async () => await git_1.spawn(['rev-parse', 'HEAD'])
        .then(({ stdout }) => stdout.trim())
        .catch(() => null));
    return {
        isOlderReleasedVersion: isOlderReleasedVersion_1.isOlderReleasedVersionGen({
            getHeadCommitSha1,
            getReleasedVersions,
        }),
        repoBrowseURL: repoBrowseURL_1.repoBrowseURLGen({
            templateFullpath,
            gitRootPath,
            getCommittish: hosted_git_info_1.getCommittish,
            getHeadCommitSha1,
            getReleasedVersions,
            version,
            gitInfo,
        }),
    };
}
function getRepositoryVarsAndFilters({ packageRootFullpath, pkgFileFullpath, pkg, templateFullpath, reportError, }) {
    const gitInfo = package_json_1.getRepositoryInfo({
        pkgFileFullpath,
        pkg,
        reportError,
    });
    if (!gitInfo) {
        return {
            newTemplateContext: {},
            newFilters: {},
        };
    }
    return {
        newTemplateContext: getRepositoryVars({ gitInfo }),
        newFilters: getRepositoryFilters({
            packageRootFullpath,
            pkg,
            templateFullpath,
            gitInfo,
            reportError,
        }),
    };
}
async function processTest({ templateFullpath, generateFileFullpath, generateText, }) {
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
async function main({ template, test, reportError = console.error, }) {
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
    const pkgData = package_json_1.readPkgJson({ packageRootFullpath, reportError });
    if (pkgData) {
        const { pkgFileFullpath, pkg } = pkgData;
        templateContext.pkg = pkg;
        const { newTemplateContext, newFilters } = getRepositoryVarsAndFilters({
            packageRootFullpath,
            pkgFileFullpath,
            pkg,
            templateFullpath,
            reportError,
        });
        Object.assign(templateContext, newTemplateContext);
        Object.assign(nunjucksFilters, newFilters);
    }
    const deps = installed_dependencies_1.getDepsRecord({ packageRootFullpath, reportError });
    if (deps)
        templateContext.deps = deps;
    const generateFileFullpath = path_1.resolve(destDirFullpath, 'README.md');
    const generateText = await renderer_1.renderNunjucksWithFrontmatter(templateCodeWithFrontmatter, templateContext, {
        cwd,
        filters: nunjucksFilters,
        extensions: nunjucksTags,
    });
    if (test) {
        await processTest({
            templateFullpath,
            generateFileFullpath,
            generateText,
        });
    }
    else {
        await utils_1.writeFileAsync(utils_1.cwdRelativePath(generateFileFullpath), generateText);
    }
}
exports.main = main;
//# sourceMappingURL=main.js.map