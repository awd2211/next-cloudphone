import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 用户预警配置实体
 * 每个用户一条配置记录
 */
@Entity('billing_warning_configs')
export class WarningConfigEntity {
  @PrimaryColumn('uuid')
  userId: string;

  /** 每日预算（CNY） */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 100 })
  dailyBudget: number;

  /** 每月预算（CNY） */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 3000 })
  monthlyBudget: number;

  /** 低余额阈值（CNY） */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 50 })
  lowBalanceThreshold: number;

  /** 严重低余额阈值（CNY） */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 20 })
  criticalBalanceThreshold: number;

  /** 是否启用邮件通知 */
  @Column({ default: true })
  enableEmailNotification: boolean;

  /** 是否启用短信通知 */
  @Column({ default: false })
  enableSmsNotification: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
