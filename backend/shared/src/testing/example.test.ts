/**
 * Transaction and Concurrency Testing Examples
 *
 * 这个文件展示了如何使用 TransactionTestHelper 和 ConcurrencyTestHelper
 * 来测试事务和并发场景
 *
 * 注意: 这是一个示例文件，实际测试需要根据具体服务的实体和业务逻辑编写
 */

import { DataSource } from 'typeorm';
import { TransactionTestHelper } from './transaction-test-helper';
import { ConcurrencyTestHelper } from './concurrency-test-helper';

// ========================================
// 示例实体（实际使用时需要导入真实的实体）
// ========================================

// interface User {
//   id: number;
//   name: string;
//   email: string;
//   balance: number;
//   version?: number; // 用于乐观锁
// }

// ========================================
// 事务测试示例
// ========================================

describe('TransactionTestHelper Examples', () => {
  let dataSource: DataSource;
  let transactionHelper: TransactionTestHelper;

  beforeAll(async () => {
    // 创建测试数据源
    // dataSource = await createTestDataSource();
    // transactionHelper = new TransactionTestHelper(dataSource);
  });

  afterAll(async () => {
    // await dataSource.destroy();
  });

  describe('Basic Transaction Tests', () => {
    it('should commit transaction on success', async () => {
      // const result = await transactionHelper.expectTransactionCommit(
      //   async (manager) => {
      //     const user = await manager.save('User', {
      //       name: 'Test User',
      //       email: 'test@example.com',
      //       balance: 100,
      //     });
      //     return user;
      //   },
      // );
      //
      // // 验证用户已保存
      // await transactionHelper.expectRecordExists('User', {
      //   name: 'Test User',
      // });
    });

    it('should rollback transaction on error', async () => {
      // await transactionHelper.expectTransactionRollback(async (manager) => {
      //   await manager.save('User', {
      //     name: 'Should Rollback',
      //     email: 'rollback@example.com',
      //     balance: 100,
      //   });
      //
      //   // 模拟错误
      //   throw new Error('Simulated error');
      // });
      //
      // // 验证用户未保存
      // await transactionHelper.expectRecordNotExists('User', {
      //   name: 'Should Rollback',
      // });
    });

    it('should handle nested transactions', async () => {
      // await transactionHelper.runInTransaction(async (manager) => {
      //   // 外层事务
      //   const user = await manager.save('User', {
      //     name: 'Outer Transaction',
      //     email: 'outer@example.com',
      //     balance: 100,
      //   });
      //
      //   // 内层操作
      //   await manager.save('UserEvent', {
      //     userId: user.id,
      //     eventType: 'USER_CREATED',
      //     payload: {},
      //   });
      //
      //   return user;
      // });
      //
      // // 验证两个记录都已保存
      // await transactionHelper.expectRecordExists('User', {
      //   name: 'Outer Transaction',
      // });
    });
  });

  describe('Pessimistic Locking Tests', () => {
    it('should block concurrent access with pessimistic lock', async () => {
      // // 创建测试用户
      // const user = await transactionHelper.runInTransaction(
      //   async (manager) => {
      //     return await manager.save('User', {
      //       name: 'Lock Test User',
      //       email: 'lock@example.com',
      //       balance: 100,
      //     });
      //   },
      // );
      //
      // // 验证悲观锁
      // await transactionHelper.expectPessimisticLock('User', user.id);
    });

    it('should prevent lost updates with FOR UPDATE', async () => {
      // // 场景: 两个并发事务尝试更新用户余额
      // const user = await transactionHelper.runInTransaction(
      //   async (manager) => {
      //     return await manager.save('User', {
      //       name: 'Balance User',
      //       email: 'balance@example.com',
      //       balance: 100,
      //     });
      //   },
      // );
      //
      // const qr1 = transactionHelper.createQueryRunner();
      // const qr2 = transactionHelper.createQueryRunner();
      //
      // try {
      //   await qr1.connect();
      //   await qr1.startTransaction();
      //
      //   // 事务1: 获取悲观锁并更新
      //   const lockedUser = await qr1.manager
      //     .createQueryBuilder('User', 'u')
      //     .where('u.id = :id', { id: user.id })
      //     .setLock('pessimistic_write')
      //     .getOne();
      //
      //   lockedUser.balance += 50;
      //   await qr1.manager.save('User', lockedUser);
      //   await qr1.commitTransaction();
      //
      //   // 事务2: 尝试更新（应该等待事务1完成）
      //   await qr2.connect();
      //   await qr2.startTransaction();
      //
      //   const user2 = await qr2.manager
      //     .createQueryBuilder('User', 'u')
      //     .where('u.id = :id', { id: user.id })
      //     .setLock('pessimistic_write')
      //     .getOne();
      //
      //   user2.balance += 30;
      //   await qr2.manager.save('User', user2);
      //   await qr2.commitTransaction();
      //
      //   // 验证最终余额 = 100 + 50 + 30 = 180
      //   const finalUser = await dataSource.manager.findOne('User', {
      //     where: { id: user.id },
      //   });
      //   expect(finalUser.balance).toBe(180);
      // } finally {
      //   await qr1.release();
      //   await qr2.release();
      // }
    });
  });

  describe('Optimistic Locking Tests', () => {
    it('should detect concurrent modifications with version column', async () => {
      // const user = await transactionHelper.runInTransaction(
      //   async (manager) => {
      //     return await manager.save('User', {
      //       name: 'Version User',
      //       email: 'version@example.com',
      //       balance: 100,
      //       version: 0,
      //     });
      //   },
      // );
      //
      // // 测试乐观锁冲突
      // await transactionHelper.expectOptimisticLockConflict(
      //   'User',
      //   user.id,
      //   (record) => {
      //     record.balance += 50;
      //   },
      //   (record) => {
      //     record.balance += 30;
      //   },
      // );
    });
  });
});

