export const repoUserName = `sounisi5011`;
export const repoProjectName = `readme-generator`;
export const repoURL = `https://github.com/${repoUserName}/${repoProjectName}`;
export const repository = `https://github.com/${repoUserName}/${repoProjectName}.git`;
export const tagShaRecord = {
    'v0.0.1': '27b718e05c1c6596513ecbe2c1d0478dc1148fcc',
    'v0.0.2': '536eacc3d4762f6de171aecbf3f06efbeb87fd3a',
    'v0.0.3': '197cdb32edab666a319dae57ba24911e0b637a49',
};
export const versions = {
    '0.0.1': {
        sha: 'a0e52c36d07703dc4caf2ae4f0841308ded75b1a',
        ref: 'v0.0.1',
        rawRef: 'refs/tags/v0.0.1',
        type: 'tag',
    },
    '0.0.2': {
        sha: 'e5780d0b10dd0581641164522dc036141ad37992',
        ref: 'v0.0.2',
        rawRef: 'refs/tags/v0.0.2',
        type: 'tag',
    },
    '0.0.3': {
        sha: 'ec6a9cbe3559cdb08479444044d56f72c7dc8996',
        ref: 'v0.0.3',
        rawRef: 'refs/tags/v0.0.3',
        type: 'tag',
    },
} as const;
export const releasedVersion = Object.keys(versions)[2];

export const notFoundRepoURL = `https://github.com/sounisi5011/example-repo-private`;
