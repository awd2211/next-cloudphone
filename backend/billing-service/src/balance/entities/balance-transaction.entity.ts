import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum TransactionType {
  RECHARGE = 'recharge', // 充值
  CONSUME = 'consume', // 消费
  REFUND = 'refund', // 退款
  FREEZE = 'freeze', // 冻结
  UNFREEZE = 'unfreeze', // 解冻
  ADJUSTMENT = 'adjustment', // 调整
  REWARD = 'reward', // 奖励
}

export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('balance_transactions')
export class BalanceTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'uuid' })
  @Index()
  balanceId: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  @Index()
  type: TransactionType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  balanceBefore: number; // 交易前余额

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  balanceAfter: number; // 交易后余额

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  @Index()
  status: TransactionStatus;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  orderId: string; // 关联订单 ID

  @Column({ type: 'varchar', nullable: true })
  @Index()
  paymentId: string; // 关联支付 ID

  @Column({ type: 'varchar', nullable: true })
  deviceId: string; // 关联设备 ID (如果是设备消费)

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'varchar', nullable: true })
  operatorId: string; // 操作人 ID (如果是手动调整)

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;

  // Helper methods
  isSuccess(): boolean {
    return this.status === TransactionStatus.SUCCESS;
  }

  isIncrease(): boolean {
    return [
      TransactionType.RECHARGE,
      TransactionType.REFUND,
      TransactionType.UNFREEZE,
      TransactionType.REWARD,
    ].includes(this.type);
  }

  isDecrease(): boolean {
    return [TransactionType.CONSUME, TransactionType.FREEZE].includes(
      this.type,
    );
  }
}
