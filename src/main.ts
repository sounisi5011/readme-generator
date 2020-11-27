import { resolve as resolvePath } from 'path';

import { spawn as gitSpawn } from '@npmcli/git';
import { getGitRoot } from 'get-roots';
import hostedGitInfo from 'hosted-git-info';

import { renderNunjucksWithFrontmatter } from './renderer';
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
import { ReleasedVersions } from './utils/repository';

async function tryReadFile(filepath: string): Promise<Buffer | undefined> {
    return await readFileAsync(filepath).catch(() => undefined);
}

function tryRequire(filepath: string): unknown {
    return catchError(() => require(resolvePath(filepath)));
}

// ----- //

const cwd = process.cwd();

const nunjucksTags = [SetPropExtension];

const nunjucksFilters = {
    omitPackageScope,
    npmURL,
    execCommand,
    linesSelectedURL: linesSelectedURL,
};

export async function main({ template, test }: { template: string; test: true | undefined }): Promise<void> {
    const packageRootFullpath = cwd;
    const templateFullpath = resolvePath(packageRootFullpath, template);
    const destDirFullpath = packageRootFullpath;
    const templateCodeWithFrontmatter = await readFileAsync(cwdRelativePath(templateFullpath), 'utf8');
    const templateContext = {};

    const pkgFileFullpath = resolvePath(packageRootFullpath, 'package.json');
    const pkg = tryRequire(pkgFileFullpath);
    if (!isObject(pkg)) {
        console.error(errorMsgTag`Failed to read file ${cwdRelativePath(pkgFileFullpath)}`);
    } else {
        Object.assign(templateContext, { pkg });

        const version = typeof pkg.version === 'string' ? pkg.version : '';
        const repositoryURL = typeof pkg.repository === 'string'
            ? pkg.repository
            : isObject(pkg.repository) && typeof pkg.repository.url === 'string'
            ? pkg.repository.url
            : '';
        const gitInfo = hostedGitInfo.fromUrl(repositoryURL);
        if (!gitInfo) {
            console.error(
                `Failed to detect remote repository. `
                    + (pkg.repository === undefined
                        ? errorMsgTag`'repository' field does not exist in ${cwdRelativePath(pkgFileFullpath)} file.`
                        : errorMsgTag`Unknown structure of 'repository' field in ${
                            cwdRelativePath(pkgFileFullpath)
                        } file: ${pkg.repository}`),
            );
        } else {
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
                await ReleasedVersions.fetch(gitInfo).catch(error => {
                    console.error(`Failed to fetch git tags for remote repository:${
                        error instanceof Error
                            ? `\n${indent(error.message)}`
                            : errorMsgTag` ${error}`
                    }`);
                })
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

            Object.assign(templateContext, {
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

            Object.assign(nunjucksFilters, {
                isOlderReleasedVersion: isOlderReleasedVersionGen({ getHeadCommitSha1, getReleasedVersions }),
                repoBrowseURL: repoBrowseURLGen(
                    { templateFullpath, gitRootPath, getCommittish, version, isUseVersionBrowseURL, gitInfo },
                ),
            });
        }
    }

    const pkgLockFileFullpath = resolvePath(packageRootFullpath, 'package-lock.json');
    const pkgLock = tryRequire(pkgLockFileFullpath);
    if (!isObject(pkgLock)) {
        console.error(errorMsgTag`Failed to read file ${cwdRelativePath(pkgLockFileFullpath)}`);
    } else {
        const { dependencies } = pkgLock;
        if (!isObject(dependencies)) {
            console.error(
                errorMsgTag`Failed to read npm lockfile ${
                    cwdRelativePath(pkgLockFileFullpath)
                }. Reason: Invalid structure where 'dependencies' field does not exist.`,
            );
        } else {
            interface DepsRecord {
                [pkgName: string]: {
                    name: string;
                    version: string;
                    v: string;
                };
            }
            const deps = Object.entries(dependencies)
                .reduce<DepsRecord>((deps, [pkgName, pkgData]) => {
                    if (isObject(pkgData) && typeof pkgData.version === 'string') {
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

    const generateFileFullpath = resolvePath(destDirFullpath, 'README.md');
    const generateText = await renderNunjucksWithFrontmatter(
        templateCodeWithFrontmatter,
        templateContext,
        { cwd, filters: nunjucksFilters, extensions: nunjucksTags },
    );

    if (test) {
        const origReadmeContent = await tryReadFile(generateFileFullpath);
        if (origReadmeContent && !origReadmeContent.equals(Buffer.from(generateText))) {
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
    } else {
        await writeFileAsync(cwdRelativePath(generateFileFullpath), generateText);
    }
}
