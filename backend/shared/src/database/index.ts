/**
 * Database Utilities
 *
 * 数据库工具集合，包括事务管理、连接池、基础实体等
 */

// ========== 事务装饰器 ==========
export {
  Transaction,
  Transactional,
  TransactionWithOptions,
  TransactionPropagation,
} from './transaction.decorator';

export type { TransactionOptions } from './transaction.decorator';

// ========== 基础实体类 ==========
export {
  BaseEntity,
  SoftDeleteEntity,
  TenantEntity,
  AuditableEntity,
  VersionedEntity,
  EntityStatus,
  createPaginatedResult,
} from './base.entity';

export type {
  TimeRangeQuery,
  PaginationParams,
  PaginatedResult,
} from './base.entity';
