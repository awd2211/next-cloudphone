import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum InvoiceStatus {
  DRAFT = 'draft', // 草稿
  PENDING = 'pending', // 待支付
  PAID = 'paid', // 已支付
  OVERDUE = 'overdue', // 逾期
  CANCELLED = 'cancelled', // 已取消
  REFUNDED = 'refunded', // 已退款
}

export enum InvoiceType {
  MONTHLY = 'monthly', // 月账单
  RECHARGE = 'recharge', // 充值账单
  ADJUSTMENT = 'adjustment', // 调整账单
  REFUND = 'refund', // 退款账单
}

export interface InvoiceItem {
  id: string;
  description: string; // 项目描述
  quantity: number; // 数量
  unitPrice: number; // 单价
  amount: number; // 小计
  metadata?: Record<string, any>;
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  invoiceNumber: string; // 账单编号，如 INV-202410-000001

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: InvoiceType,
    default: InvoiceType.MONTHLY,
  })
  @Index()
  type: InvoiceType;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  @Index()
  status: InvoiceStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  subtotal: number; // 小计

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number; // 税费

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number; // 折扣

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total: number; // 总计

  @Column({ type: 'jsonb' })
  items: InvoiceItem[]; // 账单项目

  @Column({ type: 'date' })
  @Index()
  billingPeriodStart: Date; // 账期开始

  @Column({ type: 'date' })
  @Index()
  billingPeriodEnd: Date; // 账期结束

  @Column({ type: 'date' })
  @Index()
  dueDate: Date; // 到期日

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date; // 支付时间

  @Column({ type: 'varchar', nullable: true })
  @Index()
  paymentId: string; // 支付 ID

  @Column({ type: 'varchar', nullable: true })
  paymentMethod: string; // 支付方式

  @Column({ type: 'text', nullable: true })
  notes: string; // 备注

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isPaid(): boolean {
    return this.status === InvoiceStatus.PAID;
  }

  isOverdue(): boolean {
    return (
      this.status === InvoiceStatus.PENDING &&
      new Date() > new Date(this.dueDate)
    );
  }

  canCancel(): boolean {
    return [InvoiceStatus.DRAFT, InvoiceStatus.PENDING].includes(this.status);
  }

  calculateTotal(): void {
    const subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
    this.subtotal = subtotal;
    this.total = subtotal + Number(this.tax) - Number(this.discount);
  }

  addItem(item: InvoiceItem): void {
    this.items.push(item);
    this.calculateTotal();
  }

  removeItem(itemId: string): void {
    this.items = this.items.filter((item) => item.id !== itemId);
    this.calculateTotal();
  }
}
