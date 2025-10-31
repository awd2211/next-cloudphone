/**
 * Testing Utilities Module
 *
 * 提供用于测试事务、并发和分布式系统的辅助工具
 *
 * 包含工具:
 * - TransactionTestHelper: 事务测试辅助类
 * - ConcurrencyTestHelper: 并发测试辅助类
 * - Test Helpers: 测试辅助函数
 * - Mock Factories: Mock对象工厂
 *
 * 使用方法:
 * ```typescript
 * import { TransactionTestHelper, ConcurrencyTestHelper, createAuthToken } from '@cloudphone/shared/testing';
 * ```
 */

export { TransactionTestHelper } from './transaction-test-helper';
export { ConcurrencyTestHelper } from './concurrency-test-helper';

export type { ConcurrencyTestResult, RaceConditionTestResult } from './concurrency-test-helper';

export {
  createTestDataSource,
  clearAllTables,
  resetDatabase,
  runInTestTransaction,
  waitForDatabase,
} from './test-database.config';

// 导出测试辅助函数
export {
  createTestApp,
  generateTestJwt,
  createAuthToken,
  mockAuthGuard,
  mockRolesGuard,
  generateServiceToken,
  authenticatedRequest,
  assertHttpResponse,
  sleep,
  retryUntil,
  clearRepository,
  mockRabbitMQMessage,
  assertEventPublished,
  createPaginationParams,
  randomString,
  randomUUID,
  randomEmail,
  toBeRecentDate,
  DatabaseTestHelper,
  RedisTestHelper,
} from './test-helpers';

// 导出所有Mock工厂函数
export * from './mock-factories';
