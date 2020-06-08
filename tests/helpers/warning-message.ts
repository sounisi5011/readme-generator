interface Options {
    pkg?: true;
    repository?: true;
    pkgLock?: true;
}

export default function(options: Options): string {
    const stderrList: string[] = [];
    if (options.pkg) {
        stderrList.push(`Failed to read file 'package.json'`);
    } else if (options.repository) {
        stderrList.push(
            `Failed to detect remote repository. 'repository' field does not exist in 'package.json' file.`,
        );
    }
    if (options.pkgLock) {
        stderrList.push(`Failed to read file 'package-lock.json'`);
    }
    return stderrList.join('\n');
}
