import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  PaymentProviderConfig,
  PaymentProviderType,
  PaymentProviderMode,
} from '../entities/payment-provider-config.entity';
import { EncryptionService } from './encryption.service';

/**
 * 支付配置 DTO（前端输入）
 */
export interface PaymentProviderConfigDto {
  provider: PaymentProviderType;
  enabled?: boolean;
  mode?: PaymentProviderMode;
  displayName?: string;

  // Stripe
  stripeTestPublicKey?: string;
  stripeTestSecretKey?: string;
  stripeLivePublicKey?: string;
  stripeLiveSecretKey?: string;
  stripeWebhookSecret?: string;

  // PayPal
  paypalSandboxClientId?: string;
  paypalSandboxSecret?: string;
  paypalLiveClientId?: string;
  paypalLiveSecret?: string;
  paypalWebhookId?: string;

  // Paddle
  paddleApiKey?: string;
  paddleWebhookSecret?: string;

  // 微信支付
  wechatAppId?: string;
  wechatMchId?: string;
  wechatSerialNo?: string;
  wechatApiV3Key?: string;
  wechatPrivateKey?: string;
  wechatPublicKey?: string;

  // 支付宝
  alipayAppId?: string;
  alipayPrivateKey?: string;
  alipayPublicKey?: string;
  alipayGateway?: string;

  // 通用
  metadata?: Record<string, any>;
}

/**
 * 支付配置响应（返回给前端，敏感信息掩码）
 */
export interface PaymentProviderConfigResponse {
  id: string;
  provider: PaymentProviderType;
  enabled: boolean;
  mode: PaymentProviderMode;
  displayName: string;

  // 公开信息
  publicKey?: string;
  webhookUrl?: string;

  // 各平台特有公开信息
  stripeTestPublicKey?: string;
  stripeLivePublicKey?: string;
  paypalSandboxClientId?: string;
  paypalLiveClientId?: string;
  paypalWebhookId?: string;
  wechatAppId?: string;
  wechatMchId?: string;
  alipayAppId?: string;
  alipayGateway?: string;

  // 敏感信息掩码显示
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
  secretKeyMasked?: string;
  webhookSecretMasked?: string;

  // 连接状态
  lastTestedAt?: Date;
  lastTestSuccess?: boolean;
  lastTestMessage?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * 支付配置管理服务
 *
 * 负责管理支付提供商的配置信息，包括：
 * - 配置的 CRUD 操作
 * - 敏感信息的加密/解密
 * - 配置的缓存管理
 */
@Injectable()
export class PaymentConfigService {
  private readonly logger = new Logger(PaymentConfigService.name);

  // 内存缓存配置（避免频繁数据库查询）
  private configCache: Map<PaymentProviderType, PaymentProviderConfig> = new Map();
  private cacheExpiry: number = 0;
  private readonly cacheTTL = 60 * 1000; // 1 分钟缓存

