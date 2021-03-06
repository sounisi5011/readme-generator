import escapeStringRegexp from 'escape-string-regexp';

import { cliName, createTmpDir, execCli, fileEntryExists, PKG_DATA } from '../../helpers';
import genWarn from '../../helpers/warning-message';

const helpMatching = expect.stringMatching(
    new RegExp(`^${
        [
            escapeStringRegexp(`${cliName} v${PKG_DATA.version}`),
            ``,
            escapeStringRegexp(PKG_DATA.description),
            ``,
            `Usage:`,
            escapeStringRegexp(`  $ ${cliName} [options]`),
            ``,
            String.raw`Options:(?:\n  -[^\n]+)+`,
        ].join('\n')
    }$`),
);

describe('help options', () => {
    for (
        const [arg, dirname] of Object.entries({
            '--help': 'long',
            '-h': 'short',
        })
    ) {
        // eslint-disable-next-line jest/valid-title
        it(arg, async () => {
            const cwd = await createTmpDir(__filename, dirname);

            await expect(execCli(cwd, [arg])).resolves.toMatchObject({
                exitCode: 0,
                stdout: helpMatching,
                stderr: genWarn([]),
            });

            await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
        });
    }
});
