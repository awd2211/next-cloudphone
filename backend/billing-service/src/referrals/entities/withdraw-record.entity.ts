import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 提现状态枚举
 */
export enum WithdrawStatus {
  PENDING = 'pending', // 待审核
  APPROVED = 'approved', // 已批准
  PROCESSING = 'processing', // 处理中
  COMPLETED = 'completed', // 已完成
  REJECTED = 'rejected', // 已拒绝
  CANCELLED = 'cancelled', // 已取消
}

/**
 * 提现方式枚举
 */
export enum WithdrawMethod {
  ALIPAY = 'alipay', // 支付宝
  WECHAT = 'wechat', // 微信
  BANK = 'bank', // 银行卡
}

/**
 * 提现记录实体
 */
@Entity('withdraw_records')
export class WithdrawRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId: string; // 用户ID

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number; // 提现金额

  @Column({
    type: 'enum',
    enum: WithdrawStatus,
    default: WithdrawStatus.PENDING,
  })
  @Index()
  status: WithdrawStatus;

  @Column({
    type: 'enum',
    enum: WithdrawMethod,
  })
  method: WithdrawMethod; // 提现方式

  @Column({ length: 200 })
  account: string; // 提现账户

  @Column({ length: 100, nullable: true, name: 'account_name' })
  accountName?: string; // 账户名

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fee: number; // 手续费

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'actual_amount' })
  actualAmount: number; // 实际到账金额

  @Column({ type: 'text', nullable: true })
  remark?: string; // 备注

  @Column({ type: 'text', nullable: true, name: 'reject_reason' })
  rejectReason?: string; // 拒绝原因

  @Column({ type: 'timestamp', nullable: true, name: 'processed_at' })
  processedAt?: Date; // 处理时间

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt?: Date; // 完成时间

  @CreateDateColumn({ name: 'applied_at' })
  appliedAt: Date; // 申请时间

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * 批准提现
   */
  approve() {
    if (this.status !== WithdrawStatus.PENDING) {
      throw new Error('Cannot approve: not in pending status');
    }
    this.status = WithdrawStatus.APPROVED;
    this.processedAt = new Date();
  }

  /**
   * 开始处理
   */
  startProcessing() {
    if (this.status !== WithdrawStatus.APPROVED) {
      throw new Error('Cannot start processing: not approved');
    }
    this.status = WithdrawStatus.PROCESSING;
  }

  /**
   * 完成提现
   */
  complete() {
    if (this.status !== WithdrawStatus.PROCESSING) {
      throw new Error('Cannot complete: not in processing status');
    }
    this.status = WithdrawStatus.COMPLETED;
    this.completedAt = new Date();
  }

  /**
   * 拒绝提现
   */
  reject(reason: string) {
    if (this.status !== WithdrawStatus.PENDING) {
      throw new Error('Cannot reject: not in pending status');
    }
    this.status = WithdrawStatus.REJECTED;
    this.rejectReason = reason;
    this.processedAt = new Date();
  }

  /**
   * 取消提现
   */
  cancel() {
    if (![WithdrawStatus.PENDING, WithdrawStatus.APPROVED].includes(this.status)) {
      throw new Error('Cannot cancel: invalid status');
    }
    this.status = WithdrawStatus.CANCELLED;
    this.processedAt = new Date();
  }

  /**
   * 检查是否可以取消
   */
  canCancel(): boolean {
    return [WithdrawStatus.PENDING, WithdrawStatus.APPROVED].includes(this.status);
  }

  /**
   * 计算手续费
   */
  static calculateFee(amount: number, feeRate: number): number {
    return amount * feeRate;
  }

  /**
   * 计算实际到账金额
   */
  static calculateActualAmount(amount: number, feeRate: number): number {
    const fee = this.calculateFee(amount, feeRate);
    return amount - fee;
  }
}
