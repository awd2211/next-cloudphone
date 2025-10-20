import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum UsageType {
  DEVICE_USAGE = 'device_usage',
  STORAGE_USAGE = 'storage_usage',
  TRAFFIC_USAGE = 'traffic_usage',
  API_CALL = 'api_call',
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
