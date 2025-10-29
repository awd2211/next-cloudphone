/**
 * Testing Utilities Module
 *
 * 提供用于测试事务、并发和分布式系统的辅助工具
 *
 * 包含工具:
 * - TransactionTestHelper: 事务测试辅助类
 * - ConcurrencyTestHelper: 并发测试辅助类
 *
 * 使用方法:
 * ```typescript
 * import { TransactionTestHelper, ConcurrencyTestHelper } from '@cloudphone/shared/testing';
 * ```
 */

export { TransactionTestHelper } from './transaction-test-helper';
export { ConcurrencyTestHelper } from './concurrency-test-helper';

export type {
  ConcurrencyTestResult,
  RaceConditionTestResult,
} from './concurrency-test-helper';

export {
  createTestDataSource,
  clearAllTables,
  resetDatabase,
  runInTestTransaction,
  waitForDatabase,
} from './test-database.config';
