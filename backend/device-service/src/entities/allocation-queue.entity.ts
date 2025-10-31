import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum QueueStatus {
  WAITING = 'waiting', // 等待中
  PROCESSING = 'processing', // 处理中（正在尝试分配）
  FULFILLED = 'fulfilled', // 已满足（设备已分配）
  EXPIRED = 'expired', // 已过期（超时未处理）
  CANCELLED = 'cancelled', // 已取消（用户主动取消）
}

export enum UserPriority {
  STANDARD = 0, // 普通用户
  VIP = 1, // VIP用户
  PREMIUM = 2, // 高级VIP
  ENTERPRISE = 3, // 企业用户
}

@Entity('allocation_queue')
@Index(['status', 'priority', 'createdAt']) // 复合索引用于优先级排序
@Index(['userId', 'status'])
export class AllocationQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar' })
  @Index()
  userId: string;

  @Column({ name: 'tenant_id', type: 'varchar', nullable: true })
  tenantId: string;

  @Column({
    type: 'enum',
    enum: QueueStatus,
    default: QueueStatus.WAITING,
  })
  @Index()
  status: QueueStatus;

  // 优先级 (数字越大优先级越高)
  @Column({
    type: 'int',
    default: UserPriority.STANDARD,
  })
  priority: number;

  // 用户类型（用于显示）
  @Column({
    name: 'user_tier',
    type: 'varchar',
    default: 'standard',
  })
  userTier: string; // 'standard', 'vip', 'premium', 'enterprise'

  // 设备偏好
  @Column({ name: 'device_type', type: 'varchar', nullable: true })
  deviceType: string;

  @Column({ name: 'min_cpu', type: 'int', nullable: true })
  minCpu: number;

  @Column({ name: 'min_memory', type: 'int', nullable: true })
  minMemory: number;

  // 请求的使用时长（分钟）
  @Column({ name: 'duration_minutes', type: 'int', default: 60 })
  durationMinutes: number;

  // 排队位置（动态计算，也可以缓存）
  @Column({ name: 'queue_position', type: 'int', nullable: true })
  queuePosition: number;

  // 预估等待时间（分钟）
  @Column({ name: 'estimated_wait_minutes', type: 'int', nullable: true })
  estimatedWaitMinutes: number;

  // 最大等待时间（分钟），超过后自动过期
  @Column({ name: 'max_wait_minutes', type: 'int', default: 30 })
  maxWaitMinutes: number;

  // 处理结果
  @Column({ name: 'allocated_device_id', type: 'varchar', nullable: true })
  allocatedDeviceId: string;

  @Column({ name: 'allocation_id', type: 'varchar', nullable: true })
  allocationId: string;

  // 处理时间
  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date;

  // 满足时间（成功分配）
  @Column({ name: 'fulfilled_at', type: 'timestamptz', nullable: true })
  fulfilledAt: Date;

  // 取消信息
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason: string;

  // 过期信息
  @Column({ name: 'expired_at', type: 'timestamptz', nullable: true })
  expiredAt: Date;

  @Column({ name: 'expiry_reason', type: 'text', nullable: true })
  expiryReason: string;

  // 重试次数
  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  // 最后重试时间
  @Column({ name: 'last_retry_at', type: 'timestamptz', nullable: true })
  lastRetryAt: Date;

  // 元数据
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
