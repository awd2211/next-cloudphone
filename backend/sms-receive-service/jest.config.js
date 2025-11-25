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
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 40,
      lines: 40,
      statements: 40,
    },
  },
};
