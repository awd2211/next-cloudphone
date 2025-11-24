/**
 * 黑名单实体
 *
 * 用于封禁恶意访客，支持 IP、设备ID、用户ID 等多种封禁方式
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BlacklistType {
  IP = 'ip',
  DEVICE = 'device',
  USER = 'user',
  FINGERPRINT = 'fingerprint',
}

export enum BlacklistStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

@Entity('blacklist')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'type', 'value'])
@Index(['tenantId', 'expiresAt'])
export class Blacklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', default: 'default' })
  tenantId: string;

  @Column({
    type: 'enum',
    enum: BlacklistType,
    default: BlacklistType.IP,
  })
  type: BlacklistType;

  @Column({ length: 255 })
  value: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({
    type: 'enum',
    enum: BlacklistStatus,
    default: BlacklistStatus.ACTIVE,
  })
  status: BlacklistStatus;

  @Column({ name: 'is_permanent', type: 'boolean', default: false })
  isPermanent: boolean;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ name: 'block_count', type: 'int', default: 0 })
  blockCount: number;

  @Column({ name: 'last_blocked_at', type: 'timestamp', nullable: true })
  lastBlockedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    userAgent?: string;
    location?: string;
    lastConversationId?: string;
    blockedMessages?: number;
  };

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ name: 'revoked_by', type: 'uuid', nullable: true })
  revokedBy: string;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt: Date;

  @Column({ name: 'revoke_reason', type: 'text', nullable: true })
  revokeReason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
