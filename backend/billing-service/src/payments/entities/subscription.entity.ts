import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum SubscriptionStatus {
  ACTIVE = 'active', // 活跃
  CANCELED = 'canceled', // 已取消
  INCOMPLETE = 'incomplete', // 未完成（首次支付失败）
  INCOMPLETE_EXPIRED = 'incomplete_expired', // 过期
  PAST_DUE = 'past_due', // 逾期
  TRIALING = 'trialing', // 试用中
  UNPAID = 'unpaid', // 未支付
  PAUSED = 'paused', // 暂停
}

export enum SubscriptionInterval {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export enum SubscriptionProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  PADDLE = 'paddle',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // 用户ID
  @Column({ name: 'user_id' })
  userId: string;

  // 套餐ID
  @Column({ name: 'plan_id' })
  planId: string;

  // 支付提供商
  @Column({
    type: 'enum',
    enum: SubscriptionProvider,
  })
  provider: SubscriptionProvider;

  // 订阅状态
  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  // 第三方平台的订阅ID
  @Column({ name: 'external_subscription_id', unique: true })
  externalSubscriptionId: string;

  // 第三方平台的客户ID
  @Column({ name: 'external_customer_id', nullable: true })
  externalCustomerId: string;

  // 订阅价格（每个周期）
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  // 货币
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  // 计费周期
  @Column({
    type: 'enum',
    enum: SubscriptionInterval,
    default: SubscriptionInterval.MONTH,
  })
  interval: SubscriptionInterval;

  // 计费周期数量（例如：interval=month, intervalCount=3 表示每3个月）
  @Column({ name: 'interval_count', default: 1 })
  intervalCount: number;

  // 当前周期开始时间
  @Column({ type: 'timestamp', name: 'current_period_start' })
  currentPeriodStart: Date;

  // 当前周期结束时间
  @Column({ type: 'timestamp', name: 'current_period_end' })
  currentPeriodEnd: Date;

  // 是否在周期结束时取消
  @Column({ name: 'cancel_at_period_end', default: false })
  cancelAtPeriodEnd: boolean;

  // 取消时间
  @Column({ type: 'timestamp', nullable: true, name: 'canceled_at' })
  canceledAt: Date;

  // 试用期结束时间
  @Column({ type: 'timestamp', nullable: true, name: 'trial_end' })
  trialEnd: Date;

  // 试用期开始时间
  @Column({ type: 'timestamp', nullable: true, name: 'trial_start' })
  trialStart: Date;

  // 下次续费时间
  @Column({ type: 'timestamp', nullable: true, name: 'next_billing_date' })
  nextBillingDate: Date;

  // 订阅开始时间
  @Column({ type: 'timestamp', nullable: true, name: 'started_at' })
  startedAt: Date;

  // 订阅结束时间（永久取消）
  @Column({ type: 'timestamp', nullable: true, name: 'ended_at' })
  endedAt: Date;

  // 额外元数据（平台特定信息）
  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  // 续费失败次数
  @Column({ name: 'failed_payment_count', default: 0 })
  failedPaymentCount: number;

  // 最后一次支付ID
  @Column({ name: 'latest_payment_id', nullable: true })
  latestPaymentId: string;

  // 优惠券代码
  @Column({ name: 'coupon_code', nullable: true })
  couponCode: string;

  // 折扣金额或百分比
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
