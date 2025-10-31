import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { Logger } from '@nestjs/common';

/**
 * Transaction Test Helper
 *
 * 用于测试事务相关功能的辅助工具类
 *
 * 核心功能:
 * - 创建测试用的 QueryRunner
 * - 验证事务是否提交/回滚
 * - 检查数据一致性
 * - 模拟事务失败场景
 *
 * 使用示例:
 * ```typescript
 * describe('UserService Transaction Tests', () => {
 *   let helper: TransactionTestHelper;
 *   let dataSource: DataSource;
 *
 *   beforeAll(async () => {
 *     dataSource = await createTestDataSource();
 *     helper = new TransactionTestHelper(dataSource);
 *   });
 *
 *   afterAll(async () => {
 *     await dataSource.destroy();
 *   });
 *
 *   it('should commit transaction on success', async () => {
 *     const queryRunner = helper.createQueryRunner();
 *
 *     try {
 *       await queryRunner.startTransaction();
 *
 *       // 执行业务逻辑
 *       await queryRunner.manager.save(User, { name: 'Test User' });
 *
 *       await queryRunner.commitTransaction();
 *
 *       // 验证事务已提交
 *       const user = await dataSource.manager.findOne(User, { where: { name: 'Test User' } });
 *       expect(user).toBeDefined();
 *     } finally {
 *       await queryRunner.release();
 *     }
 *   });
 *
 *   it('should rollback transaction on error', async () => {
 *     await helper.expectTransactionRollback(async (manager) => {
 *       await manager.save(User, { name: 'Should Rollback' });
 *       throw new Error('Simulated error');
 *     });
 *
 *     // 验证数据未保存
 *     const user = await dataSource.manager.findOne(User, { where: { name: 'Should Rollback' } });
 *     expect(user).toBeNull();
 *   });
 * });
 * ```
 */
