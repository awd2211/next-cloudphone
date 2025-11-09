module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.integration.spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.integration.spec.ts',
    '!src/main.ts',
  ],
  coverageDirectory: './coverage/integration',
  testEnvironment: 'node',
  testTimeout: 30000, // 集成测试需要更长的超时时间
  setupFilesAfterEnv: ['<rootDir>/test/setup-integration.ts'],
  moduleNameMapper: {
    '^@cloudphone/shared$': '<rootDir>/../shared/src',
    '^@cloudphone/shared/(.*)$': '<rootDir>/../shared/src/$1',
    // 不要 mock uuid，集成测试需要真实的 UUID - 映射到实际的 uuid 包
    '^uuid$': require.resolve('uuid'),
  },
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
  verbose: true,
  forceExit: true, // 测试完成后强制退出
  detectOpenHandles: true, // 检测未关闭的句柄
};
