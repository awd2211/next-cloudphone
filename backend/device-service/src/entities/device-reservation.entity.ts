import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ReservationStatus {
  PENDING = 'pending', // 等待中（预约时间未到）
  CONFIRMED = 'confirmed', // 已确认（可以执行）
  EXECUTING = 'executing', // 执行中（正在分配设备）
  COMPLETED = 'completed', // 已完成（设备已分配）
  CANCELLED = 'cancelled', // 已取消
  EXPIRED = 'expired', // 已过期（预约时间已过但未执行）
  FAILED = 'failed', // 失败（尝试分配但失败）
}

@Entity('device_reservations')
@Index(['userId', 'status'])
@Index(['reservedStartTime', 'status'])
@Index(['deviceType', 'status'])
export class DeviceReservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar' })
  @Index()
  userId: string;

  @Column({ name: 'tenant_id', type: 'varchar', nullable: true })
  tenantId: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  // 预约的开始时间
  @Column({ name: 'reserved_start_time', type: 'timestamptz' })
  reservedStartTime: Date;

  // 预约的结束时间（可选，如果不指定则使用 durationMinutes）
  @Column({ name: 'reserved_end_time', type: 'timestamptz', nullable: true })
  reservedEndTime: Date;

  // 预约时长（分钟）
  @Column({ name: 'duration_minutes', type: 'int', default: 60 })
  durationMinutes: number;

  // 设备偏好（可选）
  @Column({ name: 'device_type', type: 'varchar', nullable: true })
  deviceType: string;

  @Column({ name: 'min_cpu', type: 'int', nullable: true })
  minCpu: number;

  @Column({ name: 'min_memory', type: 'int', nullable: true })
  minMemory: number;

  // 执行结果
  @Column({ name: 'allocated_device_id', type: 'varchar', nullable: true })
  allocatedDeviceId: string;

  @Column({ name: 'allocation_id', type: 'varchar', nullable: true })
  allocationId: string;

  // 执行时间
  @Column({ name: 'executed_at', type: 'timestamptz', nullable: true })
  executedAt: Date;

  // 取消信息
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason: string;

  // 失败信息
  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt: Date;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string;

  // 提醒设置
  @Column({ name: 'remind_before_minutes', type: 'int', default: 15 })
  remindBeforeMinutes: number;

  @Column({ name: 'reminder_sent', type: 'boolean', default: false })
  reminderSent: boolean;

  // 元数据
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
