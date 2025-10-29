import { Logger } from '@nestjs/common';

/**
 * Concurrency Test Result
 */
export interface ConcurrencyTestResult<T> {
  successes: T[];
  failures: Error[];
  duration: number;
  successRate: number;
}

/**
 * Race Condition Test Result
 */
export interface RaceConditionTestResult<T> {
  results: T[];
  conflicts: number;
  duration: number;
}

/**
 * Concurrency Test Helper
 *
 * 用于测试并发场景的辅助工具类
 *
 * 核心功能:
 * - 并发执行多个操作
 * - 检测竞态条件
 * - 验证死锁
 * - 性能压测
 *
 * 使用示例:
 * ```typescript
 * describe('Concurrency Tests', () => {
 *   let helper: ConcurrencyTestHelper;
 *
 *   beforeEach(() => {
 *     helper = new ConcurrencyTestHelper();
 *   });
 *
 *   it('should handle concurrent user creation', async () => {
 *     const result = await helper.runConcurrent(
 *       async () => {
 *         return await userService.createUser({ name: 'User' });
 *       },
 *       10, // 10 个并发请求
 *     );
 *
 *     expect(result.successes.length).toBe(10);
 *     expect(result.failures.length).toBe(0);
 *   });
 *
 *   it('should detect race condition in balance update', async () => {
 *     const result = await helper.detectRaceCondition(
 *       async () => {
 *         const balance = await getBalance(userId);
 *         await updateBalance(userId, balance + 10);
 *         return balance + 10;
 *       },
 *       5, // 5 个并发更新
 *     );
 *
 *     // 如果没有竞态条件，5次+10应该得到50
 *     const finalBalance = await getBalance(userId);
 *     expect(finalBalance).toBe(50);
 *   });
 * });
 * ```
 */
export class ConcurrencyTestHelper {
  private readonly logger = new Logger(ConcurrencyTestHelper.name);

