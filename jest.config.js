module.exports = {
  preset: 'ts-jest',
  coverageDirectory: 'coverage',
  globals: {
    'ts-jest': {
      tsConfig: '<rootDir>/tests/tsconfig.json',
    },
  },
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.ts'],
  testPathIgnorePatterns: ['<rootDir>/tests/helpers/'],
};
