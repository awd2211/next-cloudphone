const baseConfig = require('./jest.config');
delete baseConfig.testRegex;

module.exports = {
  ...baseConfig,
  testMatch: [
    '**/permissions/**/*.spec.ts',
    '!**/permissions/__tests__/**',
  ],
  collectCoverageFrom: [
    'src/permissions/**/*.ts',
    '!src/permissions/**/*.spec.ts',
    '!src/permissions/**/*.dto.ts',
    '!src/permissions/**/*.entity.ts',
    '!src/permissions/**/__tests__/**',
    '!src/permissions/**/interfaces/**',
  ],
};
