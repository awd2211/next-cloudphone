import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SmsStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

@Entity('sms_records')
@Index(['userId', 'createdAt'])
@Index(['status'])
@Index(['phone'])
export class SmsRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  phone: string; // 手机号

  @Column({ type: 'text' })
  content: string; // 短信内容

  @Column({
    type: 'enum',
    enum: SmsStatus,
    default: SmsStatus.PENDING,
  })
  status: SmsStatus;

  @Column({ length: 50 })
  provider: string; // 供应商：aliyun, tencent, twilio 等

  @Column({ type: 'uuid', nullable: true })
  userId: string; // 关联用户 ID

  @Column({ length: 100, nullable: true })
  userName: string; // 用户名（冗余）

  @Column({ length: 50, nullable: true })
  templateCode: string; // 模板代码

  @Column({ type: 'json', nullable: true })
  variables: Record<string, any>; // 模板变量

  @Column({ length: 100, nullable: true })
  messageId: string; // 供应商返回的消息 ID

  @Column({ type: 'text', nullable: true })
  errorMessage: string; // 错误信息

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date; // 发送时间

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date; // 送达时间

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
