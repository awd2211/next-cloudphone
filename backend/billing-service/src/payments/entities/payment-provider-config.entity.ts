import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * 支付提供商类型
 */
export enum PaymentProviderType {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  PADDLE = 'paddle',
  WECHAT = 'wechat',
  ALIPAY = 'alipay',
}

/**
 * 运行模式
 */
export enum PaymentProviderMode {
  TEST = 'test',       // Stripe: test
  LIVE = 'live',       // Stripe: live
  SANDBOX = 'sandbox', // PayPal/Paddle: sandbox
  PRODUCTION = 'production', // PayPal/Paddle: production
}

/**
 * 支付提供商配置实体
 *
 * 存储各支付平台的 API 密钥和配置信息
 * 敏感字段（如 secretKey, privateKey）使用 AES 加密存储
 */
@Entity('payment_provider_configs')
@Index(['provider'], { unique: true })
export class PaymentProviderConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 支付提供商类型
   */
  @Column({
    type: 'enum',
    enum: PaymentProviderType,
  })
  provider: PaymentProviderType;

  /**
   * 是否启用
   */
  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  /**
   * 运行模式 (test/live/sandbox/production)
   */
  @Column({
    type: 'enum',
    enum: PaymentProviderMode,
    default: PaymentProviderMode.TEST,
  })
  mode: PaymentProviderMode;

  /**
   * 显示名称
   */
  @Column({ name: 'display_name', nullable: true })
  displayName: string;

  // ==================== 通用配置 ====================

  /**
   * 公钥 / Client ID (明文存储，前端需要)
   */
  @Column({ name: 'public_key', nullable: true })
  publicKey: string;

  /**
   * 私钥 / Secret Key (AES 加密存储)
   */
  @Column({ name: 'secret_key_encrypted', nullable: true, type: 'text' })
  secretKeyEncrypted: string;

  /**
   * Webhook 密钥 (AES 加密存储)
   */
  @Column({ name: 'webhook_secret_encrypted', nullable: true, type: 'text' })
  webhookSecretEncrypted: string;

  /**
   * Webhook URL (自动生成)
   */
  @Column({ name: 'webhook_url', nullable: true })
  webhookUrl: string;

  // ==================== Stripe 特有配置 ====================

  /**
   * Stripe 测试公钥
   */
  @Column({ name: 'stripe_test_public_key', nullable: true })
  stripeTestPublicKey: string;

  /**
   * Stripe 测试私钥 (加密)
   */
  @Column({ name: 'stripe_test_secret_key_encrypted', nullable: true, type: 'text' })
  stripeTestSecretKeyEncrypted: string;

  /**
   * Stripe 生产公钥
   */
  @Column({ name: 'stripe_live_public_key', nullable: true })
  stripeLivePublicKey: string;

  /**
   * Stripe 生产私钥 (加密)
   */
  @Column({ name: 'stripe_live_secret_key_encrypted', nullable: true, type: 'text' })
  stripeLiveSecretKeyEncrypted: string;

  // ==================== PayPal 特有配置 ====================

  /**
   * PayPal Sandbox Client ID
   */
  @Column({ name: 'paypal_sandbox_client_id', nullable: true })
  paypalSandboxClientId: string;

  /**
   * PayPal Sandbox Secret (加密)
   */
  @Column({ name: 'paypal_sandbox_secret_encrypted', nullable: true, type: 'text' })
  paypalSandboxSecretEncrypted: string;

  /**
   * PayPal Live Client ID
   */
  @Column({ name: 'paypal_live_client_id', nullable: true })
  paypalLiveClientId: string;

  /**
   * PayPal Live Secret (加密)
   */
  @Column({ name: 'paypal_live_secret_encrypted', nullable: true, type: 'text' })
  paypalLiveSecretEncrypted: string;

  /**
   * PayPal Webhook ID
   */
  @Column({ name: 'paypal_webhook_id', nullable: true })
  paypalWebhookId: string;

  // ==================== Paddle 特有配置 ====================

  /**
   * Paddle API Key (加密)
   */
  @Column({ name: 'paddle_api_key_encrypted', nullable: true, type: 'text' })
  paddleApiKeyEncrypted: string;

  // ==================== 微信支付特有配置 ====================

  /**
   * 微信 App ID
   */
  @Column({ name: 'wechat_app_id', nullable: true })
  wechatAppId: string;

  /**
   * 微信商户号
   */
  @Column({ name: 'wechat_mch_id', nullable: true })
  wechatMchId: string;

  /**
   * 微信证书序列号
   */
  @Column({ name: 'wechat_serial_no', nullable: true })
  wechatSerialNo: string;

  /**
   * 微信 API V3 密钥 (加密)
   */
  @Column({ name: 'wechat_api_v3_key_encrypted', nullable: true, type: 'text' })
  wechatApiV3KeyEncrypted: string;

  /**
   * 微信私钥 (加密)
   */
  @Column({ name: 'wechat_private_key_encrypted', nullable: true, type: 'text' })
  wechatPrivateKeyEncrypted: string;

  /**
   * 微信公钥
   */
  @Column({ name: 'wechat_public_key', nullable: true, type: 'text' })
  wechatPublicKey: string;

  // ==================== 支付宝特有配置 ====================

  /**
   * 支付宝 App ID
   */
  @Column({ name: 'alipay_app_id', nullable: true })
  alipayAppId: string;

  /**
   * 支付宝私钥 (加密)
   */
  @Column({ name: 'alipay_private_key_encrypted', nullable: true, type: 'text' })
  alipayPrivateKeyEncrypted: string;

  /**
   * 支付宝公钥
   */
  @Column({ name: 'alipay_public_key', nullable: true, type: 'text' })
  alipayPublicKey: string;

  /**
   * 支付宝网关地址
   */
  @Column({ name: 'alipay_gateway', nullable: true, default: 'https://openapi.alipay.com/gateway.do' })
  alipayGateway: string;

  // ==================== 通用元数据 ====================

  /**
   * 额外配置 (JSON 格式)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  /**
   * 最后连接测试时间
   */
  @Column({ name: 'last_tested_at', type: 'timestamp', nullable: true })
  lastTestedAt: Date;

  /**
   * 最后连接测试结果
   */
  @Column({ name: 'last_test_success', type: 'boolean', nullable: true })
  lastTestSuccess: boolean;

  /**
   * 最后连接测试消息
   */
  @Column({ name: 'last_test_message', nullable: true })
  lastTestMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
