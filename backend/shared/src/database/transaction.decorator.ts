import { DataSource, EntityManager, QueryRunner } from 'typeorm';

/**
 * Transaction Decorator
 *
 * 自动管理数据库事务的装饰器
 *
 * 使用方法:
 * ```typescript
 * @Transaction()
 * async createUser(manager: EntityManager, dto: CreateUserDto) {
 *   // manager 会被自动注入
 *   const user = await manager.save(User, dto);
 *   const event = await manager.save(UserEvent, {...});
 *   return user;
 * }
 * ```
 *
 * 特性:
 * - 自动创建 QueryRunner
 * - 自动开启事务
 * - 成功时自动提交
 * - 失败时自动回滚
 * - 总是释放连接
 * - 第一个参数自动注入 EntityManager
 *
 * @returns MethodDecorator
 */
export function Transaction(): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 尝试获取 DataSource 实例
      const dataSource: DataSource =
        this.dataSource || // 直接注入的 DataSource
        this.moduleRef?.get(DataSource) || // 通过 ModuleRef 获取
        this.connection || // 旧版 TypeORM 的 Connection
        null;

      if (!dataSource) {
        throw new Error(
          `@Transaction decorator requires DataSource to be injected. ` +
          `Please inject DataSource into ${target.constructor.name} or use ModuleRef.`,
        );
      }

      // 创建 QueryRunner
      const queryRunner: QueryRunner = dataSource.createQueryRunner();

      try {
        // 连接到数据库
        await queryRunner.connect();

        // 开启事务
        await queryRunner.startTransaction();

        // 调用原方法，将 EntityManager 作为第一个参数注入
        const result = await originalMethod.apply(this, [
          queryRunner.manager,
          ...args,
        ]);

        // 提交事务
        await queryRunner.commitTransaction();

        return result;
      } catch (error) {
        // 回滚事务
        if (queryRunner.isTransactionActive) {
          await queryRunner.rollbackTransaction();
        }

        // 重新抛出错误
        throw error;
      } finally {
        // 总是释放连接
        await queryRunner.release();
      }
    };

    return descriptor;
  };
}

/**
 * Transactional - 与 @Transaction() 相同，提供别名
 */
export const Transactional = Transaction;

/**
 * Propagation 类型 - 事务传播行为（未来扩展）
 */
export enum TransactionPropagation {
  /**
   * REQUIRED - 如果当前有事务则加入，否则创建新事务（默认）
   */
  REQUIRED = 'REQUIRED',

  /**
   * REQUIRES_NEW - 总是创建新事务，挂起当前事务
   */
  REQUIRES_NEW = 'REQUIRES_NEW',

  /**
   * SUPPORTS - 如果当前有事务则加入，否则以非事务方式执行
   */
  SUPPORTS = 'SUPPORTS',

  /**
   * NOT_SUPPORTED - 总是以非事务方式执行，挂起当前事务
   */
  NOT_SUPPORTED = 'NOT_SUPPORTED',

  /**
   * MANDATORY - 必须在事务中执行，否则抛出异常
   */
  MANDATORY = 'MANDATORY',

  /**
   * NEVER - 必须以非事务方式执行，如果当前有事务则抛出异常
   */
  NEVER = 'NEVER',
}

/**
 * Transaction Options - 高级配置（未来扩展）
 */
export interface TransactionOptions {
  /**
   * 传播行为
   */
  propagation?: TransactionPropagation;

  /**
   * 隔离级别
   */
  isolationLevel?:
    | 'READ UNCOMMITTED'
    | 'READ COMMITTED'
    | 'REPEATABLE READ'
    | 'SERIALIZABLE';

  /**
   * 超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 是否只读
   */
  readOnly?: boolean;
}

/**
 * TransactionWithOptions - 支持高级配置的事务装饰器（未来实现）
 *
 * @param options 事务配置
 */
export function TransactionWithOptions(
  options: TransactionOptions = {},
): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const dataSource: DataSource =
        this.dataSource ||
        this.moduleRef?.get(DataSource) ||
        this.connection ||
        null;

      if (!dataSource) {
        throw new Error(
          `@TransactionWithOptions decorator requires DataSource`,
        );
      }

      const queryRunner: QueryRunner = dataSource.createQueryRunner();

      try {
        await queryRunner.connect();

        // 设置隔离级别（如果指定）
        if (options.isolationLevel) {
          await queryRunner.startTransaction(options.isolationLevel);
        } else {
          await queryRunner.startTransaction();
        }

        // 设置超时（如果指定）
        let timeoutId: NodeJS.Timeout | null = null;
        if (options.timeout) {
          timeoutId = setTimeout(async () => {
            if (queryRunner.isTransactionActive) {
              await queryRunner.rollbackTransaction();
              await queryRunner.release();
              throw new Error(
                `Transaction timeout after ${options.timeout}ms`,
              );
            }
          }, options.timeout);
        }

        const result = await originalMethod.apply(this, [
          queryRunner.manager,
          ...args,
        ]);

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

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
    };

    return descriptor;
  };
}
