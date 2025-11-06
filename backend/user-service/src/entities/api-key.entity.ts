import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum ApiKeyStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  name: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  key: string; // API 密钥（哈希后存储）

  @Column({ type: 'varchar' })
  prefix: string; // 密钥前缀（用于显示，如 cp_live_xxxxxx）

  @Column({
    type: 'enum',
    enum: ApiKeyStatus,
    default: ApiKeyStatus.ACTIVE,
  })
  @Index()
  status: ApiKeyStatus;

  @Column({ type: 'jsonb', default: [] })
  scopes: string[]; // 权限范围，如 ['devices:read', 'devices:write', 'quotas:read']

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'varchar', nullable: true })
  lastUsedIp: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isActive(): boolean {
    if (this.status !== ApiKeyStatus.ACTIVE) return false;
    if (this.expiresAt && new Date() > this.expiresAt) return false;
    return true;
  }

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  hasScope(scope: string): boolean {
    return this.scopes.includes(scope) || this.scopes.includes('*');
  }

  hasScopePattern(pattern: string): boolean {
    // 支持通配符，如 devices:* 匹配 devices:read, devices:write
    return this.scopes.some((scope) => {
      if (scope === '*') return true;
      if (scope === pattern) return true;

      const regex = new RegExp(`^${scope.replace('*', '.*')}$`);
      return regex.test(pattern);
    });
  }

  getMaskedKey(): string {
    // 返回脱敏的密钥，如 cp_live_abc***xyz
    return `${this.prefix}***${this.key.slice(-4)}`;
  }
}
