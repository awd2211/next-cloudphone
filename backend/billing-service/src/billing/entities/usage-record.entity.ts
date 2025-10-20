import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('usage_records')
export class UsageRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  deviceId: string;

  @Column()
  tenantId: string;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date;

  @Column({ type: 'int', default: 0 })
  duration: number; // 使用时长（秒）

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cost: number; // 费用

  @Column({ default: 'active' })
  status: string; // 'active' | 'completed'

  @CreateDateColumn()
  createdAt: Date;
}
