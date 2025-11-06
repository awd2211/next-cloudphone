import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 邀请配置实体
 * 每个用户一个邀请配置
 */
@Entity('referral_configs')
export class ReferralConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id', unique: true })
  @Index()
  userId: string; // 用户ID

  @Column({ length: 20, unique: true, name: 'invite_code' })
  @Index()
  inviteCode: string; // 邀请码

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'available_balance' })
  availableBalance: number; // 可提现余额

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'frozen_balance' })
  frozenBalance: number; // 冻结余额（提现申请中）

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_earned' })
  totalEarned: number; // 总收益

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_withdrawn' })
  totalWithdrawn: number; // 总提现金额

  @Column({ type: 'int', default: 0, name: 'total_invites' })
  totalInvites: number; // 总邀请人数

  @Column({ type: 'int', default: 0, name: 'confirmed_invites' })
  confirmedInvites: number; // 确认的邀请人数

  @Column({ default: true, name: 'is_active' })
  isActive: boolean; // 是否激活

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * 增加余额
   */
  addBalance(amount: number) {
    this.availableBalance += amount;
    this.totalEarned += amount;
  }

  /**
   * 冻结余额（申请提现）
   */
  freezeBalance(amount: number): boolean {
    if (this.availableBalance < amount) {
      return false;
    }
    this.availableBalance -= amount;
    this.frozenBalance += amount;
    return true;
  }

  /**
   * 解冻余额（取消提现）
   */
  unfreezeBalance(amount: number) {
    this.frozenBalance -= amount;
    this.availableBalance += amount;
  }

  /**
   * 完成提现
   */
  completeWithdraw(amount: number) {
    this.frozenBalance -= amount;
    this.totalWithdrawn += amount;
  }

  /**
   * 增加邀请计数
   */
  incrementInvites() {
    this.totalInvites += 1;
  }

  /**
   * 确认邀请
   */
  confirmInvite() {
    this.confirmedInvites += 1;
  }

  /**
   * 计算转化率
   */
  getConversionRate(): number {
    if (this.totalInvites === 0) {
      return 0;
    }
    return (this.confirmedInvites / this.totalInvites) * 100;
  }
}
