const { tsPluginConfig: dprintTsPluginConfig } = require('./dprint.config');

module.exports = {
    env: {
        es6: true,
        node: true,
    },
    extends: ['eslint:recommended', 'standard'],
    parserOptions: {
        ecmaVersion: 2018,
    },
    rules: {
        'no-unused-expressions': 'error',
        'import/no-extraneous-dependencies': [
            'error',
            { devDependencies: ['*', '.*', 'tests/**'] },
        ],
    },
    overrides: [
        {
            files: '*.js',
            extends: ['plugin:dprint/recommended'],
            rules: {
                'dprint/dprint': [
                    'error',
                    {
                        config: dprintTsPluginConfig,
                    },
                ],
            },
        },
        {
            files: '*.ts',
            extends: [
                'plugin:@typescript-eslint/recommended',
                'plugin:import/typescript',
                'plugin:dprint/recommended',
            ],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                sourceType: 'module',
                project: [
                    './tsconfig.json',
                    './tests/tsconfig.json',
                    './tests/helpers/tsconfig.json',
                ],
            },
            plugins: ['@typescript-eslint', 'simple-import-sort'],
            rules: {
                'no-dupe-class-members': 'off',
                // The no-unused-expressions rule does not support optional chaining operator (`?.`)
                'no-unused-expressions': 'off',
                'node/no-unsupported-features/es-syntax': [
                    'error',
                    { ignores: ['modules', 'dynamicImport'] },
                ],
                '@typescript-eslint/array-type': 'warn',
                '@typescript-eslint/explicit-function-return-type': [
                    'warn',
                    { allowExpressions: true },
                ],
                '@typescript-eslint/no-inferrable-types': 'off',
                '@typescript-eslint/no-unused-expressions': 'error',
                'dprint/dprint': [
                    'error',
                    {
                        config: dprintTsPluginConfig,
                    },
                ],
                'simple-import-sort/sort': 'error',
            },
        },
        { files: '*.d.ts', rules: { 'no-useless-constructor': 'off' } },
        {
            files: [
                'tests/*.ts',
                'tests/!(helpers!(?))*/*.ts',
                'tests/!(helpers!(?))*/**/*.ts',
            ],
            extends: ['plugin:jest/recommended', 'plugin:jest/style'],
            rules: {
                'jest/consistent-test-it': 'error',
                'jest/lowercase-name': 'error',
                'jest/no-deprecated-functions': 'error',
                'jest/no-duplicate-hooks': 'error',
                'jest/no-if': 'error',
                'jest/no-test-return-statement': 'error',
                'jest/prefer-spy-on': 'error',
                'jest/prefer-strict-equal': 'error',
                'jest/prefer-todo': 'error',
                'jest/require-top-level-describe': 'error',
                'jest/valid-title': 'error',
            },
        },
    ],
};
