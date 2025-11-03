import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 平台黑名单实体
 * 用于记录被暂时或永久禁用的平台
 */
@Entity('provider_blacklist')
@Index(['provider', 'reason'])
@Index(['expiresAt'])
export class ProviderBlacklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider', length: 50 })
  provider: string;

  @Column({ name: 'reason', length: 255 })
  reason: string;

  @Column({ name: 'blacklist_type', length: 20 })
  blacklistType: string; // 'temporary', 'permanent', 'manual'

  @Column({ name: 'triggered_by', length: 100, nullable: true })
  triggeredBy: string; // 'auto' | 'admin' | 用户ID

  @Column({ name: 'failure_count', type: 'int', default: 0 })
  failureCount: number;

  @Column({ name: 'last_failure_reason', type: 'text', nullable: true })
  lastFailureReason: string;

  @Column({ name: 'auto_removed', type: 'boolean', default: false })
  autoRemoved: boolean;

  // 临时黑名单的过期时间
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  // 是否仍然有效
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'removed_at', type: 'timestamp', nullable: true })
  removedAt: Date;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string;
}
