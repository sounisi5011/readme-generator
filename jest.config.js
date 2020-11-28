module.exports = {
  preset: 'ts-jest',
  coverageDirectory: 'coverage',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tests/tsconfig.json',
    },
  },
  setupFilesAfterEnv: [
    'jest-extended',
  ],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/tests/helpers/',
    '<rootDir>/tests/(?:[^/]+/)*[^/]+\\.test-result/',
  ],
  testTimeout: 15 * 1000,
};
