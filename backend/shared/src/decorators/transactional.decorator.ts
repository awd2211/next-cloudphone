import { SetMetadata } from '@nestjs/common';

/**
 * Transaction Metadata Key
 */
export const TRANSACTIONAL_KEY = 'transactional';

/**
 * Transaction Options
 */
export interface TransactionalOptions {
  /**
   * Transaction isolation level
   * @default 'READ COMMITTED'
   */
  isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';

  /**
   * Transaction propagation behavior
   * @default 'REQUIRED'
   */
  propagation?: 'REQUIRED' | 'REQUIRES_NEW' | 'NESTED';

  /**
   * Connection name (for multi-database scenarios)
   * @default 'default'
   */
  connectionName?: string;
}

/**
 * Transactional Decorator
 *
 * 标记方法需要在数据库事务中执行
 *
 * 使用示例:
 * ```typescript
 * @Transactional()
 * async createUser(dto: CreateUserDto) {
 *   const user = await this.userRepo.save(user);
 *   await this.userRoleRepo.save(userRoles);
 *   // 所有数据库操作自动在一个事务中
 *   // 如果任何操作失败，整个事务自动回滚
 * }
 * ```
 *
 * 指定隔离级别:
 * ```typescript
 * @Transactional({ isolationLevel: 'REPEATABLE READ' })
 * async deductBalance(userId: string, amount: number) {
 *   // 防止脏读和不可重复读
 * }
 * ```
 *
 * 嵌套事务:
 * ```typescript
 * @Transactional({ propagation: 'REQUIRES_NEW' })
 * async createAuditLog() {
 *   // 总是在新事务中执行，即使外部事务回滚，审计日志也会保留
 * }
 * ```
 *
 * 注意事项:
 * 1. 必须在 Module 中全局注册 TransactionInterceptor
 * 2. 事务方法中的所有数据库操作会自动使用同一个 EntityManager
 * 3. 避免在事务中执行长时间运行的操作（如 HTTP 请求）
 * 4. 事务超时时间默认为 30 秒
 */
export const Transactional = (options?: TransactionalOptions): MethodDecorator => {
  const defaultOptions: TransactionalOptions = {
    isolationLevel: 'READ COMMITTED',
    propagation: 'REQUIRED',
    connectionName: 'default',
    ...options,
  };

  return SetMetadata(TRANSACTIONAL_KEY, defaultOptions);
};
