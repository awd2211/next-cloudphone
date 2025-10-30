import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { NotificationType, NotificationChannel } from '@cloudphone/shared';

@Entity('notification_templates')
@Index(['type', 'isActive'])
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  @Index()
  type: NotificationType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'text', nullable: true })
  emailTemplate: string;

  @Column({ type: 'text', nullable: true })
  smsTemplate: string;

  @Column({ type: 'simple-array' })
  channels: NotificationChannel[];

  @Column({ type: 'jsonb', nullable: true })
  defaultData: Record<string, any>;

  @Column({ type: 'varchar', length: 10, default: 'zh-CN' })
  language: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

