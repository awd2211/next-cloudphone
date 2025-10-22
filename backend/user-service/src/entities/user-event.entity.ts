import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 用户事件实体
 * 用于事件溯源 (Event Sourcing)，存储所有用户状态变更事件
 */
@Entity('user_events')
@Index('IDX_USER_EVENT_AGGREGATE', ['aggregateId', 'version'])
@Index('IDX_USER_EVENT_TYPE', ['eventType', 'createdAt'])
@Index('IDX_USER_EVENT_CREATED', ['createdAt'])
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
    userId?: string;       // 执行操作的用户ID
    username?: string;     // 执行操作的用户名
    ipAddress?: string;    // 客户端IP地址
    userAgent?: string;    // 浏览器信息
    correlationId?: string; // 关联ID（用于分布式追踪）
    causationId?: string;   // 因果ID（导致此事件的事件ID）
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
