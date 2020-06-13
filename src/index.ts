#!/usr/bin/env node

import { readFile, writeFile } from 'fs';
import { dirname, relative as relativePath, resolve as resolvePath } from 'path';
import { inspect, promisify } from 'util';

import { spawn as gitSpawn } from '@npmcli/git';
import { cac } from 'cac';
import execa from 'execa';
import { getGitRoot } from 'get-roots';
import matter from 'gray-matter';
import hostedGitInfo from 'hosted-git-info';
import npa from 'npm-package-arg';
import npmPath from 'npm-path';
import { configure as nunjucksConfigure } from 'nunjucks';

import { SetPropExtension } from './template-tags/setProp';
import { cachedPromise, indent, isNonEmptyString, isObject } from './utils';
import { equalsGitTagAndCommit, fetchReleasedVersions } from './utils/repository';

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(v => typeof v === 'string');
}

function copyRegExp(
    sourceRegExp: RegExp,
    { addFlags = '', deleteFlags = '' }: { addFlags?: string; deleteFlags?: string } = {},
): RegExp {
    return new RegExp(
        sourceRegExp.source,
        (
            sourceRegExp.flags
                .replace(/./g, char => deleteFlags.includes(char) ? '' : char)
        ) + addFlags,
    );
}

function catchError<TValue>(callback: () => TValue): TValue | undefined;
function catchError<TValue, TDefault>(callback: () => TValue, defaultValue: TDefault): TValue | TDefault;
function catchError<TValue, TDefault = undefined>(callback: () => TValue, defaultValue?: TDefault): TValue | TDefault {
    try {
        return callback();
    } catch (_) {
        return defaultValue as TDefault;
    }
}

function getLinesStartPos(text: string): number[] {
    const lineBreakRegExp = /\r\n?|\n/g;
    const lineStartPosList = [0];
    for (let match; (match = lineBreakRegExp.exec(text));) {
        lineStartPosList.push(match.index + match[0].length);
    }
    return lineStartPosList;
}

function strPos2lineNum(lineStartPosList: readonly number[], strPos: number): number {
    return (
        lineStartPosList.findIndex((lineStartPos, index) => {
            const nextLineStartPos = lineStartPosList[index + 1] ?? Infinity;
            return lineStartPos <= strPos && strPos < nextLineStartPos;
        })
    ) + 1;
}

async function tryReadFile(filepath: string): Promise<Buffer | undefined> {
    return await readFileAsync(filepath).catch(() => undefined);
}

function tryRequire(filepath: string): unknown {
    return catchError(() => require(resolvePath(filepath)));
}

function errorMsgTag(template: TemplateStringsArray, ...substitutions: unknown[]): string {
    return template
        .map((str, index) =>
            index === 0
                ? str
                : (
                    inspect(substitutions[index - 1], {
                        depth: 0,
                        breakLength: Infinity,
                        maxArrayLength: 5,
                    })
                ) + str
        )
        .join('');
}

