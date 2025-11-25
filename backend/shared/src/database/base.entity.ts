import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * 基础实体类
 *
 * 提供所有实体的通用字段：
 * - id: UUID 主键
 * - createdAt: 创建时间
 * - updatedAt: 更新时间
 *
 * 使用方式：
 * ```typescript
 * @Entity('my_table')
 * export class MyEntity extends BaseEntity {
 *   @Column()
 *   name: string;
 * }
 * ```
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  /**
   * 确保 ID 在插入前已设置
   */
  @BeforeInsert()
  ensureId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}

/**
 * 软删除实体类
 *
 * 扩展 BaseEntity，添加软删除支持：
 * - deletedAt: 删除时间（null 表示未删除）
 *
 * 使用方式：
 * ```typescript
 * @Entity('my_table')
 * export class MyEntity extends SoftDeleteEntity {
 *   @Column()
 *   name: string;
 * }
 *
 * // 软删除
 * await repository.softDelete(id);
 *
 * // 查询时自动过滤已删除记录
 * await repository.find(); // 不包含已删除
 *
 * // 包含已删除记录
 * await repository.find({ withDeleted: true });
 *
 * // 恢复删除
 * await repository.restore(id);
 * ```
 */
export abstract class SoftDeleteEntity extends BaseEntity {
  @DeleteDateColumn({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  /**
   * 判断实体是否已被软删除
   */
  get isDeleted(): boolean {
    return this.deletedAt !== null;
  }
}

/**
 * 多租户实体类
 *
 * 扩展 SoftDeleteEntity，添加租户隔离支持：
 * - tenantId: 租户标识（带索引）
 *
 * 使用方式：
 * ```typescript
 * @Entity('my_table')
 * export class MyEntity extends TenantEntity {
 *   @Column()
 *   name: string;
 * }
 *
 * // 查询时需要手动添加租户过滤条件
 * await repository.find({ where: { tenantId: currentTenantId } });
 * ```
 *
 * 建议配合 TenantGuard 或 QueryBuilder 自动注入租户条件
 */
export abstract class TenantEntity extends SoftDeleteEntity {
  @Column({ name: 'tenant_id' })
  @Index('idx_tenant_id')
  tenantId: string;
}

/**
 * 审计实体类
 *
 * 扩展 TenantEntity，添加审计信息：
 * - createdBy: 创建者 ID
 * - updatedBy: 更新者 ID
 *
 * 使用方式：
 * ```typescript
 * @Entity('my_table')
 * export class MyEntity extends AuditableEntity {
 *   @Column()
 *   name: string;
 * }
 * ```
 *
 * 注意：createdBy 和 updatedBy 需要在业务层手动设置
 */
export abstract class AuditableEntity extends TenantEntity {
  @Column({ name: 'created_by', nullable: true })
  @Index('idx_created_by')
  createdBy: string | null;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string | null;
}

/**
 * 版本化实体类
 *
 * 扩展 AuditableEntity，添加乐观锁支持：
 * - version: 版本号（乐观锁）
 *
 * TypeORM 会自动在更新时检查版本号，
 * 如果版本号不匹配会抛出 OptimisticLockVersionMismatchError
 *
 * 使用方式：
 * ```typescript
 * @Entity('my_table')
 * export class MyEntity extends VersionedEntity {
 *   @Column()
 *   name: string;
 * }
 *
 * // 更新时自动检查版本
 * const entity = await repository.findOne(id);
 * entity.name = 'new name';
 * await repository.save(entity); // 版本号自动递增
 * ```
 */
export abstract class VersionedEntity extends AuditableEntity {
  @Column({ type: 'int', default: 1 })
  version: number;

  /**
   * 在更新前递增版本号
   */
  @BeforeUpdate()
  incrementVersion() {
    this.version = (this.version || 0) + 1;
  }
}

/**
 * 时间范围查询接口
 *
 * 用于实体的时间范围查询
 */
export interface TimeRangeQuery {
  startDate?: Date;
  endDate?: Date;
  field?: 'createdAt' | 'updatedAt' | 'deletedAt';
}

/**
 * 分页参数接口
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * 分页结果接口
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * 创建分页结果
 */
export function createPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / pageSize);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

/**
 * 实体状态枚举基类
 *
 * 推荐的状态字段模式
 */
export enum EntityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  DELETED = 'deleted',
}
