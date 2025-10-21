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

export enum QuotaStatus {
  ACTIVE = 'active',
  EXCEEDED = 'exceeded',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
}

export enum QuotaType {
  DEVICE = 'device',
  CPU = 'cpu',
  MEMORY = 'memory',
  STORAGE = 'storage',
  BANDWIDTH = 'bandwidth',
  DURATION = 'duration',
}

export interface QuotaLimits {
  // 设备限制
  maxDevices: number; // 最大云手机数量
  maxConcurrentDevices: number; // 最大并发数量

  // 资源限制
  maxCpuCoresPerDevice: number; // 每台设备最大 CPU 核心数
  maxMemoryMBPerDevice: number; // 每台设备最大内存 (MB)
  maxStorageGBPerDevice: number; // 每台设备最大存储 (GB)
  totalCpuCores: number; // 总 CPU 核心数配额
  totalMemoryGB: number; // 总内存配额 (GB)
  totalStorageGB: number; // 总存储配额 (GB)

  // 带宽限制
  maxBandwidthMbps: number; // 最大带宽 (Mbps)
  monthlyTrafficGB: number; // 月流量限制 (GB)

  // 时长限制
  maxUsageHoursPerDay: number; // 每日最大使用时长 (小时)
  maxUsageHoursPerMonth: number; // 每月最大使用时长 (小时)
}

export interface QuotaUsage {
  // 设备使用量
  currentDevices: number;
  currentConcurrentDevices: number;

  // 资源使用量
  usedCpuCores: number;
  usedMemoryGB: number;
  usedStorageGB: number;

  // 带宽使用量
  currentBandwidthMbps: number;
  monthlyTrafficUsedGB: number;

  // 时长使用量
  todayUsageHours: number;
  monthlyUsageHours: number;

  // 最后更新时间
  lastUpdatedAt: Date;
}

@Entity('quotas')
// 复合索引 - 优化常见查询场景
@Index('idx_quotas_user_status', ['userId', 'status'])
@Index('idx_quotas_plan_status', ['planId', 'status'])
@Index('idx_quotas_valid_period', ['validFrom', 'validUntil'])
export class Quota {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  planId: string; // 关联的套餐 ID (billing-service)

  @Column({ type: 'varchar', nullable: true })
  planName: string; // 套餐名称 (冗余字段，便于查询)

  @Column({
    type: 'enum',
    enum: QuotaStatus,
    default: QuotaStatus.ACTIVE,
  })
  @Index()
  status: QuotaStatus;

  @Column({ type: 'jsonb' })
  limits: QuotaLimits;

  @Column({ type: 'jsonb' })
  usage: QuotaUsage;

  @Column({ type: 'timestamp', nullable: true })
  validFrom: Date;

  @Column({ type: 'timestamp', nullable: true })
  validUntil: Date;

  @Column({ type: 'boolean', default: false })
  autoRenew: boolean; // 是否自动续期

  @Column({ type: 'text', nullable: true })
  notes: string; // 备注

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isExpired(): boolean {
    if (!this.validUntil) return false;
    return new Date() > this.validUntil;
  }

  isActive(): boolean {
    return (
      this.status === QuotaStatus.ACTIVE &&
      !this.isExpired() &&
      (!this.validFrom || new Date() >= this.validFrom)
    );
  }

  hasAvailableDeviceQuota(count: number = 1): boolean {
    return this.usage.currentDevices + count <= this.limits.maxDevices;
  }

  hasAvailableConcurrentQuota(count: number = 1): boolean {
    return (
      this.usage.currentConcurrentDevices + count <=
      this.limits.maxConcurrentDevices
    );
  }

  hasAvailableCpuQuota(cores: number): boolean {
    return this.usage.usedCpuCores + cores <= this.limits.totalCpuCores;
  }

  hasAvailableMemoryQuota(memoryGB: number): boolean {
    return this.usage.usedMemoryGB + memoryGB <= this.limits.totalMemoryGB;
  }

  hasAvailableStorageQuota(storageGB: number): boolean {
    return this.usage.usedStorageGB + storageGB <= this.limits.totalStorageGB;
  }

  getRemainingDevices(): number {
    return Math.max(0, this.limits.maxDevices - this.usage.currentDevices);
  }

  getRemainingConcurrentDevices(): number {
    return Math.max(
      0,
      this.limits.maxConcurrentDevices - this.usage.currentConcurrentDevices,
    );
  }

  getUsagePercentage(): {
    devices: number;
    cpu: number;
    memory: number;
    storage: number;
    traffic: number;
    hours: number;
  } {
    return {
      devices:
        this.limits.maxDevices > 0
          ? (this.usage.currentDevices / this.limits.maxDevices) * 100
          : 0,
      cpu:
        this.limits.totalCpuCores > 0
          ? (this.usage.usedCpuCores / this.limits.totalCpuCores) * 100
          : 0,
      memory:
        this.limits.totalMemoryGB > 0
          ? (this.usage.usedMemoryGB / this.limits.totalMemoryGB) * 100
          : 0,
      storage:
        this.limits.totalStorageGB > 0
          ? (this.usage.usedStorageGB / this.limits.totalStorageGB) * 100
          : 0,
      traffic:
        this.limits.monthlyTrafficGB > 0
          ? (this.usage.monthlyTrafficUsedGB / this.limits.monthlyTrafficGB) *
            100
          : 0,
      hours:
        this.limits.maxUsageHoursPerMonth > 0
          ? (this.usage.monthlyUsageHours / this.limits.maxUsageHoursPerMonth) * 100
          : 0,
    };
  }
}