  /**
   * 并发执行多个操作
   *
   * @param operation 要执行的操作
   * @param count 并发数量
   * @returns 测试结果
   */
  async runConcurrent<T>(
    operation: () => Promise<T>,
    count: number,
  ): Promise<ConcurrencyTestResult<T>> {
    const startTime = Date.now();
    const promises: Promise<T>[] = [];

    this.logger.debug(`Starting ${count} concurrent operations`);

    // 创建并发操作
    for (let i = 0; i < count; i++) {
      promises.push(
        operation().catch((error) => {
          this.logger.warn(`Operation ${i} failed: ${error.message}`);
          throw error;
        }),
      );
    }

    // 使用 Promise.allSettled 等待所有操作完成
    const results = await Promise.allSettled(promises);

    const successes: T[] = [];
    const failures: Error[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successes.push(result.value);
      } else {
        failures.push(result.reason);
      }
    });

    const duration = Date.now() - startTime;
    const successRate = successes.length / count;

    this.logger.debug(
      `Completed ${count} operations in ${duration}ms (${(successRate * 100).toFixed(1)}% success rate)`,
    );

    return {
      successes,
      failures,
      duration,
      successRate,
    };
  }

  /**
   * 并发执行多个不同的操作
   *
   * @param operations 要执行的操作数组
   * @returns 测试结果
   */
  async runConcurrentBatch<T>(
    operations: Array<() => Promise<T>>,
  ): Promise<ConcurrencyTestResult<T>> {
    const startTime = Date.now();

    this.logger.debug(`Starting ${operations.length} concurrent operations`);

    const promises = operations.map((op, index) =>
      op().catch((error) => {
        this.logger.warn(`Operation ${index} failed: ${error.message}`);
        throw error;
      }),
    );

    const results = await Promise.allSettled(promises);

    const successes: T[] = [];
    const failures: Error[] = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        successes.push(result.value);
      } else {
        failures.push(result.reason);
      }
    });

    const duration = Date.now() - startTime;
    const successRate = successes.length / operations.length;

    this.logger.debug(
      `Completed ${operations.length} operations in ${duration}ms (${(successRate * 100).toFixed(1)}% success rate)`,
    );

    return {
      successes,
      failures,
      duration,
      successRate,
    };
  }

  /**
   * 检测竞态条件
   *
   * 并发执行操作，并检查是否有竞态条件
   *
   * @param operation 要测试的操作
   * @param count 并发数量
   * @returns 测试结果
   */
  async detectRaceCondition<T>(
    operation: () => Promise<T>,
    count: number,
  ): Promise<RaceConditionTestResult<T>> {
    const startTime = Date.now();
    const promises: Promise<T>[] = [];

    this.logger.debug(`Detecting race condition with ${count} concurrent operations`);

    // 创建并发操作
    for (let i = 0; i < count; i++) {
      promises.push(operation());
    }

    // 等待所有操作完成
    const results = await Promise.allSettled(promises);

    const successfulResults: T[] = [];
    let conflicts = 0;

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value);
      } else {
        // 假设冲突会导致异常
        conflicts++;
      }
    });

    const duration = Date.now() - startTime;

    this.logger.debug(
      `Completed race condition test in ${duration}ms (${conflicts} conflicts detected)`,
    );

    return {
      results: successfulResults,
      conflicts,
      duration,
    };
  }

  /**
   * 测试死锁检测
   *
   * 创建两个事务，交叉获取锁，检测是否会发生死锁
   *
   * @param operation1 第一个操作（先锁A后锁B）
   * @param operation2 第二个操作（先锁B后锁A）
   * @param timeoutMs 超时时间
   */
  async expectDeadlock(
    operation1: () => Promise<void>,
    operation2: () => Promise<void>,
    timeoutMs: number = 5000,
  ): Promise<void> {
    const startTime = Date.now();

    this.logger.debug('Testing for deadlock');

    // 并发执行两个操作
    const promise1 = operation1();
    const promise2 = operation2();

    // 创建超时 Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Deadlock detected: operations timed out'));
      }, timeoutMs);
    });

    try {
      // 等待操作完成或超时
      await Promise.race([
        Promise.all([promise1, promise2]),
        timeoutPromise,
      ]);

      // 如果没有超时，说明没有死锁
      const duration = Date.now() - startTime;
      this.logger.debug(`Operations completed in ${duration}ms (no deadlock)`);
    } catch (error) {
      if (error.message.includes('Deadlock detected')) {
        const duration = Date.now() - startTime;
        this.logger.debug(`Deadlock detected after ${duration}ms`);
        throw error;
      } else {
        // 其他错误
        throw error;
      }
    }
  }

  /**
   * 压力测试
   *
   * 在指定时间内持续执行操作，统计吞吐量
   *
   * @param operation 要执行的操作
   * @param durationMs 测试持续时间（毫秒）
   * @param concurrency 并发数量
   * @returns 测试统计
   */
  async stressTest<T>(
    operation: () => Promise<T>,
    durationMs: number,
    concurrency: number = 10,
  ): Promise<{
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    duration: number;
    throughput: number;
    avgLatency: number;
    minLatency: number;
    maxLatency: number;
  }> {
    const startTime = Date.now();
    let totalOperations = 0;
    let successfulOperations = 0;
    let failedOperations = 0;
    const latencies: number[] = [];

    this.logger.debug(
      `Starting stress test (duration: ${durationMs}ms, concurrency: ${concurrency})`,
    );

    // 创建工作池
    const workers: Promise<void>[] = [];

    for (let i = 0; i < concurrency; i++) {
      workers.push(
        (async () => {
          while (Date.now() - startTime < durationMs) {
            const opStartTime = Date.now();
            totalOperations++;

            try {
              await operation();
              successfulOperations++;
            } catch (error) {
              failedOperations++;
              this.logger.warn(`Operation failed: ${error.message}`);
            }

            const opDuration = Date.now() - opStartTime;
            latencies.push(opDuration);
          }
        })(),
      );
    }

    // 等待所有工作线程完成
    await Promise.all(workers);

    const duration = Date.now() - startTime;
    const throughput = (successfulOperations / duration) * 1000; // ops/sec
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);

    this.logger.debug(
      `Stress test completed: ${totalOperations} operations in ${duration}ms (${throughput.toFixed(2)} ops/sec)`,
    );

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      duration,
      throughput,
      avgLatency,
      minLatency,
      maxLatency,
    };
  }

  /**
   * 测试顺序一致性
   *
   * 验证并发操作是否保持顺序一致性
   *
   * @param operations 有序操作列表
   * @param validator 验证器函数
   */
  async expectSequentialConsistency<T>(
    operations: Array<() => Promise<T>>,
    validator: (results: T[]) => boolean,
  ): Promise<void> {
    this.logger.debug(`Testing sequential consistency with ${operations.length} operations`);

    // 并发执行所有操作
    const promises = operations.map((op) => op());
    const results = await Promise.all(promises);

    // 验证结果
    if (!validator(results)) {
      throw new Error('Sequential consistency violation detected');
    }

    this.logger.debug('Sequential consistency verified');
  }

  /**
   * 创建延迟操作
   *
   * @param delayMs 延迟时间（毫秒）
   */
  async delay(delayMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  /**
   * 随机延迟（模拟真实场景）
   *
   * @param minMs 最小延迟（毫秒）
   * @param maxMs 最大延迟（毫秒）
   */
  async randomDelay(minMs: number, maxMs: number): Promise<void> {
    const delayMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return this.delay(delayMs);
  }

  /**
   * 批量操作（分批执行，避免资源耗尽）
   *
   * @param operations 操作列表
   * @param batchSize 批次大小
   * @returns 所有结果
   */
  async batchExecute<T>(
    operations: Array<() => Promise<T>>,
    batchSize: number,
  ): Promise<T[]> {
    const results: T[] = [];

    this.logger.debug(
      `Executing ${operations.length} operations in batches of ${batchSize}`,
    );

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((op) => op()));
      results.push(...batchResults);

      this.logger.debug(
        `Completed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(operations.length / batchSize)}`,
      );
    }

    return results;
  }

  /**
   * 测试幂等性
   *
   * 多次执行相同操作，验证结果是否一致
   *
   * @param operation 要测试的操作
   * @param count 执行次数
   * @param comparator 结果比较函数
   */
  async expectIdempotency<T>(
    operation: () => Promise<T>,
    count: number,
    comparator: (a: T, b: T) => boolean,
  ): Promise<void> {
    this.logger.debug(`Testing idempotency with ${count} executions`);

    const results: T[] = [];

    for (let i = 0; i < count; i++) {
      const result = await operation();
      results.push(result);
    }

    // 验证所有结果是否一致
    const firstResult = results[0];
    for (let i = 1; i < results.length; i++) {
      if (!comparator(firstResult, results[i])) {
        throw new Error(
          `Idempotency violation: execution ${i} returned different result`,
        );
      }
    }

    this.logger.debug('Idempotency verified');
  }
}
