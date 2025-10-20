import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from '../../billing/entities/order.entity';

export enum PaymentMethod {
  WECHAT = 'wechat',
  ALIPAY = 'alipay',
  BALANCE = 'balance',
}

export enum PaymentStatus {
  PENDING = 'pending',      // 待支付
  PROCESSING = 'processing', // 支付中
  SUCCESS = 'success',       // 支付成功
  FAILED = 'failed',         // 支付失败
  REFUNDING = 'refunding',   // 退款中
  REFUNDED = 'refunded',     // 已退款
  CANCELLED = 'cancelled',   // 已取消
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.WECHAT,
  })
  method: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  // 第三方支付平台的交易号
  @Column({ name: 'transaction_id', nullable: true })
  transactionId: string;

  // 我们系统的支付单号（唯一）
  @Column({ name: 'payment_no', unique: true })
  paymentNo: string;

  // 第三方支付平台返回的原始数据
  @Column({ type: 'jsonb', nullable: true, name: 'raw_response' })
  rawResponse: any;

  // 支付URL或二维码内容（用于扫码支付）
  @Column({ name: 'payment_url', nullable: true })
  paymentUrl: string;

  // 支付失败原因
  @Column({ name: 'failure_reason', nullable: true })
  failureReason: string;

  // 退款金额
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'refund_amount',
  })
  refundAmount: number;

  // 退款原因
  @Column({ name: 'refund_reason', nullable: true })
  refundReason: string;

  // 支付时间
  @Column({ type: 'timestamp', nullable: true, name: 'paid_at' })
  paidAt: Date;

  // 退款时间
  @Column({ type: 'timestamp', nullable: true, name: 'refunded_at' })
  refundedAt: Date;

  // 过期时间（15分钟后）
  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
