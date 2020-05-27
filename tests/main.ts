import * as path from 'path';

import * as PKG_DATA from '../package.json';
import execa = require('execa');

const tsNodePath = path.relative(
    '.',
    path.resolve(__dirname, '..', 'node_modules', '.bin', 'ts-node'),
);
const cliPath = path.relative(
    '.',
    path.resolve(__dirname, '..', 'src', 'index.ts'),
);

describe('cli', () => {
    const cliName = PKG_DATA.name.replace(/^@[^/]+\//, '');
    const execCli = async (
        ...options: readonly string[]
    ): Promise<execa.ExecaChildProcess> =>
        execa(tsNodePath, ['--transpile-only', cliPath, ...options], {
            reject: false,
        });

    describe('option', () => {
        const versionStr = `${cliName}/${PKG_DATA.version} ${process.platform}-${process.arch} node-${process.version}`;
        const helpMatching = expect.not.stringMatching(/^$/);

        it('--version', async () => {
            expect(await execCli('--version')).toMatchObject({
                exitCode: 0,
                stdout: versionStr,
                stderr: '',
            });
        });
        it('-v', async () => {
            expect(await execCli('-v')).toMatchObject({
                exitCode: 0,
                stdout: versionStr,
                stderr: '',
            });
        });
        it('-V', async () => {
            expect(await execCli('-V')).toMatchObject({
                exitCode: 0,
                stdout: versionStr,
                stderr: '',
            });
        });

        it('--help', async () => {
            expect(await execCli('--help')).toMatchObject({
                exitCode: 0,
                stdout: helpMatching,
                stderr: '',
            });
        });
        it('-h', async () => {
            expect(await execCli('-h')).toMatchObject({
                exitCode: 0,
                stdout: helpMatching,
                stderr: '',
            });
        });

        it('invalid short option', async () => {
            expect(await execCli('-z')).toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: `unknown option: -z\nTry \`${cliName} --help\` for valid options.`,
            });
        });
        it('invalid short options', async () => {
            expect(await execCli('-axzyb')).toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: `unknown options: -a -x -z -y -b\nTry \`${cliName} --help\` for valid options.`,
            });
        });
        it('invalid long option', async () => {
            expect(await execCli('--invalid')).toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: `unknown option: --invalid\nTry \`${cliName} --help\` for valid options.`,
            });
        });
        it('invalid long options', async () => {
            expect(
                await execCli('--unknown', '--party-parrot', '--fooBar'),
            ).toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: `unknown options: --unknown --partyParrot --fooBar\nTry \`${cliName} --help\` for valid options.`,
            });
        });
        it('invalid short and long options', async () => {
            expect(
                await execCli(
                    '-zy',
                    '--unknown',
                    '-f',
                    '--party-parrot',
                    '--tailVore',
                ),
            ).toMatchObject({
                exitCode: 1,
                stdout: '',
                stderr: `unknown options: -z -y --unknown -f --partyParrot --tailVore\nTry \`${cliName} --help\` for valid options.`,
            });
        });
    });
});
