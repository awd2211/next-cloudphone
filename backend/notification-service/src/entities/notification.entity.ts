import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  NotificationStatus,
  NotificationChannel,
  NotificationCategory,
} from '@cloudphone/shared';

/**
 * @deprecated 使用 NotificationCategory 代替
 * 保留用于数据库兼容性和向后兼容，新代码请使用 NotificationCategory
 *
 * MIGRATION NOTE: This enum is being phased out. All new code should use
 * NotificationCategory from @cloudphone/shared. This enum will be removed
 * in a future version after database migration is complete.
 */
export enum NotificationType {
  SYSTEM = 'system',
  DEVICE = 'device',
  ORDER = 'order',
  BILLING = 'billing',
  ALERT = 'alert',
  MESSAGE = 'message',
}

// Re-export shared enums for convenience
export { NotificationStatus, NotificationChannel, NotificationCategory };

/**
 * Type alias for backward compatibility
 * Maps deprecated NotificationType to NotificationCategory
 */
export type NotificationTypeCompat = NotificationCategory | NotificationType;

@Entity('notifications')
@Index(['userId', 'status'])
@Index(['userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationCategory,
    default: NotificationCategory.SYSTEM,
  })
  type: NotificationCategory;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  @Index()
  status: NotificationStatus;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({ type: 'simple-array', nullable: true })
  channels: NotificationChannel[];

  @Column({ type: 'uuid', nullable: true })
  templateId: string;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

