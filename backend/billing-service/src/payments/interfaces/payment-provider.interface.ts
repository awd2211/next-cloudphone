import { PaymentMode } from '../entities/payment.entity';
import { SubscriptionInterval } from '../entities/subscription.entity';

/**
 * 一次性支付结果
 */
export interface OneTimePaymentResult {
  // 支付平台的交易ID
  transactionId?: string;
  // 预支付ID（用于某些平台）
  prepayId?: string;
  // 支付URL（二维码或重定向URL）
  paymentUrl?: string;
  // 客户端密钥（用于前端集成）
  clientSecret?: string;
  // 支付平台的客户ID
  customerId?: string;
  // 额外数据
  metadata?: any;
}

/**
 * 订阅创建结果
 */
export interface SubscriptionResult {
  // 订阅ID
  subscriptionId: string;
  // 客户ID
  customerId: string;
  // 订阅状态
  status: string;
  // 当前周期开始时间
  currentPeriodStart: Date;
  // 当前周期结束时间
  currentPeriodEnd: Date;
  // 试用期结束时间
  trialEnd?: Date;
  // 托管页面URL（如果适用）
  hostedPageUrl?: string;
  // 客户端密钥（如果适用）
  clientSecret?: string;
  // 额外数据
  metadata?: any;
}

/**
 * 退款结果
 */
export interface RefundResult {
  // 退款ID
  refundId: string;
  // 退款状态
  status: string;
  // 退款金额
  amount: number;
  // 退款时间
  refundedAt?: Date;
  // 额外数据
  metadata?: any;
}

/**
 * 订单查询结果
 */
export interface PaymentQueryResult {
  // 交易ID
  transactionId: string;
  // 交易状态
  status: string;
  // 交易金额
  amount: number;
  // 货币
  currency: string;
  // 支付时间
  paidAt?: Date;
  // 额外数据
  metadata?: any;
}

/**
 * 订阅查询结果
 */
export interface SubscriptionQueryResult {
  // 订阅ID
  subscriptionId: string;
  // 订阅状态
  status: string;
  // 当前周期开始时间
  currentPeriodStart: Date;
  // 当前周期结束时间
  currentPeriodEnd: Date;
  // 是否在周期结束时取消
  cancelAtPeriodEnd: boolean;
  // 额外数据
  metadata?: any;
}

/**
 * 支付提供商接口
 * 所有支付提供商（Stripe, PayPal, Paddle, WeChat, Alipay）必须实现此接口
 */
export interface IPaymentProvider {
  /**
   * 提供商名称
   */
  readonly providerName: string;

  /**
   * 创建一次性支付
   * @param params 支付参数
   * @returns 支付结果
   */
  createOneTimePayment(params: {
    amount: number;
    currency: string;
    description: string;
    paymentNo: string;
    notifyUrl: string;
    returnUrl?: string;
    mode?: PaymentMode;
    customerId?: string;
    metadata?: any;
  }): Promise<OneTimePaymentResult>;

  /**
   * 创建订阅
   * @param params 订阅参数
   * @returns 订阅结果
   */
  createSubscription(params: {
    customerId?: string;
    customerEmail?: string;
    priceId: string;
    planId?: string;
    interval: SubscriptionInterval;
    intervalCount?: number;
    trialPeriodDays?: number;
    currency: string;
    mode?: PaymentMode;
    successUrl?: string;
    cancelUrl?: string;
    metadata?: any;
  }): Promise<SubscriptionResult>;

  /**
   * 查询支付状态
   * @param paymentNo 支付单号
   * @returns 查询结果
   */
  queryPayment(paymentNo: string): Promise<PaymentQueryResult>;

  /**
   * 查询订阅状态
   * @param subscriptionId 订阅ID
   * @returns 查询结果
   */
  querySubscription(subscriptionId: string): Promise<SubscriptionQueryResult>;

  /**
   * 申请退款
   * @param params 退款参数
   * @returns 退款结果
   */
  refund(params: {
    paymentNo: string;
    refundNo: string;
    totalAmount: number;
    refundAmount: number;
    reason?: string;
    metadata?: any;
  }): Promise<RefundResult>;

  /**
   * 取消订阅
   * @param subscriptionId 订阅ID
   * @param immediately 是否立即取消（false则在周期结束时取消）
   * @returns 是否成功
   */
  cancelSubscription(subscriptionId: string, immediately?: boolean): Promise<boolean>;

  /**
   * 关闭未支付订单
   * @param paymentNo 支付单号
   * @returns 是否成功
   */
  closeOrder(paymentNo: string): Promise<boolean>;

  /**
   * 验证 Webhook 签名
   * @param payload Webhook 数据
   * @param signature 签名
   * @param timestamp 时间戳（某些平台需要）
   * @returns 是否有效
   */
  verifyWebhookSignature(payload: any, signature: string, timestamp?: string): boolean;

  /**
   * 获取客户端配置（用于前端集成）
   * @returns 公钥或客户端ID
   */
  getClientConfig(): {
    publicKey?: string;
    clientId?: string;
    mode?: string;
  };
}
