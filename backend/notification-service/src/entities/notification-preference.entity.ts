import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  NotificationChannel,
  NotificationType,
} from '@cloudphone/shared';

// Re-export for convenience
export { NotificationChannel, NotificationType };

/**
 * 通知偏好实体
 *
 * 存储用户对每种通知类型的偏好设置
 */
@Entity('notification_preferences')
@Index(['userId', 'notificationType'], { unique: true })
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 用户ID（来自 user-service）
   */
  @Column({ type: 'varchar', length: 255 })
  @Index()
  userId: string;

  /**
   * 通知类型
   */
  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  @Index()
  notificationType: NotificationType;

  /**
   * 是否启用该类型通知
   */
  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  /**
   * 启用的通知渠道
   *
   * 用户可以选择通过哪些渠道接收此类通知
   * 例如: ['websocket', 'email'] - 只接收网页和邮件通知，不接收短信
   */
  @Column({
    type: 'simple-array',
    default: '',
  })
  enabledChannels: NotificationChannel[];

  /**
   * 自定义设置（JSON）
   *
   * 支持扩展配置，例如:
   * {
   *   "quietHours": {
   *     "enabled": true,
   *     "start": "22:00",
   *     "end": "08:00",
   *     "timezone": "Asia/Shanghai"
   *   },
   *   "frequency": {
   *     "limit": 5,
   *     "period": "hour"
   *   }
   * }
   */
  @Column({ type: 'jsonb', nullable: true })
  customSettings?: Record<string, any>;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
