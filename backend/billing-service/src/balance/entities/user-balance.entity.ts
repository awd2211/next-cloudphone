import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BalanceStatus {
  NORMAL = 'normal',
  LOW = 'low', // 余额不足预警
  INSUFFICIENT = 'insufficient', // 余额不足
  FROZEN = 'frozen', // 冻结
}

@Entity('user_balances')
export class UserBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index({ unique: true })
  userId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance: number; // 可用余额

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  frozenAmount: number; // 冻结金额

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalRecharge: number; // 累计充值

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalConsumption: number; // 累计消费

  @Column({
    type: 'enum',
    enum: BalanceStatus,
    default: BalanceStatus.NORMAL,
  })
  status: BalanceStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 100 })
  lowBalanceThreshold: number; // 余额不足阈值

  @Column({ type: 'boolean', default: true })
  autoRecharge: boolean; // 是否启用自动充值

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  autoRechargeAmount: number; // 自动充值金额

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  autoRechargeTrigger: number; // 自动充值触发阈值

  @Column({ type: 'timestamp', nullable: true })
  lastRechargeAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastConsumeAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  getAvailableBalance(): number {
    return Number(this.balance) - Number(this.frozenAmount);
  }

  isLowBalance(): boolean {
    return this.getAvailableBalance() <= Number(this.lowBalanceThreshold);
  }

  isInsufficient(): boolean {
    return this.getAvailableBalance() <= 0;
  }

  canConsume(amount: number): boolean {
    return this.getAvailableBalance() >= amount && this.status !== BalanceStatus.FROZEN;
  }
}