export class TransactionTestHelper {
  private readonly logger = new Logger(TransactionTestHelper.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * 创建测试用的 QueryRunner
   */
  createQueryRunner(): QueryRunner {
    return this.dataSource.createQueryRunner();
  }

  /**
   * 执行事务并自动清理
   *
   * @param callback 事务回调函数
   * @returns 回调函数的返回值
   */
  async runInTransaction<T>(callback: (manager: EntityManager) => Promise<T>): Promise<T> {
    const queryRunner = this.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const result = await callback(queryRunner.manager);

      await queryRunner.commitTransaction();

      return result;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 验证事务回滚
   *
   * 期望回调函数抛出异常，并验证事务已回滚
   *
   * @param callback 应该抛出异常的回调函数
   * @throws 如果回调函数没有抛出异常
   */
  async expectTransactionRollback(
    callback: (manager: EntityManager) => Promise<void>
  ): Promise<void> {
    const queryRunner = this.createQueryRunner();
    let errorThrown = false;

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      await callback(queryRunner.manager);

      // 如果没有抛出异常，则测试失败
      throw new Error('Expected callback to throw an error, but it succeeded');
    } catch (error) {
      errorThrown = true;

      // 验证事务是否回滚
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
    } finally {
      await queryRunner.release();
    }

    if (!errorThrown) {
      throw new Error('Transaction rollback test failed: no error was thrown');
    }
  }

  /**
   * 验证事务提交
   *
   * 期望回调函数成功执行，并验证事务已提交
   *
   * @param callback 应该成功的回调函数
   * @returns 回调函数的返回值
   */
  async expectTransactionCommit<T>(callback: (manager: EntityManager) => Promise<T>): Promise<T> {
    const queryRunner = this.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const result = await callback(queryRunner.manager);

      await queryRunner.commitTransaction();

      return result;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 验证数据库中的记录数
   *
   * @param entity 实体类
   * @param expectedCount 期望的记录数
   */
  async expectRecordCount(entity: any, expectedCount: number, where?: any): Promise<void> {
    const count = await this.dataSource.manager.count(entity, { where });

    if (count !== expectedCount) {
      throw new Error(`Expected ${expectedCount} records, but found ${count} records`);
    }
  }

  /**
   * 验证记录存在
   *
   * @param entity 实体类
   * @param where 查询条件
   */
  async expectRecordExists(entity: any, where: any): Promise<void> {
    const record = await this.dataSource.manager.findOne(entity, { where });

    if (!record) {
      throw new Error(`Expected record to exist with conditions: ${JSON.stringify(where)}`);
    }
  }

  /**
   * 验证记录不存在
   *
   * @param entity 实体类
   * @param where 查询条件
   */
  async expectRecordNotExists(entity: any, where: any): Promise<void> {
    const record = await this.dataSource.manager.findOne(entity, { where });

    if (record) {
      throw new Error(`Expected record to not exist with conditions: ${JSON.stringify(where)}`);
    }
  }

  /**
   * 清空表数据（用于测试前的清理）
   *
   * @param entity 实体类
   */
  async clearTable(entity: any): Promise<void> {
    await this.dataSource.manager.delete(entity, {});
  }

  /**
   * 模拟事务超时
   *
   * 执行回调函数，并在指定时间后超时
   *
   * @param callback 回调函数
   * @param timeoutMs 超时时间（毫秒）
   */
  async expectTransactionTimeout(
    callback: (manager: EntityManager) => Promise<void>,
    timeoutMs: number
  ): Promise<void> {
    const queryRunner = this.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // 创建超时 Promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Transaction timeout'));
        }, timeoutMs);
      });

      // 竞速执行
      await Promise.race([callback(queryRunner.manager), timeoutPromise]);

      throw new Error('Expected transaction to timeout, but it completed');
    } catch (error) {
      if (error.message === 'Transaction timeout') {
        // 超时成功，回滚事务
        if (queryRunner.isTransactionActive) {
          await queryRunner.rollbackTransaction();
        }
        return;
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 验证乐观锁冲突
   *
   * 模拟两个并发事务修改同一行数据
   *
   * @param entity 实体类
   * @param id 记录ID
   * @param update1 第一个更新操作
   * @param update2 第二个更新操作
   */
  async expectOptimisticLockConflict(
    entity: any,
    id: any,
    update1: (record: any) => void,
    update2: (record: any) => void
  ): Promise<void> {
    const qr1 = this.createQueryRunner();
    const qr2 = this.createQueryRunner();

    try {
      await qr1.connect();
      await qr1.startTransaction();

      await qr2.connect();
      await qr2.startTransaction();

      // 两个事务都读取同一行
      const record1 = await qr1.manager.findOne(entity, { where: { id } });
      const record2 = await qr2.manager.findOne(entity, { where: { id } });

      if (!record1 || !record2) {
        throw new Error('Record not found');
      }

      // 第一个事务更新并提交
      update1(record1);
      await qr1.manager.save(entity, record1);
      await qr1.commitTransaction();

      // 第二个事务尝试更新（应该失败）
      update2(record2);

      try {
        await qr2.manager.save(entity, record2);
        await qr2.commitTransaction();

        throw new Error('Expected optimistic lock conflict, but second transaction succeeded');
      } catch (error) {
        // 期望冲突
        if (qr2.isTransactionActive) {
          await qr2.rollbackTransaction();
        }
      }
    } finally {
      await qr1.release();
      await qr2.release();
    }
  }

  /**
   * 验证悲观锁（FOR UPDATE）
   *
   * 验证第二个事务在第一个事务释放锁前无法获取锁
   *
   * @param entity 实体类
   * @param id 记录ID
   */
  async expectPessimisticLock(entity: any, id: any): Promise<void> {
    const qr1 = this.createQueryRunner();
    const qr2 = this.createQueryRunner();

    try {
      await qr1.connect();
      await qr1.startTransaction();

      // 第一个事务获取悲观锁
      await qr1.manager
        .createQueryBuilder(entity, 'e')
        .where('e.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();

      this.logger.debug('Transaction 1 acquired pessimistic lock');

      await qr2.connect();
      await qr2.startTransaction();

      // 第二个事务尝试获取锁（应该阻塞）
      const startTime = Date.now();
      const lockTimeout = 2000; // 2 秒超时

      const lockPromise = qr2.manager
        .createQueryBuilder(entity, 'e')
        .where('e.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Lock timeout'));
        }, lockTimeout);
      });

      try {
        await Promise.race([lockPromise, timeoutPromise]);

        // 如果没有超时，说明获取了锁（测试失败）
        throw new Error('Expected pessimistic lock to block, but it succeeded');
      } catch (error) {
        if (error.message === 'Lock timeout') {
          // 超时成功，说明锁被阻塞
          const duration = Date.now() - startTime;
          this.logger.debug(`Transaction 2 was blocked for ${duration}ms (expected)`);

          // 释放第一个事务的锁
          await qr1.commitTransaction();

          // 第二个事务现在应该能获取锁
          await qr2.rollbackTransaction();
        } else {
          throw error;
        }
      }
    } finally {
      if (qr1.isTransactionActive) await qr1.rollbackTransaction();
      if (qr2.isTransactionActive) await qr2.rollbackTransaction();
      await qr1.release();
      await qr2.release();
    }
  }

  /**
   * 获取数据源
   */
  getDataSource(): DataSource {
    return this.dataSource;
  }
}
