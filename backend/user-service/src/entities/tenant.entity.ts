import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DISABLED = 'disabled',
}

/**
 * 租户实体
 *
 * 用于多租户SaaS架构的租户管理
 */
@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  code: string; // 租户编码（唯一标识）

  @Column()
  name: string; // 租户名称

  @Column({ type: 'text', nullable: true })
  description: string; // 租户描述

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  @Index()
  status: TenantStatus; // 租户状态

  @Column({ nullable: true })
  contactName: string; // 联系人

  @Column({ nullable: true })
  contactEmail: string; // 联系邮箱

  @Column({ nullable: true })
  contactPhone: string; // 联系电话

  @Column({ type: 'int', nullable: true })
  maxUsers: number; // 最大用户数限制

  @Column({ type: 'int', nullable: true })
  maxDevices: number; // 最大设备数限制

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date; // 到期时间

  @Column({ type: 'jsonb', nullable: true })
  config: Record<string, any>; // 租户配置（如：主题、功能开关等）

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // 额外信息

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isActive(): boolean {
    return this.status === TenantStatus.ACTIVE;
  }

  isExpired(): boolean {
    return this.expiresAt && new Date() > this.expiresAt;
  }
}
