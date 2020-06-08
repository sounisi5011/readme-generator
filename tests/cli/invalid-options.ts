import { cliName, createTmpDir, execCli, fileEntryExists } from '../helpers';

describe('invalid options', () => {
    it('short option', async () => {
        const cwd = await createTmpDir(__filename, 'short-option');

        await expect(execCli(cwd, ['-z'])).resolves.toMatchObject({
            exitCode: 1,
            stdout: '',
            stderr: [
                `unknown option: -z`,
                `Try \`${cliName} --help\` for valid options.`,
            ].join('\n'),
        });

        await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
    });

    it('short options', async () => {
        const cwd = await createTmpDir(__filename, 'short-opts');

        await expect(execCli(cwd, ['-axzyb'])).resolves.toMatchObject({
            exitCode: 1,
            stdout: '',
            stderr: [
                `unknown options: -a -x -z -y -b`,
                `Try \`${cliName} --help\` for valid options.`,
            ].join('\n'),
        });

        await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
    });

    it('long option', async () => {
        const cwd = await createTmpDir(__filename, 'long-option');

        await expect(execCli(cwd, ['--invalid'])).resolves.toMatchObject({
            exitCode: 1,
            stdout: '',
            stderr: [
                `unknown option: --invalid`,
                `Try \`${cliName} --help\` for valid options.`,
            ].join('\n'),
        });

        await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
    });

    it('long options', async () => {
        const cwd = await createTmpDir(__filename, 'long-opts');

        await expect(execCli(cwd, ['--unknown', '--party-parrot', '--fooBar'])).resolves.toMatchObject({
            exitCode: 1,
            stdout: '',
            stderr: [
                `unknown options: --unknown --partyParrot --fooBar`,
                `Try \`${cliName} --help\` for valid options.`,
            ].join('\n'),
        });

        await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
    });

    it('short and long options', async () => {
        const cwd = await createTmpDir(__filename, 'short+long-opts');

        await expect(execCli(cwd, [
            '-zy',
            '--unknown',
            '-f',
            '--party-parrot',
            '--tailVore',
        ])).resolves.toMatchObject({
            exitCode: 1,
            stdout: '',
            stderr: [
                `unknown options: -z -y --unknown -f --partyParrot --tailVore`,
                `Try \`${cliName} --help\` for valid options.`,
            ].join('\n'),
        });

        await expect(fileEntryExists(cwd, 'README.md')).resolves.toBe(false);
    });
});
