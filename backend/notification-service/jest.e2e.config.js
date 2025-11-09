module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@cloudphone/shared$': '<rootDir>/../shared/src',
    '^@cloudphone/shared/(.*)$': '<rootDir>/../shared/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.interface.ts',
    '!src/main.ts',
  ],
  coverageDirectory: './coverage-e2e',
  testTimeout: 30000, // 30 seconds for E2E tests
  setupFilesAfterEnv: ['<rootDir>/test/setup-e2e.ts'],
  // Run tests sequentially to avoid port conflicts
  maxWorkers: 1,
};
