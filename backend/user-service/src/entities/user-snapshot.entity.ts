import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * 用户快照实体
 *
 * 用于优化事件重放性能：
 * - 每 N 个事件创建一个快照（如每 100 个事件）
 * - 重放时从最近的快照开始，而不是从第一个事件
 * - 显著提升重放速度（特别是对于有大量事件的聚合）
 *
 * 示例：
 * - 用户有 1000 个事件
 * - 版本 900 有一个快照
 * - 重放时只需要应用最后 100 个事件，而不是全部 1000 个
 */
@Entity('user_snapshots')
@Index('IDX_USER_SNAPSHOT_AGGREGATE', ['aggregateId', 'version'])
@Index('IDX_USER_SNAPSHOT_CREATED', ['createdAt'])
export class UserSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 聚合 ID（用户 ID）
   */
  @Column({ type: 'uuid' })
  @Index()
  aggregateId: string;

  /**
   * 快照对应的事件版本号
   * 重放时，从这个版本之后的事件开始应用
   */
  @Column({ type: 'int' })
  version: number;

  /**
   * 用户状态快照（JSONB 格式）
   * 包含该版本时用户的完整状态
   */
  @Column({ type: 'jsonb' })
  state: {
    id: string;
    username?: string;
    email?: string;
    fullName?: string;
    phone?: string;
    tenantId?: string;
    loginAttempts?: number;
    lockedUntil?: Date;
    lastLoginAt?: Date;
    lastLoginIp?: string;
    createdAt?: Date;
    updatedAt?: Date;
    [key: string]: any;
  };

  /**
   * 租户 ID（用于多租户环境）
   */
  @Column({ type: 'uuid', nullable: true })
  tenantId?: string;

  /**
   * 快照创建时间
   * 用于清理过期快照
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * 元数据（可选）
   * 例如：创建原因、创建者、快照大小等
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    reason?: string; // 'scheduled' | 'manual' | 'threshold'
    eventCount?: number; // 该聚合的总事件数
    snapshotSize?: number; // 快照大小（bytes）
    createdBy?: string; // 创建者
  };
}