function omitPackageScope(packageName: string): string;
function omitPackageScope(packageName: undefined): undefined;
function omitPackageScope(packageName: string | undefined): string | undefined;
function omitPackageScope(packageName: string | undefined): string | undefined {
    return packageName?.replace(/^@[^/]+\//, '');
}

// ----- //

const cwd = process.cwd();
const cwdRelativePath = relativePath.bind(null, cwd);

const nunjucksTags = [SetPropExtension];

const nunjucksFilters = {
    omitPackageScope(packageName: unknown): string {
        if (typeof packageName !== 'string') {
            throw new TypeError(errorMsgTag`Invalid packageName value: ${packageName}`);
        }
        return omitPackageScope(packageName);
    },
    npmURL(packageData: unknown): string {
        do {
            if (typeof packageData === 'string') {
                const result = catchError(() => npa(packageData.trim()));
                if (!result) break;
                if ((result.type === 'tag' || result.type === 'version') && isNonEmptyString(result.name)) {
                    return result.rawSpec
                        ? `https://www.npmjs.com/package/${result.name}/v/${result.rawSpec}`
                        : `https://www.npmjs.com/package/${result.name}`;
                }
            } else if (isObject(packageData)) {
                if (isNonEmptyString(packageData.name) && isNonEmptyString(packageData.version)) {
                    return `https://www.npmjs.com/package/${packageData.name}/v/${packageData.version}`;
                }
            }
        } while (false);
        throw new TypeError(errorMsgTag`Invalid packageData value: ${packageData}`);
    },
    async execCommand(command: unknown): Promise<string> {
        const $PATH = await new Promise<string>((resolve, reject) => {
            npmPath.get((error, $PATH) => {
                if (error) {
                    reject(error);
                } else {
                    resolve($PATH);
                }
            });
        });
        const options: execa.Options = {
            all: true,
            env: { [npmPath.PATH]: $PATH },
        };
        let proc: execa.ExecaChildProcess | undefined;
        if (typeof command === 'string') {
            proc = execa.command(command, options);
        } else if (isStringArray(command)) {
            const [file, ...args] = command;
            proc = execa(file, args, options);
        }
        if (!proc) {
            throw new TypeError(errorMsgTag`Invalid command value: ${command}`);
        }

        const result = await proc;
        return result.all ?? result.stdout;
    },
    linesSelectedURL: (() => {
        interface RepoData {
            repoType: hostedGitInfo.Hosts;
            fileFullpath: string;
            browseURL: string;
        }

        interface Options {
            start: RegExp;
            end?: RegExp;
        }

        function isRepoData(value: unknown): value is RepoData {
            return (
                isObject(value)
                && typeof value.repoType === 'string'
                && typeof value.fileFullpath === 'string'
                && typeof value.browseURL === 'string'
            );
        }

        function isOptions(value: unknown): value is Options {
            return (
                isObject(value)
                && value.start instanceof RegExp
                && (value.end instanceof RegExp || value.end === undefined)
            );
        }

        const cacheStore = new Map<
            string,
            { content: string; lineStartPosList: number[] }
        >();

        return async (repoData: unknown, options: unknown): Promise<string> => {
            if (!isRepoData(repoData)) {
                throw new TypeError(errorMsgTag`Invalid repoData value: ${repoData}`);
            }
            if (!(options instanceof RegExp || isOptions(options))) {
                throw new TypeError(errorMsgTag`Invalid options value: ${options}`);
            }
            const startLineRegExp = copyRegExp(
                options instanceof RegExp ? options : options.start,
                { deleteFlags: 'gy' },
            );
            const endLineRegExp = options instanceof RegExp
                ? null
                : options.end && copyRegExp(options.end, { deleteFlags: 'gy' });
            const isFullMatchMode = options instanceof RegExp;

            const fileFullpath = resolvePath(repoData.fileFullpath);
            let fileData = cacheStore.get(fileFullpath);
            if (!fileData) {
                const fileContent = await readFileAsync(cwdRelativePath(fileFullpath), 'utf8');
                fileData = {
                    content: fileContent,
                    lineStartPosList: getLinesStartPos(fileContent),
                };
            }
            const { content: fileContent, lineStartPosList } = fileData;

            const [startLineNumber, endLineNumber] = lineStartPosList.reduce(
                (
                    [startLineNumber, endLineNumber, triedMatch],
                    lineStartPos,
                    index,
                ) => {
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
                                } else {
                                    startLineNumber = strPos2lineNum(lineStartPosList, matchEndPos);
                                }
                            }
                        }
                        if (
                            endLineRegExp
                            && isTryEndLineMatching
                            && startLineNumber
                            && startLineNumber <= currentLineNumber
                        ) {
                            const match = endLineRegExp.exec(text);
                            triedMatch.end = true;

                            if (match) {
                                const matchEndPos = lineStartPos + match.index + match[0].length;
                                endLineNumber = strPos2lineNum(lineStartPosList, matchEndPos);
                            }
                        }
                    }

                    return [startLineNumber, endLineNumber, triedMatch];
                },
                [0, 0, { start: false, end: false }],
            );
            if (!startLineNumber) {
                throw new Error(
                    errorMsgTag`RegExp does not match with ${
                        cwdRelativePath(fileFullpath)
                    } contents. The following pattern was passed in`
                        + (options instanceof RegExp
                            ? errorMsgTag` the argument: ${startLineRegExp}`
                            : errorMsgTag` the options.start argument: ${startLineRegExp}`),
                );
            }
            if (endLineRegExp && !endLineNumber) {
                throw new Error(
                    errorMsgTag`RegExp does not match with ${cwdRelativePath(fileFullpath)} contents.`
                        + errorMsgTag` The following pattern was passed in the options.end argument: ${endLineRegExp}`,
                );
            }

            let browseURLSuffix;
            const isMultiLine = endLineNumber && startLineNumber !== endLineNumber;
            if (repoData.repoType === 'github') {
                browseURLSuffix = isMultiLine
                    ? `#L${startLineNumber}-L${endLineNumber}`
                    : `#L${startLineNumber}`;
            } else if (repoData.repoType === 'gitlab') {
                browseURLSuffix = isMultiLine
                    ? `#L${startLineNumber}-${endLineNumber}`
                    : `#L${startLineNumber}`;
            } else if (repoData.repoType === 'bitbucket') {
                browseURLSuffix = isMultiLine
                    ? `#lines-${startLineNumber}:${endLineNumber}`
                    : `#lines-${startLineNumber}`;
            } else if (repoData.repoType === 'gist') {
                browseURLSuffix = isMultiLine
                    ? `-L${startLineNumber}-L${endLineNumber}`
                    : `-L${startLineNumber}`;
            } else {
                throw new Error(errorMsgTag`Unknown repoData.repoType value: ${repoData.repoType}`);
            }

            return repoData.browseURL + browseURLSuffix;
        };
    })(),
};

