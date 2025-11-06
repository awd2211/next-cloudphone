import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 邀请记录状态枚举
 */
export enum ReferralStatus {
  PENDING = 'pending', // 待确认（被邀请人已注册，但未满足确认条件）
  CONFIRMED = 'confirmed', // 已确认（满足确认条件，如首次充值）
  REWARDED = 'rewarded', // 已奖励（奖励已发放）
  EXPIRED = 'expired', // 已过期（超过有效期未确认）
}

/**
 * 邀请记录实体
 */
@Entity('referral_records')
export class ReferralRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'referrer_id' })
  @Index()
  referrerId: string; // 邀请人ID

  @Column({ type: 'uuid', name: 'referee_id' })
  @Index()
  refereeId: string; // 被邀请人ID

  @Column({ length: 100, name: 'referee_username' })
  refereeUsername: string; // 被邀请人用户名

  @Column({ length: 100, nullable: true, name: 'referee_email' })
  refereeEmail?: string;

  @Column({ length: 20, nullable: true, name: 'referee_phone' })
  refereePhone?: string;

  @Column({
    type: 'enum',
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  @Index()
  status: ReferralStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  reward: number; // 奖励金额

  @Column({ type: 'timestamp', name: 'registered_at' })
  registeredAt: Date; // 被邀请人注册时间

  @Column({ type: 'timestamp', nullable: true, name: 'confirmed_at' })
  confirmedAt?: Date; // 确认时间

  @Column({ type: 'timestamp', nullable: true, name: 'rewarded_at' })
  rewardedAt?: Date; // 奖励发放时间

  @Column({ type: 'timestamp', nullable: true, name: 'expired_at' })
  expiredAt?: Date; // 过期时间

  @Column({ type: 'text', nullable: true })
  remark?: string; // 备注

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * 确认邀请
   */
  confirm(reward: number) {
    this.status = ReferralStatus.CONFIRMED;
    this.confirmedAt = new Date();
    this.reward = reward;
  }

  /**
   * 发放奖励
   */
  grantReward() {
    if (this.status !== ReferralStatus.CONFIRMED) {
      throw new Error('Cannot grant reward: referral not confirmed');
    }
    this.status = ReferralStatus.REWARDED;
    this.rewardedAt = new Date();
  }

  /**
   * 标记为过期
   */
  markAsExpired() {
    this.status = ReferralStatus.EXPIRED;
    this.expiredAt = new Date();
  }

  /**
   * 检查是否可以确认
   */
  canConfirm(): boolean {
    return this.status === ReferralStatus.PENDING;
  }

  /**
   * 检查是否可以发放奖励
   */
  canGrantReward(): boolean {
    return this.status === ReferralStatus.CONFIRMED;
  }
}
