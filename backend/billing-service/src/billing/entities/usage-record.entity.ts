import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { DeviceProviderType, DeviceType, DeviceConfigSnapshot } from '@cloudphone/shared';

export enum UsageType {
  DEVICE_USAGE = 'device_usage',
  STORAGE_USAGE = 'storage_usage',
  TRAFFIC_USAGE = 'traffic_usage',
  API_CALL = 'api_call',
}

export enum PricingTier {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

@Entity('usage_records')
export class UsageRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column({ nullable: true })
  @Index()
  tenantId: string;

  @Column()
  @Index()
  deviceId: string;

  @Column({
    type: 'enum',
    enum: UsageType,
    default: UsageType.DEVICE_USAGE,
  })
  @Index()
  usageType: UsageType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantity: number;

  @Column({ default: 'hour' })
  unit: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cost: number;

  @Column({ type: 'timestamp' })
  @Index()
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  endTime: Date;

  @Column({ type: 'int', default: 0 })
  durationSeconds: number;

  @Column({ nullable: true })
  orderId: string;

  @Column({ default: false })
  @Index()
  isBilled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // ========== 多设备提供商支持字段（2025-10-29 新增） ==========

  /**
   * 设备提供商类型
   * 用于差异化计费
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  @Index()
  providerType: DeviceProviderType;

  /**
   * 设备类型（手机/平板）
   */
  @Column({ type: 'varchar', length: 10, nullable: true })
  @Index()
  deviceType: DeviceType;

  /**
   * 设备名称（用户友好）
   * 用于报表展示
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceName: string;

  /**
   * 设备配置快照
   * 记录计费时的设备配置，用于成本核算和审计
   */
  @Column({ type: 'jsonb', nullable: true })
  deviceConfig: DeviceConfigSnapshot;

  /**
   * 实际计费费率（元/小时）
   * 根据设备配置和 Provider 类型计算的费率
   */
  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  billingRate: number;

  /**
   * 定价层级
   * basic: 基础型, standard: 标准型, premium: 高级型, enterprise: 企业型
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  @Index()
  pricingTier: PricingTier;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
