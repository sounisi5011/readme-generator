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
    indent,
    isObject,
    readFileAsync,
    writeFileAsync,
} from './utils';
import { createUnifiedDiffText } from './utils/diff';
import { getDepsRecord } from './utils/installed-dependencies';
import { ReleasedVersions } from './utils/repository';

export type ReportErrorFn = (message: string) => void;

async function tryReadFile(filepath: string): Promise<Buffer | undefined> {
    return await readFileAsync(filepath).catch(() => undefined);
}

function tryRequire(filepath: string): unknown {
    return catchError(() => require(resolvePath(filepath)));
}

// ----- //

function parsePkgJson(
    { packageRootFullpath, templateFullpath, reportError }: {
        packageRootFullpath: string;
        templateFullpath: string;
        reportError: ReportErrorFn;
    },
): { newTemplateContext: Record<string, unknown>; newFilters: Record<string, NunjucksFilterFn> } {
    const newTemplateContext = {};
    const newFilters = {};

    const pkgFileFullpath = resolvePath(packageRootFullpath, 'package.json');
    const pkg = tryRequire(pkgFileFullpath);
    if (!isObject(pkg)) {
        reportError(errorMsgTag`Failed to read file ${cwdRelativePath(pkgFileFullpath)}`);
        return { newTemplateContext, newFilters };
    }
    Object.assign(newTemplateContext, { pkg });

    const version = typeof pkg.version === 'string' ? pkg.version : '';
    const repositoryURL = typeof pkg.repository === 'string'
        ? pkg.repository
        : isObject(pkg.repository) && typeof pkg.repository.url === 'string'
        ? pkg.repository.url
        : '';
    const gitInfo = hostedGitInfo.fromUrl(repositoryURL);
    if (!gitInfo) {
        reportError(
            `Failed to detect remote repository. ` + (pkg.repository === undefined
                ? errorMsgTag`'repository' field does not exist in ${cwdRelativePath(pkgFileFullpath)} file.`
                : errorMsgTag`Unknown structure of 'repository' field in ${
                    cwdRelativePath(pkgFileFullpath)
                } file: ${pkg.repository}`),
        );
        return { newTemplateContext, newFilters };
    }

    interface CommitIshKeywordArguments {
        committish?: string;
        commit?: string;
        branch?: string;
        tag?: string;
    }
    const getCommittish = (kwargs: CommitIshKeywordArguments): string | undefined => {
        for (const prop of ['committish', 'commit', 'branch', 'tag'] as const) {
            if (typeof kwargs[prop] === 'string' && kwargs[prop]) {
                return kwargs[prop];
            }
        }
        return undefined;
    };

    const gitRootPath = catchError(() => getGitRoot(packageRootFullpath), packageRootFullpath);
    const getReleasedVersions = cachedPromise(async () =>
        await ReleasedVersions.fetch(gitInfo).catch(error =>
            reportError(
                `Failed to fetch git tags for remote repository:${
                    error instanceof Error
                        ? `\n${indent(error.message)}`
                        : errorMsgTag` ${error}`
                }`,
            )
        )
    );
    const getHeadCommitSha1 = cachedPromise(async () =>
        await gitSpawn(['rev-parse', 'HEAD']).then(({ stdout }) => stdout.trim()).catch(() => null)
    );
    const isUseVersionBrowseURL = cachedPromise(async () => {
        const headCommitSha1 = await getHeadCommitSha1();
        if (!headCommitSha1) return false;

        const releasedVersions = await getReleasedVersions();
        if (!releasedVersions) return false;

        const versionTag = releasedVersions.get(version);
        if (!versionTag) return true;

        return (await versionTag.fetchCommitSHA1()) === headCommitSha1;
    });

    Object.assign(newTemplateContext, {
        repo: {
            user: gitInfo.user,
            project: gitInfo.project,
            shortcut(...args: [CommitIshKeywordArguments & { semver?: string }] | []) {
                const kwargs = args.pop() ?? {};
                const committish = getCommittish(kwargs) ?? (kwargs.semver ? `semver:${kwargs.semver}` : '');
                return gitInfo.shortcut({ committish });
            },
        },
    });

    Object.assign(newFilters, {
        isOlderReleasedVersion: isOlderReleasedVersionGen({ getHeadCommitSha1, getReleasedVersions }),
        repoBrowseURL: repoBrowseURLGen(
            { templateFullpath, gitRootPath, getCommittish, version, isUseVersionBrowseURL, gitInfo },
        ),
    });

    return { newTemplateContext, newFilters };
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

    const { newTemplateContext, newFilters } = parsePkgJson({ packageRootFullpath, templateFullpath, reportError });
    Object.assign(templateContext, newTemplateContext);
    Object.assign(nunjucksFilters, newFilters);

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
