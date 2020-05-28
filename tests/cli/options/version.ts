import {
    cliName,
    createTmpDir,
    execCli,
    fileEntryExists,
    PKG_DATA,
} from '../../helpers';

const versionStr = `${cliName}/${PKG_DATA.version} ${process.platform}-${process.arch} node-${process.version}`;

describe('version options', () => {
    for (const [arg, dirname] of Object.entries({
        '--version': 'long',
        '-v': 'short-lower-case',
        '-V': 'short-upper-case',
    })) {
        // eslint-disable-next-line jest/valid-title
        it(arg, async () => {
            const cwd = await createTmpDir(__filename, dirname);

            await expect(execCli(cwd, [arg])).resolves.toMatchObject({
                exitCode: 0,
                stdout: versionStr,
                stderr: '',
            });

            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(
                false,
            );
        });
    }
});
