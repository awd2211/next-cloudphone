import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SmsOptions, SmsResult } from './sms.interface';
import { TwilioSmsProvider } from './providers/twilio.provider';
import { AwsSnsProvider } from './providers/aws-sns.provider';
import { MessageBirdProvider } from './providers/messagebird.provider';

/**
 * SMS 服务主类
 *
 * 功能:
 * 1. 统一管理多个 SMS 提供商
 * 2. 自动故障转移（Failover）
 * 3. 负载均衡
 * 4. 发送统计和监控
 *
 * 使用示例:
 * ```typescript
 * @Controller('sms')
 * export class SmsController {
 *   constructor(private smsService: SmsService) {}
 *
 *   @Post('send-otp')
 *   async sendOtp(@Body() dto: SendOtpDto) {
 *     return this.smsService.sendOtp(dto.phoneNumber, dto.code);
 *   }
 * }
 * ```
 */
@Injectable()
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name);
  private providers: Map<string, SmsProvider> = new Map();
  private primaryProvider: string;
  private fallbackProviders: string[] = [];

  constructor(
    private configService: ConfigService,
    private twilioProvider: TwilioSmsProvider,
    private awsSnsProvider: AwsSnsProvider,
    private messageBirdProvider: MessageBirdProvider,
  ) {
    this.registerProviders();
    this.configureFailover();
  }

  async onModuleInit() {
    this.logger.log('SMS Service initialized');
    this.logProviderStatus();
  }

  /**
   * 注册所有提供商
   */
  private registerProviders(): void {
    this.providers.set('twilio', this.twilioProvider);
    this.providers.set('aws-sns', this.awsSnsProvider);
    this.providers.set('messagebird', this.messageBirdProvider);
  }

  /**
   * 配置故障转移
   */
  private configureFailover(): void {
    // 从环境变量读取主提供商和备用提供商
    this.primaryProvider = this.configService.get<string>(
      'SMS_PRIMARY_PROVIDER',
      'twilio',
    )!;

    const fallbackConfig = this.configService.get<string>(
      'SMS_FALLBACK_PROVIDERS',
      'aws-sns,messagebird',
    )!;

    this.fallbackProviders = fallbackConfig.split(',').map((p) => p.trim());

    this.logger.log(`Primary SMS provider: ${this.primaryProvider}`);
    this.logger.log(`Fallback providers: ${this.fallbackProviders.join(', ')}`);
  }

  /**
   * 发送短信（带自动故障转移）
   */
  async send(options: SmsOptions): Promise<SmsResult> {
    // 尝试主提供商
    let result = await this.sendWithProvider(this.primaryProvider, options);

    // 如果主提供商失败，尝试备用提供商
    if (!result.success) {
      this.logger.warn(
        `Primary provider ${this.primaryProvider} failed, trying fallback providers`,
      );

      for (const providerName of this.fallbackProviders) {
        result = await this.sendWithProvider(providerName, options);
        if (result.success) {
          this.logger.log(`SMS sent successfully using fallback provider: ${providerName}`);
          break;
        }
      }
    }

    return result;
  }

  /**
   * 使用指定提供商发送
   */
  private async sendWithProvider(
    providerName: string,
    options: SmsOptions,
  ): Promise<SmsResult> {
    const provider = this.providers.get(providerName);

    if (!provider) {
      return {
        success: false,
        error: `Provider ${providerName} not found`,
      };
    }

    try {
      return await provider.send(options);
    } catch (error: any) {
      this.logger.error(`Provider ${providerName} threw an error:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * 发送验证码短信
   */
  async sendOtp(phoneNumber: string, code: string, expiryMinutes = 5): Promise<SmsResult> {
    const message = `Your verification code is: ${code}. It will expire in ${expiryMinutes} minutes. Do not share this code with anyone.`;

    return this.send({
      to: phoneNumber,
      message,
      isOtp: true,
      validityPeriod: expiryMinutes * 60,
    });
  }

  /**
   * 发送通知短信
   */
  async sendNotification(phoneNumber: string, message: string): Promise<SmsResult> {
    return this.send({
      to: phoneNumber,
      message,
      isOtp: false,
    });
  }

  /**
   * 批量发送短信
   */
  async sendBatch(recipients: string[], message: string): Promise<SmsResult[]> {
    const provider = this.providers.get(this.primaryProvider);

    if (!provider) {
      return recipients.map(() => ({
        success: false,
        error: 'No provider available',
      }));
    }

    return provider.sendBatch(recipients, message);
  }

  /**
   * 发送支付成功通知
   */
  async sendPaymentSuccess(
    phoneNumber: string,
    amount: number,
    currency: string,
  ): Promise<SmsResult> {
    const message = `Payment successful! Amount: ${currency} ${amount}. Thank you for using our service.`;
    return this.sendNotification(phoneNumber, message);
  }

  /**
   * 发送设备异常通知
   */
  async sendDeviceAlert(
    phoneNumber: string,
    deviceId: string,
    issue: string,
  ): Promise<SmsResult> {
    const message = `ALERT: Device ${deviceId} is experiencing an issue: ${issue}. Please check your dashboard for details.`;
    return this.sendNotification(phoneNumber, message);
  }

  /**
   * 发送设备到期提醒
   */
  async sendDeviceExpiration(
    phoneNumber: string,
    deviceId: string,
    daysUntilExpiry: number,
  ): Promise<SmsResult> {
    const message = `Reminder: Your device ${deviceId} will expire in ${daysUntilExpiry} days. Please renew to avoid service interruption.`;
    return this.sendNotification(phoneNumber, message);
  }

  /**
   * 获取所有提供商的统计信息
   */
  async getAllStats(): Promise<
    Record<string, { sent: number; failed: number; pending: number }>
  > {
    const stats: Record<string, any> = {};

    for (const [name, provider] of this.providers.entries()) {
      if (provider.getStats) {
        stats[name] = await provider.getStats();
      }
    }

    return stats;
  }

  /**
   * 验证手机号格式
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // 使用主提供商的验证逻辑
    const provider = this.providers.get(this.primaryProvider);
    return provider ? provider.validatePhoneNumber(phoneNumber) : false;
  }

  /**
   * 记录提供商状态
   */
  private logProviderStatus(): void {
    for (const [name, provider] of this.providers.entries()) {
      this.logger.log(`Provider ${name} (${provider.name}) is registered`);
    }
  }

  /**
   * 获取指定提供商
   */
  getProvider(name: string): SmsProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    providers: Record<string, boolean>;
  }> {
    const providerHealth: Record<string, boolean> = {};

    for (const [name, provider] of this.providers.entries()) {
      // 简单的健康检查：验证一个测试号码
      const isHealthy = provider.validatePhoneNumber('+1234567890');
      providerHealth[name] = isHealthy;
    }

    const healthy = Object.values(providerHealth).some((h) => h);

    return {
      healthy,
      providers: providerHealth,
    };
  }
}
