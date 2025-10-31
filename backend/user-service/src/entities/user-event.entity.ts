import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * 用户事件实体
 * 用于事件溯源 (Event Sourcing)，存储所有用户状态变更事件
 *
 * 表分区策略（Phase 2 优化）：
 * - 按月分区（PARTITION BY RANGE(created_at)）
 * - 自动创建未来 3 个月分区
 * - 保留 12 个月历史数据
 * - 使用 create_future_partitions() 函数自动维护
 *
 * 注意：主键必须包含 created_at 以支持分区表
 */
@Entity('user_events')
@Index('IDX_USER_EVENT_AGGREGATE', ['aggregateId', 'version'])
@Index('IDX_USER_EVENT_TYPE', ['eventType', 'createdAt'])
@Index('IDX_USER_EVENT_CREATED', ['createdAt'])
// 新增: 事件重放优化 - aggregateId + createdAt 复合索引
@Index('IDX_USER_EVENT_AGGREGATE_TIME', ['aggregateId', 'createdAt'])
// 新增: 租户查询优化 - tenantId + createdAt 复合索引
@Index('IDX_USER_EVENT_TENANT_TIME', ['tenantId', 'createdAt'])
export class UserEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 聚合根ID（用户ID）
   * 所有属于同一用户的事件共享同一个 aggregateId
   */
  @Column({ type: 'uuid' })
  @Index()
  aggregateId: string;

  /**
   * 事件类型
   * 例如：UserCreated, UserUpdated, PasswordChanged, UserDeleted
   */
  @Column({ length: 100 })
  eventType: string;

  /**
   * 事件数据（JSON格式）
   * 包含事件的完整数据
   */
  @Column({ type: 'jsonb' })
  eventData: any;

  /**
   * 事件版本号
   * 用于保证事件顺序和并发控制
   * 同一 aggregateId 的 version 必须是递增的
   */
  @Column({ type: 'int' })
  version: number;

  /**
   * 事件元数据（可选）
   * 包含操作者、IP地址、用户代理等信息
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    userId?: string; // 执行操作的用户ID
    username?: string; // 执行操作的用户名
    ipAddress?: string; // 客户端IP地址
    userAgent?: string; // 浏览器信息
    correlationId?: string; // 关联ID（用于分布式追踪）
    causationId?: string; // 因果ID（导致此事件的事件ID）
  };

  /**
   * 租户ID（多租户支持）
   */
  @Column({ type: 'varchar', length: 36, nullable: true })
  @Index()
  tenantId?: string;

  /**
   * 事件创建时间（不可变）
   */
  @CreateDateColumn()
  createdAt: Date;
}