  constructor(
    @InjectRepository(PaymentProviderConfig)
    private readonly configRepository: Repository<PaymentProviderConfig>,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 获取所有支付配置（前端展示用）
   */
  async getAllConfigs(): Promise<PaymentProviderConfigResponse[]> {
    const configs = await this.configRepository.find({
      order: { provider: 'ASC' },
    });

    // 确保所有支付方式都有配置记录
    const existingProviders = new Set(configs.map((c) => c.provider));
    const allProviders = Object.values(PaymentProviderType);

    for (const provider of allProviders) {
      if (!existingProviders.has(provider)) {
        // 创建默认配置
        const defaultConfig = await this.createDefaultConfig(provider);
        configs.push(defaultConfig);
      }
    }

    return configs.map((config) => this.toResponse(config));
  }

  /**
   * 获取单个支付配置（前端展示用）
   */
  async getConfig(provider: PaymentProviderType): Promise<PaymentProviderConfigResponse> {
    let config = await this.configRepository.findOne({ where: { provider } });

    if (!config) {
      config = await this.createDefaultConfig(provider);
    }

    return this.toResponse(config);
  }

  /**
   * 获取解密后的配置（内部使用）
   */
  async getDecryptedConfig(provider: PaymentProviderType): Promise<PaymentProviderConfig & {
    // 解密后的字段
    secretKey?: string;
    webhookSecret?: string;
    stripeTestSecretKey?: string;
    stripeLiveSecretKey?: string;
    paypalSandboxSecret?: string;
    paypalLiveSecret?: string;
    paddleApiKey?: string;
    wechatApiV3Key?: string;
    wechatPrivateKey?: string;
    alipayPrivateKey?: string;
  }> {
    // 检查缓存
    if (this.cacheExpiry > Date.now() && this.configCache.has(provider)) {
      const cached = this.configCache.get(provider)!;
      return this.decryptConfig(cached);
    }

    let config = await this.configRepository.findOne({ where: { provider } });

    if (!config) {
      config = await this.createDefaultConfig(provider);
    }

    // 更新缓存
    this.configCache.set(provider, config);
    this.cacheExpiry = Date.now() + this.cacheTTL;

    return this.decryptConfig(config);
  }

  /**
   * 更新支付配置
   */
  async updateConfig(dto: PaymentProviderConfigDto): Promise<PaymentProviderConfigResponse> {
    let config = await this.configRepository.findOne({
      where: { provider: dto.provider },
    });

    if (!config) {
      config = this.configRepository.create({ provider: dto.provider });
    }

    // 更新基本字段
    if (dto.enabled !== undefined) config.enabled = dto.enabled;
    if (dto.mode !== undefined) config.mode = dto.mode;
    if (dto.displayName !== undefined) config.displayName = dto.displayName;
    if (dto.metadata !== undefined) config.metadata = dto.metadata;

    // 根据支付方式更新特定字段
    switch (dto.provider) {
      case PaymentProviderType.STRIPE:
        this.updateStripeConfig(config, dto);
        break;
      case PaymentProviderType.PAYPAL:
        this.updatePaypalConfig(config, dto);
        break;
      case PaymentProviderType.PADDLE:
        this.updatePaddleConfig(config, dto);
        break;
      case PaymentProviderType.WECHAT:
        this.updateWechatConfig(config, dto);
        break;
      case PaymentProviderType.ALIPAY:
        this.updateAlipayConfig(config, dto);
        break;
    }

    // 生成 Webhook URL
    const apiGatewayUrl = this.configService.get('API_GATEWAY_URL', 'http://localhost:30000');
    config.webhookUrl = `${apiGatewayUrl}/payments/webhook/${dto.provider}`;

    // 保存
    const saved = await this.configRepository.save(config);

    // 清除缓存
    this.configCache.delete(dto.provider);

    this.logger.log(`支付配置已更新: ${dto.provider}`);

    return this.toResponse(saved);
  }

  /**
   * 记录连接测试结果
   */
  async recordTestResult(
    provider: PaymentProviderType,
    success: boolean,
    message: string,
  ): Promise<void> {
    await this.configRepository.update(
      { provider },
      {
        lastTestedAt: new Date(),
        lastTestSuccess: success,
        lastTestMessage: message,
      },
    );

    // 清除缓存
    this.configCache.delete(provider);
  }

  /**
   * 获取启用的支付方式列表
   */
  async getEnabledMethods(): Promise<PaymentProviderType[]> {
    const configs = await this.configRepository.find({
      where: { enabled: true },
      select: ['provider'],
    });

    return configs.map((c) => c.provider);
  }

  /**
   * 清除配置缓存
   */
  clearCache(): void {
    this.configCache.clear();
    this.cacheExpiry = 0;
    this.logger.debug('配置缓存已清除');
  }

  // ==================== 私有方法 ====================

  /**
   * 创建默认配置
   */
  private async createDefaultConfig(provider: PaymentProviderType): Promise<PaymentProviderConfig> {
    const displayNames: Record<PaymentProviderType, string> = {
      [PaymentProviderType.STRIPE]: 'Stripe',
      [PaymentProviderType.PAYPAL]: 'PayPal',
      [PaymentProviderType.PADDLE]: 'Paddle',
      [PaymentProviderType.WECHAT]: '微信支付',
      [PaymentProviderType.ALIPAY]: '支付宝',
    };

    const defaultModes: Record<PaymentProviderType, PaymentProviderMode> = {
      [PaymentProviderType.STRIPE]: PaymentProviderMode.TEST,
      [PaymentProviderType.PAYPAL]: PaymentProviderMode.SANDBOX,
      [PaymentProviderType.PADDLE]: PaymentProviderMode.SANDBOX,
      [PaymentProviderType.WECHAT]: PaymentProviderMode.TEST,
      [PaymentProviderType.ALIPAY]: PaymentProviderMode.TEST,
    };

    const config = this.configRepository.create({
      provider,
      enabled: false,
      mode: defaultModes[provider],
      displayName: displayNames[provider],
    });

    // 生成 Webhook URL
    const apiGatewayUrl = this.configService.get('API_GATEWAY_URL', 'http://localhost:30000');
    config.webhookUrl = `${apiGatewayUrl}/payments/webhook/${provider}`;

    return await this.configRepository.save(config);
  }

  /**
   * 转换为前端响应格式（敏感信息掩码）
   */
  private toResponse(config: PaymentProviderConfig): PaymentProviderConfigResponse {
    const response: PaymentProviderConfigResponse = {
      id: config.id,
      provider: config.provider,
      enabled: config.enabled,
      mode: config.mode,
      displayName: config.displayName || config.provider,
      webhookUrl: config.webhookUrl,
      hasSecretKey: false,
      hasWebhookSecret: !!config.webhookSecretEncrypted,
      lastTestedAt: config.lastTestedAt,
      lastTestSuccess: config.lastTestSuccess,
      lastTestMessage: config.lastTestMessage,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };

    // 根据支付方式填充特定字段
    switch (config.provider) {
      case PaymentProviderType.STRIPE:
        response.stripeTestPublicKey = config.stripeTestPublicKey;
        response.stripeLivePublicKey = config.stripeLivePublicKey;
        response.hasSecretKey = !!(config.stripeTestSecretKeyEncrypted || config.stripeLiveSecretKeyEncrypted);
        if (config.stripeTestSecretKeyEncrypted) {
          response.secretKeyMasked = this.encryptionService.mask(
            this.encryptionService.decrypt(config.stripeTestSecretKeyEncrypted)
          );
        }
        break;

      case PaymentProviderType.PAYPAL:
        response.paypalSandboxClientId = config.paypalSandboxClientId;
        response.paypalLiveClientId = config.paypalLiveClientId;
        response.paypalWebhookId = config.paypalWebhookId;
        response.hasSecretKey = !!(config.paypalSandboxSecretEncrypted || config.paypalLiveSecretEncrypted);
        break;

      case PaymentProviderType.PADDLE:
        response.hasSecretKey = !!config.paddleApiKeyEncrypted;
        break;

      case PaymentProviderType.WECHAT:
        response.wechatAppId = config.wechatAppId;
        response.wechatMchId = config.wechatMchId;
        response.hasSecretKey = !!(config.wechatApiV3KeyEncrypted || config.wechatPrivateKeyEncrypted);
        break;

      case PaymentProviderType.ALIPAY:
        response.alipayAppId = config.alipayAppId;
        response.alipayGateway = config.alipayGateway;
        response.hasSecretKey = !!config.alipayPrivateKeyEncrypted;
        break;
    }

    return response;
  }

  /**
   * 解密配置
   */
  private decryptConfig(config: PaymentProviderConfig): any {
    const decrypted: any = { ...config };

    // 通用字段
    if (config.secretKeyEncrypted) {
      decrypted.secretKey = this.encryptionService.decrypt(config.secretKeyEncrypted);
    }
    if (config.webhookSecretEncrypted) {
      decrypted.webhookSecret = this.encryptionService.decrypt(config.webhookSecretEncrypted);
    }

    // Stripe
    if (config.stripeTestSecretKeyEncrypted) {
      decrypted.stripeTestSecretKey = this.encryptionService.decrypt(config.stripeTestSecretKeyEncrypted);
    }
    if (config.stripeLiveSecretKeyEncrypted) {
      decrypted.stripeLiveSecretKey = this.encryptionService.decrypt(config.stripeLiveSecretKeyEncrypted);
    }

    // PayPal
    if (config.paypalSandboxSecretEncrypted) {
      decrypted.paypalSandboxSecret = this.encryptionService.decrypt(config.paypalSandboxSecretEncrypted);
    }
    if (config.paypalLiveSecretEncrypted) {
      decrypted.paypalLiveSecret = this.encryptionService.decrypt(config.paypalLiveSecretEncrypted);
    }

    // Paddle
    if (config.paddleApiKeyEncrypted) {
      decrypted.paddleApiKey = this.encryptionService.decrypt(config.paddleApiKeyEncrypted);
    }

    // 微信
    if (config.wechatApiV3KeyEncrypted) {
      decrypted.wechatApiV3Key = this.encryptionService.decrypt(config.wechatApiV3KeyEncrypted);
    }
    if (config.wechatPrivateKeyEncrypted) {
      decrypted.wechatPrivateKey = this.encryptionService.decrypt(config.wechatPrivateKeyEncrypted);
    }

    // 支付宝
    if (config.alipayPrivateKeyEncrypted) {
      decrypted.alipayPrivateKey = this.encryptionService.decrypt(config.alipayPrivateKeyEncrypted);
    }

    return decrypted;
  }

  /**
   * 更新 Stripe 配置
   */
  private updateStripeConfig(config: PaymentProviderConfig, dto: PaymentProviderConfigDto): void {
    if (dto.stripeTestPublicKey !== undefined) {
      config.stripeTestPublicKey = dto.stripeTestPublicKey;
    }
    if (dto.stripeTestSecretKey) {
      config.stripeTestSecretKeyEncrypted = this.encryptionService.encrypt(dto.stripeTestSecretKey);
    }
    if (dto.stripeLivePublicKey !== undefined) {
      config.stripeLivePublicKey = dto.stripeLivePublicKey;
    }
    if (dto.stripeLiveSecretKey) {
      config.stripeLiveSecretKeyEncrypted = this.encryptionService.encrypt(dto.stripeLiveSecretKey);
    }
    if (dto.stripeWebhookSecret) {
      config.webhookSecretEncrypted = this.encryptionService.encrypt(dto.stripeWebhookSecret);
    }
  }

  /**
   * 更新 PayPal 配置
   */
  private updatePaypalConfig(config: PaymentProviderConfig, dto: PaymentProviderConfigDto): void {
    if (dto.paypalSandboxClientId !== undefined) {
      config.paypalSandboxClientId = dto.paypalSandboxClientId;
    }
    if (dto.paypalSandboxSecret) {
      config.paypalSandboxSecretEncrypted = this.encryptionService.encrypt(dto.paypalSandboxSecret);
    }
    if (dto.paypalLiveClientId !== undefined) {
      config.paypalLiveClientId = dto.paypalLiveClientId;
    }
    if (dto.paypalLiveSecret) {
      config.paypalLiveSecretEncrypted = this.encryptionService.encrypt(dto.paypalLiveSecret);
    }
    if (dto.paypalWebhookId !== undefined) {
      config.paypalWebhookId = dto.paypalWebhookId;
    }
  }

  /**
   * 更新 Paddle 配置
   */
  private updatePaddleConfig(config: PaymentProviderConfig, dto: PaymentProviderConfigDto): void {
    if (dto.paddleApiKey) {
      config.paddleApiKeyEncrypted = this.encryptionService.encrypt(dto.paddleApiKey);
    }
    if (dto.paddleWebhookSecret) {
      config.webhookSecretEncrypted = this.encryptionService.encrypt(dto.paddleWebhookSecret);
    }
  }

  /**
   * 更新微信支付配置
   */
  private updateWechatConfig(config: PaymentProviderConfig, dto: PaymentProviderConfigDto): void {
    if (dto.wechatAppId !== undefined) {
      config.wechatAppId = dto.wechatAppId;
    }
    if (dto.wechatMchId !== undefined) {
      config.wechatMchId = dto.wechatMchId;
    }
    if (dto.wechatSerialNo !== undefined) {
      config.wechatSerialNo = dto.wechatSerialNo;
    }
    if (dto.wechatApiV3Key) {
      config.wechatApiV3KeyEncrypted = this.encryptionService.encrypt(dto.wechatApiV3Key);
    }
    if (dto.wechatPrivateKey) {
      config.wechatPrivateKeyEncrypted = this.encryptionService.encrypt(dto.wechatPrivateKey);
    }
    if (dto.wechatPublicKey !== undefined) {
      config.wechatPublicKey = dto.wechatPublicKey;
    }
  }

  /**
   * 更新支付宝配置
   */
  private updateAlipayConfig(config: PaymentProviderConfig, dto: PaymentProviderConfigDto): void {
    if (dto.alipayAppId !== undefined) {
      config.alipayAppId = dto.alipayAppId;
    }
    if (dto.alipayPrivateKey) {
      config.alipayPrivateKeyEncrypted = this.encryptionService.encrypt(dto.alipayPrivateKey);
    }
    if (dto.alipayPublicKey !== undefined) {
      config.alipayPublicKey = dto.alipayPublicKey;
    }
    if (dto.alipayGateway !== undefined) {
      config.alipayGateway = dto.alipayGateway;
    }
  }
}
