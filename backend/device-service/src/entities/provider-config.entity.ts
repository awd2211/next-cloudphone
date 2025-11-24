import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { DeviceProviderType } from '../providers/provider.types';

/**
 * 提供商配置实体
 * 用于持久化存储各设备提供商的配置信息
 *
 * 支持多账号：同一 providerType 可以有多个配置
 */
@Entity('provider_configs')
export class ProviderConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  @Index()
  name: string; // 配置名称（如 "阿里云-主账号"、"华为云-测试账号"）

  @Column({
    type: 'enum',
    enum: DeviceProviderType,
  })
  @Index()
  providerType: DeviceProviderType;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'tenant_id' })
  @Index()
  tenantId: string; // 租户ID（多租户支持）

  @Column({ default: true })
  enabled: boolean;

  @Column({ type: 'int', default: 1 })
  priority: number;

  @Column({ type: 'int', default: 100 })
  maxDevices: number;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, any>; // 提供商特定配置（AccessKey、Region等）

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @Column({ type: 'boolean', default: false, name: 'is_default' })
  isDefault: boolean; // 是否为该类型的默认配置

  @Column({ type: 'timestamp', nullable: true, name: 'last_tested_at' })
  lastTestedAt: Date; // 最后测试时间

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'test_status' })
  testStatus: string; // 测试状态：success, failed, unknown

  @Column({ type: 'text', nullable: true, name: 'test_message' })
  testMessage: string; // 测试结果消息

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * 云同步记录实体
 * 用于记录云设备同步的历史和状态
 */
@Entity('cloud_sync_records')
export class CloudSyncRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: DeviceProviderType,
  })
  @Index()
  provider: DeviceProviderType;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

  @Column({ type: 'int', default: 0 })
  syncedDevices: number;

  @Column({ type: 'int', default: 0 })
  failedDevices: number;

  @Column({ type: 'int', default: 0 })
  addedDevices: number;

  @Column({ type: 'int', default: 0 })
  removedDevices: number;

  @Column({ type: 'int', default: 0 })
  updatedDevices: number;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  details: {
    cloudDeviceIds?: string[];
    localDeviceIds?: string[];
    errors?: Array<{ deviceId: string; error: string }>;
  };

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'int', default: 0 })
  durationMs: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  triggeredBy: string; // 'system' 或 userId

  @CreateDateColumn()
  createdAt: Date;
}

/**
 * 云账单对账记录
 * 用于存储云提供商账单与内部记录的对账结果
 */
@Entity('cloud_billing_reconciliations')
export class CloudBillingReconciliation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: DeviceProviderType,
  })
  @Index()
  provider: DeviceProviderType;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cloudTotalCost: number;

  @Column({ type: 'int', default: 0 })
  cloudDeviceCount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  internalTotalHours: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  internalEstimatedCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discrepancy: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discrepancyPercentage: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: 'pending' | 'matched' | 'discrepancy' | 'error';

  @Column({ type: 'jsonb', nullable: true })
  cloudBillingDetails: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  internalRecordDetails: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
