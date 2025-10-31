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

  @Column({ type: 'text', nullable: true, name: 'email_template' })
  emailTemplate: string;

  @Column({ type: 'text', nullable: true, name: 'sms_template' })
  smsTemplate: string;

  @Column({ type: 'text', array: true })
  channels: NotificationChannel[];

  @Column({ type: 'jsonb', nullable: true, name: 'default_data' })
  defaultData: Record<string, any>;

  @Column({ type: 'varchar', length: 10, default: 'zh-CN' })
  language: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