// ========================================
// 并发测试示例
// ========================================

describe('ConcurrencyTestHelper Examples', () => {
  let concurrencyHelper: ConcurrencyTestHelper;

  beforeEach(() => {
    concurrencyHelper = new ConcurrencyTestHelper();
  });

  describe('Basic Concurrency Tests', () => {
    it('should handle concurrent operations', async () => {
      // let counter = 0;
      //
      // const result = await concurrencyHelper.runConcurrent(async () => {
      //   counter++;
      //   await concurrencyHelper.delay(10);
      //   return counter;
      // }, 10);
      //
      // expect(result.successes.length).toBe(10);
      // expect(result.failures.length).toBe(0);
    });

    it('should detect race conditions', async () => {
      // let sharedCounter = 0;
      //
      // const result = await concurrencyHelper.detectRaceCondition(async () => {
      //   // 读-修改-写操作（非原子性）
      //   const current = sharedCounter;
      //   await concurrencyHelper.delay(1); // 模拟延迟
      //   sharedCounter = current + 1;
      //   return sharedCounter;
      // }, 10);
      //
      // // 如果有竞态条件，最终计数器值会小于10
      // console.log('Final counter:', sharedCounter);
      // console.log('Expected: 10, Actual:', result.results.length);
    });

    it('should execute batch operations', async () => {
      // const operations = Array.from({ length: 100 }, (_, i) => async () => {
      //   await concurrencyHelper.delay(10);
      //   return i;
      // });
      //
      // const results = await concurrencyHelper.batchExecute(operations, 10);
      //
      // expect(results.length).toBe(100);
      // expect(results[0]).toBe(0);
      // expect(results[99]).toBe(99);
    });
  });

  describe('Stress Testing', () => {
    it('should measure throughput under load', async () => {
      // const stats = await concurrencyHelper.stressTest(
      //   async () => {
      //     // 模拟数据库操作
      //     await concurrencyHelper.delay(Math.random() * 10);
      //   },
      //   5000, // 5秒测试
      //   20,   // 20并发
      // );
      //
      // console.log('Stress Test Results:');
      // console.log(`Total Operations: ${stats.totalOperations}`);
      // console.log(`Successful: ${stats.successfulOperations}`);
      // console.log(`Failed: ${stats.failedOperations}`);
      // console.log(`Throughput: ${stats.throughput.toFixed(2)} ops/sec`);
      // console.log(`Avg Latency: ${stats.avgLatency.toFixed(2)}ms`);
      // console.log(`Min Latency: ${stats.minLatency}ms`);
      // console.log(`Max Latency: ${stats.maxLatency}ms`);
    });
  });

  describe('Idempotency Tests', () => {
    it('should verify idempotent operations', async () => {
      // let operationCount = 0;
      // const expectedResult = { id: 1, name: 'Test' };
      //
      // await concurrencyHelper.expectIdempotency(
      //   async () => {
      //     operationCount++;
      //     // 幂等操作：多次执行返回相同结果
      //     return { ...expectedResult };
      //   },
      //   5,
      //   (a, b) => a.id === b.id && a.name === b.name,
      // );
      //
      // expect(operationCount).toBe(5);
    });
  });

  describe('Deadlock Detection', () => {
    it('should detect potential deadlocks', async () => {
      // const resource1 = { locked: false };
      // const resource2 = { locked: false };
      //
      // try {
      //   await concurrencyHelper.expectDeadlock(
      //     async () => {
      //       // 事务1: 先锁resource1，后锁resource2
      //       resource1.locked = true;
      //       await concurrencyHelper.delay(100);
      //       while (resource2.locked) {
      //         await concurrencyHelper.delay(10);
      //       }
      //       resource2.locked = true;
      //     },
      //     async () => {
      //       // 事务2: 先锁resource2，后锁resource1
      //       resource2.locked = true;
      //       await concurrencyHelper.delay(100);
      //       while (resource1.locked) {
      //         await concurrencyHelper.delay(10);
      //       }
      //       resource1.locked = true;
      //     },
      //     2000, // 2秒超时
      //   );
      //
      //   // 如果到这里，说明检测到死锁
      //   fail('Expected deadlock to be detected');
      // } catch (error) {
      //   expect(error.message).toContain('Deadlock detected');
      // }
    });
  });
});

