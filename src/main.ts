import { resolve as resolvePath } from 'path';

import { spawn as gitSpawn } from '@npmcli/git';
import { getGitRoot } from 'get-roots';
import hostedGitInfo from 'hosted-git-info';

import { NunjucksFilterFn, renderNunjucksWithFrontmatter } from './renderer';
import { execCommand } from './template-filters/execCommand';
import { isOlderReleasedVersionGen } from './template-filters/isOlderReleasedVersion';
import { linesSelectedURL } from './template-filters/linesSelectedURL';
import { npmURL } from './template-filters/npmURL';
import { omitPackageScope } from './template-filters/omitPackageScope';
import { repoBrowseURLGen } from './template-filters/repoBrowseURL';
import { SetPropExtension } from './template-tags/setProp';
import {
    cachedPromise,
    catchError,
    cwdRelativePath,
    errorMsgTag,
    hasProp,
    indent,
    isObject,
    readFileAsync,
    writeFileAsync,
} from './utils';
import { createUnifiedDiffText } from './utils/diff';
import { getDepsRecord } from './utils/installed-dependencies';
import { ReleasedVersions } from './utils/repository';

export type ReportErrorFn = (message: string) => void;
interface CommitIshKeywordArguments {
    committish?: string;
    commit?: string;
    branch?: string;
    tag?: string;
}
export type GetReleasedVersionsFn = () => Promise<ReleasedVersions | undefined>;
export type GetHeadCommitSha1Fn = () => Promise<string | null>;

async function tryReadFile(filepath: string): Promise<Buffer | undefined> {
    return await readFileAsync(filepath).catch(() => undefined);
}

function tryRequire(filepath: string): unknown {
    return catchError(() => require(resolvePath(filepath)));
}

// ----- //

function readPkgJson(
    { packageRootFullpath, reportError }: { packageRootFullpath: string; reportError: ReportErrorFn },
): { pkgFileFullpath: string; pkg: Record<PropertyKey, unknown> } | null {
    const pkgFileFullpath = resolvePath(packageRootFullpath, 'package.json');
    const pkg = tryRequire(pkgFileFullpath);
    if (isObject(pkg)) return { pkgFileFullpath, pkg };

    reportError(errorMsgTag`Failed to read file ${cwdRelativePath(pkgFileFullpath)}`);
    return null;
}

/**
 * @link https://docs.npmjs.com/cli/v6/configuring-npm/package-json#repository
 */
function getRepositoryURL(pkg: { repository: unknown }): string | null {
    if (typeof pkg.repository === 'string') return pkg.repository;
    if (isObject(pkg.repository) && typeof pkg.repository.url === 'string') return pkg.repository.url;
    return null;
}

function getRepositoryInfo(
    { pkgFileFullpath, pkg, reportError }: {
        pkgFileFullpath: string;
        pkg: { repository?: unknown };
        reportError: ReportErrorFn;
    },
): hostedGitInfo | null {
    if (!hasProp(pkg, 'repository') || pkg.repository === undefined) {
        reportError(
            errorMsgTag`Failed to detect remote repository. 'repository' field does not exist in ${
                cwdRelativePath(pkgFileFullpath)
            } file.`,
        );
        return null;
    }

    const repositoryURL = getRepositoryURL(pkg);
    const gitInfo = repositoryURL && hostedGitInfo.fromUrl(repositoryURL);
    if (!gitInfo) {
        reportError(
            errorMsgTag`Failed to detect remote repository. Unknown structure of 'repository' field in ${
                cwdRelativePath(pkgFileFullpath)
            } file: ${pkg.repository}`,
        );
        return null;
    }

    return gitInfo;
}

function getCommittish(kwargs: CommitIshKeywordArguments): string | undefined {
    for (const prop of ['committish', 'commit', 'branch', 'tag'] as const) {
        if (typeof kwargs[prop] === 'string' && kwargs[prop]) {
            return kwargs[prop];
        }
    }
    return undefined;
}
export type GetCommittishFn = typeof getCommittish;

function getRepositoryVars({ gitInfo }: { gitInfo: hostedGitInfo }): Record<string, unknown> {
    return {
        repo: {
            user: gitInfo.user,
            project: gitInfo.project,
            shortcut(...args: [CommitIshKeywordArguments & { semver?: string }] | []) {
                const kwargs = args.pop() ?? {};
                const committish = getCommittish(kwargs) ?? (kwargs.semver ? `semver:${kwargs.semver}` : '');
                return gitInfo.shortcut({ committish });
            },
        },
    };
}

