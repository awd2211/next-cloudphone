import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISmsProvider, SmsSendData, SmsSendResult } from './sms-provider.interface';
import { AliyunSmsProvider } from './providers/aliyun-sms.provider';
import { TencentSmsProvider } from './providers/tencent-sms.provider';

/**
 * 短信服务管理器
 *
 * 支持多个短信服务提供商，自动选择可用的提供商发送短信
 *
 * 环境变量配置：
 * - SMS_DEFAULT_PROVIDER: 默认提供商（aliyun | tencent，默认：aliyun）
 * - SMS_FALLBACK_ENABLED: 是否启用故障转移（默认：true）
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly providers: Map<string, ISmsProvider> = new Map();
  private readonly defaultProvider: string;
  private readonly fallbackEnabled: boolean;

  constructor(
    private configService: ConfigService,
    private aliyunProvider: AliyunSmsProvider,
    private tencentProvider: TencentSmsProvider,
  ) {
    // 注册所有提供商
    this.providers.set(this.aliyunProvider.name, this.aliyunProvider);
    this.providers.set(this.tencentProvider.name, this.tencentProvider);

    this.defaultProvider = this.configService.get<string>('SMS_DEFAULT_PROVIDER', 'aliyun');
    this.fallbackEnabled = this.configService.get<boolean>('SMS_FALLBACK_ENABLED', true);

    this.logger.log(`SMS Service initialized with default provider: ${this.defaultProvider}`);
  }

  /**
   * 发送短信（使用默认提供商）
   */
  async send(data: SmsSendData): Promise<SmsSendResult> {
    return this.sendWithProvider(this.defaultProvider, data);
  }

  /**
   * 使用指定提供商发送短信
   */
  async sendWithProvider(providerName: string, data: SmsSendData): Promise<SmsSendResult> {
    const provider = this.providers.get(providerName);

    if (!provider) {
      this.logger.error(`SMS provider '${providerName}' not found`);
      return {
        success: false,
        error: `Provider '${providerName}' not found`,
        provider: providerName,
      };
    }

    // 检查提供商是否可用
    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      this.logger.warn(`SMS provider '${providerName}' is not available`);

      // 如果启用了故障转移，尝试其他提供商
      if (this.fallbackEnabled) {
        return this.sendWithFallback(providerName, data);
      }

      return {
        success: false,
        error: `Provider '${providerName}' is not available`,
        provider: providerName,
      };
    }

    // 发送短信
    try {
      const result = await provider.send(data);

      if (result.success) {
        this.logger.log(
          `SMS sent successfully via ${providerName} to ${data.phone} (messageId: ${result.messageId})`,
        );
      } else {
        this.logger.error(
          `Failed to send SMS via ${providerName} to ${data.phone}: ${result.error}`,
        );

        // 如果发送失败且启用了故障转移，尝试其他提供商
        if (this.fallbackEnabled) {
          return this.sendWithFallback(providerName, data);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Exception while sending SMS via ${providerName}: ${error.message}`);

      // 如果发生异常且启用了故障转移，尝试其他提供商
      if (this.fallbackEnabled) {
        return this.sendWithFallback(providerName, data);
      }

      return {
        success: false,
        error: error.message,
        provider: providerName,
      };
    }
  }

  /**
   * 故障转移：使用其他可用提供商发送
   */
  private async sendWithFallback(
    failedProvider: string,
    data: SmsSendData,
  ): Promise<SmsSendResult> {
    this.logger.log(`Attempting SMS fallback (failed provider: ${failedProvider})`);

    // 获取所有可用的提供商（排除失败的）
    const availableProviders: ISmsProvider[] = [];
    for (const [name, provider] of this.providers.entries()) {
      if (name !== failedProvider && (await provider.isAvailable())) {
        availableProviders.push(provider);
      }
    }

    if (availableProviders.length === 0) {
      this.logger.error('No fallback SMS providers available');
      return {
        success: false,
        error: 'All SMS providers are unavailable',
        provider: 'fallback',
      };
    }

    // 尝试第一个可用的提供商
    const fallbackProvider = availableProviders[0];
    this.logger.log(`Using fallback provider: ${fallbackProvider.name}`);

    try {
      return await fallbackProvider.send(data);
    } catch (error) {
      this.logger.error(`Fallback provider ${fallbackProvider.name} also failed: ${error.message}`);
      return {
        success: false,
        error: `Fallback failed: ${error.message}`,
        provider: fallbackProvider.name,
      };
    }
  }

  /**
   * 获取所有提供商的可用性状态
   */
  async getProvidersStatus(): Promise<
    Array<{
      name: string;
      available: boolean;
    }>
  > {
    const status = [];

    for (const [name, provider] of this.providers.entries()) {
      const available = await provider.isAvailable();
      status.push({ name, available });
    }

    return status;
  }

  /**
   * 获取默认提供商名称
   */
  getDefaultProvider(): string {
    return this.defaultProvider;
  }
}
