import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum PaymentMethodType {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  ALIPAY = 'alipay',
  WECHAT = 'wechat',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
}

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: PaymentMethodType,
    comment: '支付方式类型',
  })
  type: PaymentMethodType;

  @Column({ length: 100, comment: '支付方式显示名称' })
  name: string;

  @Column({ name: 'last_four', length: 4, nullable: true, comment: '卡号后4位' })
  lastFour: string;

  @Column({
    name: 'card_brand',
    length: 50,
    nullable: true,
    comment: '卡品牌 (Visa, MasterCard, etc.)',
  })
  cardBrand: string;

  @Column({ name: 'expiry_month', type: 'int', nullable: true, comment: '有效期月份' })
  expiryMonth: number;

  @Column({ name: 'expiry_year', type: 'int', nullable: true, comment: '有效期年份' })
  expiryYear: number;

  @Column({
    name: 'account_identifier',
    length: 200,
    nullable: true,
    comment: '账户标识符 (支付宝/微信账号等)',
  })
  accountIdentifier: string;

  @Column({ name: 'payment_provider', length: 100, nullable: true, comment: '支付服务商' })
  paymentProvider: string;

  @Column({
    name: 'provider_payment_method_id',
    length: 200,
    nullable: true,
    comment: '支付服务商的支付方式ID',
  })
  providerPaymentMethodId: string;

  @Column({ name: 'is_default', default: false, comment: '是否为默认支付方式' })
  isDefault: boolean;

  @Column({ name: 'is_verified', default: false, comment: '是否已验证' })
  isVerified: boolean;

  @Column({ name: 'billing_address', type: 'jsonb', nullable: true, comment: '账单地址' })
  billingAddress: {
    country?: string;
    state?: string;
    city?: string;
    postalCode?: string;
    addressLine1?: string;
    addressLine2?: string;
  };

  @Column({ type: 'jsonb', nullable: true, comment: '额外元数据' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true, comment: '软删除时间' })
  deletedAt: Date;
}