function getRepositoryFilters({ packageRootFullpath, pkg, templateFullpath, gitInfo, reportError }: {
    packageRootFullpath: string;
    pkg: Record<string, unknown>;
    templateFullpath: string;
    gitInfo: hostedGitInfo;
    reportError: ReportErrorFn;
}): Record<string, NunjucksFilterFn> {
    const version = typeof pkg.version === 'string' ? pkg.version : '';
    const gitRootPath = catchError(() => getGitRoot(packageRootFullpath), packageRootFullpath);
    const getReleasedVersions: GetReleasedVersionsFn = cachedPromise(async () =>
        await ReleasedVersions.fetch(gitInfo).catch(error => {
            if (error instanceof Error) {
                reportError(`Failed to fetch git tags for remote repository:\n${indent(error.message)}`);
            } else {
                reportError(errorMsgTag`Failed to fetch git tags for remote repository: ${error}`);
            }
            return undefined;
        })
    );
    const getHeadCommitSha1: GetHeadCommitSha1Fn = cachedPromise(async () =>
        await gitSpawn(['rev-parse', 'HEAD']).then(({ stdout }) => stdout.trim()).catch(() => null)
    );

    return {
        // @ts-expect-error // eslint-disable-line @typescript-eslint/ban-ts-comment
        // TODO: The isOlderReleasedVersion function does not validate the argument!
        //       WE MUST FIX IT NOW!!
        isOlderReleasedVersion: isOlderReleasedVersionGen({ getHeadCommitSha1, getReleasedVersions }),
        repoBrowseURL: repoBrowseURLGen(
            { templateFullpath, gitRootPath, getCommittish, getHeadCommitSha1, getReleasedVersions, version, gitInfo },
        ),
    };
}

function getRepositoryVarsAndFilters(
    { packageRootFullpath, pkgFileFullpath, pkg, templateFullpath, reportError }: {
        packageRootFullpath: string;
        pkgFileFullpath: string;
        pkg: Record<string, unknown>;
        templateFullpath: string;
        reportError: ReportErrorFn;
    },
): { newTemplateContext: Record<string, unknown>; newFilters: Record<string, NunjucksFilterFn> } {
    const gitInfo = getRepositoryInfo({ pkgFileFullpath, pkg, reportError });
    if (!gitInfo) return { newTemplateContext: {}, newFilters: {} };

    return {
        newTemplateContext: getRepositoryVars({ gitInfo }),
        newFilters: getRepositoryFilters({ packageRootFullpath, pkg, templateFullpath, gitInfo, reportError }),
    };
}

async function processTest(
    { templateFullpath, generateFileFullpath, generateText }: {
        templateFullpath: string;
        generateFileFullpath: string;
        generateText: string;
    },
): Promise<void> {
    const origReadmeContent = await tryReadFile(generateFileFullpath);
    if (!origReadmeContent || origReadmeContent.equals(Buffer.from(generateText))) return;

    const templateFilename = cwdRelativePath(templateFullpath);
    const generateFilename = cwdRelativePath(generateFileFullpath);
    const coloredDiffText = createUnifiedDiffText(
        {
            filename: generateFilename,
            oldStr: origReadmeContent.toString('utf8'),
            newStr: generateText,
            indent: ' '.repeat(2),
        },
    );

    throw new Error(
        `Do not edit '${generateFilename}' manually! You MUST edit '${templateFilename}' instead of '${generateFilename}'`
            + `\n\n${coloredDiffText}\n`,
    );
}

export async function main(
    { template, test, reportError = console.error }: {
        template: string;
        test: true | undefined;
        reportError?: ReportErrorFn;
    },
): Promise<void> {
    const cwd = process.cwd();
    const packageRootFullpath = cwd;
    const templateFullpath = resolvePath(packageRootFullpath, template);
    const destDirFullpath = packageRootFullpath;
    const templateCodeWithFrontmatter = await readFileAsync(cwdRelativePath(templateFullpath), 'utf8');
    const templateContext = {};
    const nunjucksTags = [SetPropExtension];
    const nunjucksFilters = {
        omitPackageScope,
        npmURL,
        execCommand,
        linesSelectedURL: linesSelectedURL,
    };

    const pkgData = readPkgJson({ packageRootFullpath, reportError });
    if (pkgData) {
        const { pkgFileFullpath, pkg } = pkgData;
        Object.assign(templateContext, { pkg });

        const { newTemplateContext, newFilters } = getRepositoryVarsAndFilters(
            { packageRootFullpath, pkgFileFullpath, pkg, templateFullpath, reportError },
        );
        Object.assign(templateContext, newTemplateContext);
        Object.assign(nunjucksFilters, newFilters);
    }

    const deps = getDepsRecord({ packageRootFullpath, reportError });
    if (deps) Object.assign(templateContext, { deps });

    const generateFileFullpath = resolvePath(destDirFullpath, 'README.md');
    const generateText = await renderNunjucksWithFrontmatter(
        templateCodeWithFrontmatter,
        templateContext,
        { cwd, filters: nunjucksFilters, extensions: nunjucksTags },
    );

    if (test) {
        await processTest({ templateFullpath, generateFileFullpath, generateText });
    } else {
        await writeFileAsync(cwdRelativePath(generateFileFullpath), generateText);
    }
}
