module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../',
  testRegex: '\\.integration\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/main.ts',
    '!src/**/*.module.ts',
  ],
  coverageDirectory: './coverage-integration',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@cloudphone/shared$': '<rootDir>/../shared/src',
    '^@cloudphone/shared/(.*)$': '<rootDir>/../shared/src/$1',
  },
  testTimeout: 30000, // 集成测试可能需要更长时间
};