type nunjucksRenderStringArgs = Parameters<ReturnType<typeof nunjucksConfigure>['renderString']>;
async function renderNunjucks(
    templateCode: nunjucksRenderStringArgs[0],
    templateContext: nunjucksRenderStringArgs[1],
    nunjucksFilters: Record<
        string,
        (...args: [unknown, ...unknown[]]) => unknown
    >,
): Promise<string> {
    const nunjucksEnv = nunjucksConfigure(cwd, {
        autoescape: false,
        throwOnUndefined: true,
    });

    nunjucksTags.forEach(ExtensionClass => {
        nunjucksEnv.addExtension(ExtensionClass.name, new ExtensionClass());
    });

    Object.entries(nunjucksFilters).forEach(([filterName, filterFunc]) => {
        nunjucksEnv.addFilter(
            filterName,
            (...args) => {
                const callback = args.pop();
                (async () => filterFunc(args.shift(), ...args))()
                    .then(
                        value => callback(null, value),
                        async error => {
                            if (error instanceof Error) {
                                error.message = `${filterName}() filter / ${error.message}`;
                            }
                            throw error;
                        },
                    )
                    .catch(callback);
            },
            true,
        );
    });

    type renderStringReturnType = Parameters<Exclude<nunjucksRenderStringArgs[2], undefined>>[1];
    const generateText = await new Promise<renderStringReturnType>(
        (resolve, reject) => {
            nunjucksEnv.renderString(
                templateCode,
                templateContext,
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                },
            );
        },
    );
    if (typeof generateText !== 'string') {
        throw new Error(
            'Nunjucks render failed: nunjucks.Environment#renderString() method returned a non-string value',
        );
    }

    return generateText;
}

async function main({ template, test }: { template: string; test: true | undefined }): Promise<void> {
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
                await fetchReleasedVersions(gitInfo).catch(error => {
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

                if (!releasedVersions[version]) return true;

                return await equalsGitTagAndCommit(gitInfo, releasedVersions[version], headCommitSha1);
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
                async isReleasedVersion(version: string): Promise<boolean | null> {
                    if (!await getHeadCommitSha1()) return null;

                    const releasedVersions = await getReleasedVersions();
                    if (!releasedVersions) return null;

                    return Boolean(releasedVersions[version]);
                },
                async isOlderReleasedVersion(version: string): Promise<boolean | null> {
                    const headCommitSha1 = await getHeadCommitSha1();
                    if (!headCommitSha1) return null;

                    const releasedVersions = await getReleasedVersions();
                    if (!releasedVersions) return null;
                    if (!releasedVersions[version]) return false;

                    return !(await equalsGitTagAndCommit(gitInfo, releasedVersions[version], headCommitSha1));
                },
                async repoBrowseURL(filepath: unknown, options: unknown = {}) {
                    if (typeof filepath !== 'string') {
                        throw new TypeError(errorMsgTag`Invalid filepath value: ${filepath}`);
                    }
                    if (!isObject(options)) {
                        throw new TypeError(errorMsgTag`Invalid options value: ${options}`);
                    }

                    const fileFullpath = /^\.{1,2}\//.test(filepath)
                        ? resolvePath(dirname(templateFullpath), filepath)
                        : resolvePath(gitRootPath, filepath.replace(/^[/]+/g, ''));
                    const gitRepoPath = relativePath(gitRootPath, fileFullpath);

                    const committish = getCommittish(options)
                        ?? (version && (await isUseVersionBrowseURL()) ? `v${version}` : '');
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
    const { content: templateCode, data: templateData } = matter(templateCodeWithFrontmatter);
    Object.assign(templateContext, templateData);
    const generateText = await renderNunjucks(
        templateCode,
        templateContext,
        nunjucksFilters,
    );

    if (test) {
        const origReadmeContent = await tryReadFile(generateFileFullpath);
        if (origReadmeContent && !origReadmeContent.equals(Buffer.from(generateText))) {
            const templateFilename = cwdRelativePath(templateFullpath);
            const generateFilename = cwdRelativePath(generateFileFullpath);
            throw new Error(
                `Do not edit '${generateFilename}' manually! You MUST edit '${templateFilename}' instead of '${generateFilename}'`,
            );
        }
    } else {
        await writeFileAsync(cwdRelativePath(generateFileFullpath), generateText);
    }
}

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

    const cli = cac(omitPackageScope(pkgName));
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
