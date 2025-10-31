import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SmsOptions, SmsResult, SmsProviderConfig } from '../sms.interface';
import axios, { AxiosInstance } from 'axios';

/**
 * MessageBird SMS 提供商
 *
 * MessageBird 是欧洲领先的云通信平台，特点:
 * - 欧洲、亚洲覆盖良好
 * - 价格相对便宜
 * - API 简单易用
 * - 支持 Verify API（验证码专用）
 *
 * 官方文档: https://developers.messagebird.com/api/sms-messaging/
 *
 * 使用示例:
 * ```typescript
 * const provider = new MessageBirdProvider(configService);
 * const result = await provider.send({
 *   to: '+1234567890',
 *   message: 'Your verification code is 123456',
 * });
 * ```
 */
@Injectable()
export class MessageBirdProvider implements SmsProvider {
  readonly name = 'MessageBird';
  private readonly logger = new Logger(MessageBirdProvider.name);
  private client: AxiosInstance;
  private config: SmsProviderConfig;
  private stats = {
    sent: 0,
    failed: 0,
    pending: 0,
  };

  private readonly BASE_URL = 'https://rest.messagebird.com';

  constructor(private configService: ConfigService) {
    this.loadConfig();
    this.initializeClient();
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    this.config = {
      provider: 'messagebird',
      apiKey: this.configService.get<string>('MESSAGEBIRD_API_KEY'),
      defaultFrom: this.configService.get<string>('MESSAGEBIRD_ORIGINATOR', 'CloudPhone'),
      enabled: this.configService.get<boolean>('MESSAGEBIRD_ENABLED', true) ?? true,
      timeout: this.configService.get<number>('MESSAGEBIRD_TIMEOUT', 30000) ?? 30000,
      retries: this.configService.get<number>('MESSAGEBIRD_RETRIES', 3) ?? 3,
    };

    if (!this.config.apiKey) {
      this.logger.warn('MessageBird API key not configured. SMS service will be disabled.');
      this.config.enabled = false;
    }
  }

  /**
   * 初始化 HTTP 客户端
   */
  private initializeClient(): void {
    if (!this.config.enabled) {
      return;
    }

    try {
      this.client = axios.create({
        baseURL: this.BASE_URL,
        timeout: this.config.timeout,
        headers: {
          Authorization: `AccessKey ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      this.logger.log('MessageBird provider initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize MessageBird client:', error);
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
        error: 'MessageBird provider is not enabled',
      };
    }

    // 验证手机号
    if (!this.validatePhoneNumber(options.to)) {
      return {
        success: false,
        error: `Invalid phone number format: ${options.to}`,
      };
    }

    try {
      this.stats.pending++;

      const payload: any = {
        originator: options.from || this.config.defaultFrom,
        recipients: [options.to],
        body: options.message,
      };

      // 如果是验证码短信，设置类型
      if (options.isOtp) {
        payload.type = 'flash'; // Flash SMS 用于 OTP
      }

      // 设置有效期
      if (options.validityPeriod) {
        payload.validity = options.validityPeriod;
      }

      const response = await this.client.post('/messages', payload);

      this.stats.pending--;
      this.stats.sent++;

      this.logger.log(`SMS sent successfully to ${options.to}, ID: ${response.data.id}`);

      return {
        success: true,
        messageId: response.data.id,
        statusCode: response.status.toString(),
        rawResponse: response.data,
      };
    } catch (error: any) {
      this.stats.pending--;
      this.stats.failed++;

      const errorMessage = error.response?.data?.errors?.[0]?.description || error.message;
      this.logger.error(`Failed to send SMS to ${options.to}:`, errorMessage);

      return {
        success: false,
        error: errorMessage || 'Failed to send SMS',
        statusCode: error.response?.status?.toString(),
        rawResponse: error.response?.data,
      };
    }
  }

  /**
   * 批量发送短信
   */
  async sendBatch(recipients: string[], message: string): Promise<SmsResult[]> {
    if (!this.config.enabled) {
      return recipients.map(() => ({
        success: false,
        error: 'MessageBird provider is not enabled',
      }));
    }

    try {
      this.stats.pending += recipients.length;

      // MessageBird 支持一次发送给多个接收者
      const payload = {
        originator: this.config.defaultFrom,
        recipients: recipients,
        body: message,
      };

      const response = await this.client.post('/messages', payload);

      this.stats.pending -= recipients.length;
      this.stats.sent += recipients.length;

      // MessageBird 返回单个消息 ID，为每个接收者创建结果
      const results: SmsResult[] = recipients.map(() => ({
        success: true,
        messageId: response.data.id,
        statusCode: response.status.toString(),
      }));

      return results;
    } catch (error: any) {
      this.stats.pending -= recipients.length;
      this.stats.failed += recipients.length;

      const errorMessage = error.response?.data?.errors?.[0]?.description || error.message;
      this.logger.error('Failed to send batch SMS:', errorMessage);

      return recipients.map(() => ({
        success: false,
        error: errorMessage || 'Failed to send batch SMS',
      }));
    }
  }

  /**
   * 验证手机号格式（国际格式）
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // 国际格式: +[国家代码][号码]
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
   * 使用 Verify API 发送验证码（推荐用于 OTP）
   */
  async sendVerificationCode(phoneNumber: string): Promise<SmsResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: 'MessageBird provider is not enabled',
      };
    }

    try {
      const payload = {
        recipient: phoneNumber,
        originator: this.config.defaultFrom,
      };

      const response = await this.client.post('/verify', payload);

      this.logger.log(`Verification code sent to ${phoneNumber}, ID: ${response.data.id}`);

      return {
        success: true,
        messageId: response.data.id,
        statusCode: response.status.toString(),
        rawResponse: response.data,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.errors?.[0]?.description || error.message;
      this.logger.error(`Failed to send verification code to ${phoneNumber}:`, errorMessage);

      return {
        success: false,
        error: errorMessage || 'Failed to send verification code',
        statusCode: error.response?.status?.toString(),
      };
    }
  }

  /**
   * 验证验证码
   */
  async verifyCode(verificationId: string, code: string): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const response = await this.client.get(`/verify/${verificationId}`, {
        params: { token: code },
      });

      return response.data.status === 'verified';
    } catch (error: any) {
      this.logger.error(`Failed to verify code for ${verificationId}:`, error.message);
      return false;
    }
  }

  /**
   * 获取账户余额
   */
  async getBalance(): Promise<number | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const response = await this.client.get('/balance');
      return response.data.amount;
    } catch (error: any) {
      this.logger.error('Failed to fetch MessageBird balance:', error.message);
      return null;
    }
  }
}
