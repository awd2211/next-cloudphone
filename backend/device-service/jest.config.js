module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/index.ts',
    '!**/*.interface.ts',
    '!**/*.dto.ts',
    '!**/*.entity.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@cloudphone/shared$': '<rootDir>/../../shared/src',
    '^@cloudphone/shared/(.*)$': '<rootDir>/../../shared/src/$1',
    '^uuid$': '<rootDir>/__mocks__/uuid.ts',
    '^p-limit$': '<rootDir>/__mocks__/p-limit.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(p-limit|uuid)/)',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
