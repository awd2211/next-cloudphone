import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SmsOptions, SmsResult, SmsProviderConfig } from '../sms.interface';
import Twilio from 'twilio';

/**
 * Twilio SMS 提供商
 *
 * Twilio 是全球最流行的云通信平台，支持:
 * - 200+ 国家/地区
 * - 高送达率
 * - 双向短信
 * - 短信验证 API
 *
 * 官方文档: https://www.twilio.com/docs/sms
 *
 * 使用示例:
 * ```typescript
 * const provider = new TwilioSmsProvider(configService);
 * const result = await provider.send({
 *   to: '+1234567890',
 *   message: 'Your verification code is 123456',
 * });
 * ```
 */
@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  readonly name = 'Twilio';
  private readonly logger = new Logger(TwilioSmsProvider.name);
  private client: Twilio.Twilio;
  private config: SmsProviderConfig;
  private stats = {
    sent: 0,
    failed: 0,
    pending: 0,
  };

  constructor(private configService: ConfigService) {
    this.loadConfig();
    this.initializeClient();
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    this.config = {
      provider: 'twilio',
      accountSid: this.configService.get<string>('TWILIO_ACCOUNT_SID'),
      authToken: this.configService.get<string>('TWILIO_AUTH_TOKEN'),
      defaultFrom: this.configService.get<string>('TWILIO_FROM_NUMBER'),
      enabled: this.configService.get<boolean>('TWILIO_ENABLED', true) ?? true,
      timeout: this.configService.get<number>('TWILIO_TIMEOUT', 30000) ?? 30000,
      retries: this.configService.get<number>('TWILIO_RETRIES', 3) ?? 3,
    };

    if (!this.config.accountSid || !this.config.authToken) {
      this.logger.warn('Twilio credentials not configured. SMS service will be disabled.');
      this.config.enabled = false;
    }
  }

  /**
   * 初始化 Twilio 客户端
   */
  private initializeClient(): void {
    if (!this.config.enabled) {
      return;
    }

    try {
      this.client = Twilio(this.config.accountSid!, this.config.authToken!, {
        lazyLoading: true,
        autoRetry: true,
        maxRetries: this.config.retries,
      });

      this.logger.log('Twilio SMS provider initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Twilio client:', error);
      this.config.enabled = false;
    }
  }

  /**
   * 发送短信
   */
  async send(options: SmsOptions): Promise<SmsResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: 'Twilio SMS provider is not enabled',
      };
    }

    // 验证手机号
    if (!this.validatePhoneNumber(options.to)) {
      return {
        success: false,
        error: `Invalid phone number format: ${options.to}`,
      };
    }

    const from = options.from || this.config.defaultFrom;
    if (!from) {
      return {
        success: false,
        error: 'No sender phone number configured',
      };
    }

    try {
      this.stats.pending++;

      const messageOptions: any = {
        from,
        to: options.to,
        body: options.message,
      };

      // 如果是验证码短信，设置有效期
      if (options.isOtp && options.validityPeriod) {
        messageOptions.validityPeriod = options.validityPeriod;
      }

      const message = await this.client.messages.create(messageOptions);

      this.stats.pending--;
      this.stats.sent++;

      this.logger.log(`SMS sent successfully to ${options.to}, SID: ${message.sid}`);

      return {
        success: true,
        messageId: message.sid,
        statusCode: message.status,
        rawResponse: message,
      };
    } catch (error: any) {
      this.stats.pending--;
      this.stats.failed++;

      this.logger.error(`Failed to send SMS to ${options.to}:`, error);

      return {
        success: false,
        error: error.message || 'Failed to send SMS',
        statusCode: error.code?.toString(),
        rawResponse: error,
      };
    }
  }

  /**
   * 批量发送短信
   */
  async sendBatch(recipients: string[], message: string): Promise<SmsResult[]> {
    const results: SmsResult[] = [];

    // Twilio 不支持真正的批量发送，需要逐个发送
    // 但我们可以并发发送以提高性能
    const promises = recipients.map((to) => this.send({ to, message }));

    const batchResults = await Promise.allSettled(promises);

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          error: result.reason?.message || 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * 验证手机号格式（国际格式）
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // 国际格式: +[国家代码][号码]
    // 例如: +1234567890, +861234567890
    const internationalPattern = /^\+[1-9]\d{1,14}$/;

    return internationalPattern.test(phoneNumber);
  }

  /**
   * 获取发送统计
   */
  async getStats(): Promise<{ sent: number; failed: number; pending: number }> {
    return { ...this.stats };
  }

  /**
   * 查询消息状态
   */
  async getMessageStatus(messageId: string): Promise<string | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const message = await this.client.messages(messageId).fetch();
      return message.status;
    } catch (error: any) {
      this.logger.error(`Failed to fetch message status for ${messageId}:`, error);
      return null;
    }
  }

  /**
   * 获取账户余额（Twilio）
   */
  async getBalance(): Promise<number | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const account = await this.client.api.v2010.accounts(this.config.accountSid!).fetch();
      // Twilio balance is a string like "-5.00" or "0.00"
      const balance = account.balance as unknown as string;
      return parseFloat(balance || '0');
    } catch (error: any) {
      this.logger.error('Failed to fetch Twilio account balance:', error);
      return null;
    }
  }
}
