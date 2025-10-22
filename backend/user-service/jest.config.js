module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  // 模块名称映射 - 使用手动 mock
  moduleNameMapper: {
    '^uuid$': '<rootDir>/__mocks__/uuid',
    '^bcryptjs$': '<rootDir>/__mocks__/bcryptjs',
  },
};
