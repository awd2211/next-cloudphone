module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/api'],
  testMatch: ['**/*.e2e.spec.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: ['api/**/*.ts', '!**/*.spec.ts', '!**/node_modules/**'],
  coverageDirectory: 'coverage',
  testTimeout: 30000, // E2E tests may take longer
  verbose: true,
  forceExit: true,
  detectOpenHandles: false,
};
