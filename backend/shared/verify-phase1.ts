/**
 * Phase 1 Verification Script
 *
 * 验证所有 Phase 1 工具是否可以正确导入和使用
 */

// ========== 验证 Phase 1.1: Transaction, Lock, Retry ==========
import {
  Transaction,
  Transactional,
  TransactionWithOptions,
  TransactionPropagation,
  TransactionOptions,
} from './src/database/transaction.decorator';

import { DistributedLockService, Lock, LockConfig } from './src/lock/distributed-lock.service';

import { DistributedLockModule } from './src/lock/distributed-lock.module';

import {
  Retry,
  retryWithBackoff,
  NetworkError,
  TimeoutError,
  TemporaryError,
  DockerError,
  AdbError,
  DatabaseTemporaryError,
  ServiceUnavailableError,
  RateLimitError,
  RetryOptions,
} from './src/common/retry.decorator';

// ========== 验证 Phase 1.2: Saga ==========
import {
  SagaOrchestratorService,
  SagaModule,
  SagaState,
  SagaStep,
  SagaDefinition,
  SagaStatus,
  SagaType,
} from './src/saga';

// ========== 验证 Phase 1.3: Testing ==========
import { TransactionTestHelper } from './src/testing/transaction-test-helper';
import {
  ConcurrencyTestHelper,
  ConcurrencyTestResult,
  RaceConditionTestResult,
} from './src/testing/concurrency-test-helper';

import {
  createTestDataSource,
  clearAllTables,
  resetDatabase,
  runInTestTransaction,
  waitForDatabase,
} from './src/testing/test-database.config';

// ========== 验证统一导出 ==========
import {
  // Phase 1.1
  Transaction as T1,
  DistributedLockService as DLS,
  Retry as R1,

  // Phase 1.2
  SagaOrchestratorService as SOS,
  SagaModule as SM,

  // Phase 1.3
  TransactionTestHelper as TTH,
  ConcurrencyTestHelper as CTH,
} from './src/index';

console.log('✅ Phase 1.1 imports: Transaction, Lock, Retry');
console.log('✅ Phase 1.2 imports: Saga Orchestrator');
console.log('✅ Phase 1.3 imports: Testing Utilities');
console.log('✅ All Phase 1 tools are available and properly exported');

// 验证类型
const verifyTypes = () => {
  // Transaction types
  const txOptions: TransactionOptions = {
    propagation: TransactionPropagation.REQUIRED,
  };

  // Lock types
  const lockConfig: LockConfig = {
    ttl: 5000,
    retries: 3,
  };

  // Retry types
  const retryOptions: RetryOptions = {
    maxAttempts: 3,
    baseDelayMs: 1000,
  };

  // Saga types
  const sagaStep: SagaStep = {
    name: 'TEST_STEP',
    execute: async (state) => state,
    compensate: async (state) => {},
  };

  const sagaDefinition: SagaDefinition = {
    type: SagaType.PAYMENT_REFUND,
    steps: [sagaStep],
  };

  // Testing types
  const concurrencyResult: ConcurrencyTestResult<any> = {
    successes: [],
    failures: [],
    duration: 0,
    successRate: 1.0,
  };

  const raceResult: RaceConditionTestResult<any> = {
    results: [],
    conflicts: 0,
    duration: 0,
  };

  console.log('✅ All TypeScript types are correctly defined');
};

verifyTypes();

console.log('\n🎉 Phase 1 Verification Complete!');
console.log('\nSummary:');
console.log('- Phase 1.1: Transaction, Lock, Retry ✅');
console.log('- Phase 1.2: Saga Orchestrator ✅');
console.log('- Phase 1.3: Testing Utilities ✅');
console.log('\nAll tools are ready for Phase 2 implementation! 🚀');