// ========================================
// 集成测试示例（结合事务和并发）
// ========================================

describe('Integration Tests: Transaction + Concurrency', () => {
  let dataSource: DataSource;
  let transactionHelper: TransactionTestHelper;
  let concurrencyHelper: ConcurrencyTestHelper;

  beforeAll(async () => {
    // dataSource = await createTestDataSource();
    // transactionHelper = new TransactionTestHelper(dataSource);
    // concurrencyHelper = new ConcurrencyTestHelper();
  });

  afterAll(async () => {
    // await dataSource.destroy();
  });

  it('should handle concurrent user creation with transactions', async () => {
    // const result = await concurrencyHelper.runConcurrent(async () => {
    //   return await transactionHelper.runInTransaction(async (manager) => {
    //     const user = await manager.save('User', {
    //       name: `User-${Math.random()}`,
    //       email: `user-${Math.random()}@example.com`,
    //       balance: 100,
    //     });
    //     return user;
    //   });
    // }, 20);
    //
    // // 所有用户应该成功创建
    // expect(result.successes.length).toBe(20);
    // expect(result.failures.length).toBe(0);
    //
    // // 验证数据库中有20个用户
    // await transactionHelper.expectRecordCount('User', 20);
  });

  it('should prevent race condition in balance updates with pessimistic lock', async () => {
    // // 创建用户
    // const user = await transactionHelper.runInTransaction(
    //   async (manager) => {
    //     return await manager.save('User', {
    //       name: 'Balance Test User',
    //       email: 'balance-test@example.com',
    //       balance: 100,
    //     });
    //   },
    // );
    //
    // // 10个并发事务，每个增加10元
    // await concurrencyHelper.runConcurrent(async () => {
    //   const qr = transactionHelper.createQueryRunner();
    //
    //   try {
    //     await qr.connect();
    //     await qr.startTransaction();
    //
    //     // 使用悲观锁
    //     const lockedUser = await qr.manager
    //       .createQueryBuilder('User', 'u')
    //       .where('u.id = :id', { id: user.id })
    //       .setLock('pessimistic_write')
    //       .getOne();
    //
    //     lockedUser.balance += 10;
    //     await qr.manager.save('User', lockedUser);
    //
    //     await qr.commitTransaction();
    //   } finally {
    //     await qr.release();
    //   }
    // }, 10);
    //
    // // 验证最终余额 = 100 + (10 * 10) = 200
    // const finalUser = await dataSource.manager.findOne('User', {
    //   where: { id: user.id },
    // });
    // expect(finalUser.balance).toBe(200);
  });
});
