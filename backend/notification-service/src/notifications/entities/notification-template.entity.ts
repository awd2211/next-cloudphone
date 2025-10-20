import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { NotificationType, NotificationChannel } from './notification.entity';

@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  code: string; // 模板代码，如 TICKET_REPLY_EMAIL

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  @Index()
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  @Index()
  channel: NotificationChannel;

  @Column({ type: 'text' })
  subject: string; // 主题模板（邮件标题、短信前缀等）

  @Column({ type: 'text' })
  template: string; // 内容模板（支持 Handlebars 语法）

  @Column({ type: 'jsonb', default: [] })
  variables: string[]; // 模板变量列表，如 ['userName', 'ticketNumber']

  @Column({ type: 'varchar', nullable: true })
  locale: string; // 语言/地区，如 zh-CN, en-US

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  render(data: Record<string, any>): { subject: string; content: string } {
    // 这里会在 service 中使用 Handlebars 进行实际渲染
    return {
      subject: this.subject,
      content: this.template,
    };
  }
}
