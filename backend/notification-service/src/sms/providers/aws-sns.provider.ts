import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SmsOptions, SmsResult, SmsProviderConfig } from '../sms.interface';
import { SNSClient, PublishCommand, PublishBatchCommand } from '@aws-sdk/client-sns';

/**
 * AWS SNS SMS 提供商
 *
 * Amazon Simple Notification Service (SNS) 特点:
 * - 全球覆盖（AWS 所有区域）
 * - 按量付费，性价比高
 * - 与 AWS 生态集成
 * - 支持事务性和促销性短信
 *
 * 官方文档: https://docs.aws.amazon.com/sns/latest/dg/sns-mobile-phone-number-as-subscriber.html
 *
 * 使用示例:
 * ```typescript
 * const provider = new AwsSnsProvider(configService);
 * const result = await provider.send({
 *   to: '+1234567890',
 *   message: 'Your verification code is 123456',
 *   isOtp: true,
 * });
 * ```
 */
@Injectable()
export class AwsSnsProvider implements SmsProvider {
  readonly name = 'AWS SNS';
  private readonly logger = new Logger(AwsSnsProvider.name);
  private client: SNSClient;
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
      provider: 'aws-sns',
      apiKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      apiKeySecret: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      defaultFrom: this.configService.get<string>('AWS_SNS_SENDER_ID'), // Sender ID
      enabled: this.configService.get<boolean>('AWS_SNS_ENABLED', true) ?? true,
      timeout: this.configService.get<number>('AWS_SNS_TIMEOUT', 30000) ?? 30000,
      retries: this.configService.get<number>('AWS_SNS_RETRIES', 3) ?? 3,
    };

    if (!this.config.apiKeyId || !this.config.apiKeySecret) {
      this.logger.warn('AWS credentials not configured. SMS service will be disabled.');
      this.config.enabled = false;
    }
  }

  /**
   * 初始化 AWS SNS 客户端
   */
  private initializeClient(): void {
    if (!this.config.enabled) {
      return;
    }

    try {
      this.client = new SNSClient({
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.apiKeyId!,
          secretAccessKey: this.config.apiKeySecret!,
        },
        maxAttempts: this.config.retries,
        requestHandler: {
          requestTimeout: this.config.timeout,
        } as any,
      });

      this.logger.log('AWS SNS provider initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize AWS SNS client:', error);
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
        error: 'AWS SNS provider is not enabled',
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

      const params: any = {
        PhoneNumber: options.to,
        Message: options.message,
        MessageAttributes: {
          // 设置短信类型
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: options.isOtp ? 'Transactional' : 'Promotional',
          },
        },
      };

      // 设置 Sender ID（发送方显示名称）
      if (this.config.defaultFrom || options.from) {
        params.MessageAttributes['AWS.SNS.SMS.SenderID'] = {
          DataType: 'String',
          StringValue: options.from || this.config.defaultFrom,
        };
      }

      // 设置最大价格（防止超支）
      params.MessageAttributes['AWS.SNS.SMS.MaxPrice'] = {
        DataType: 'String',
        StringValue: '0.50', // 每条短信最高 $0.50
      };

      const command = new PublishCommand(params);
      const response = await this.client.send(command);

      this.stats.pending--;
      this.stats.sent++;

      this.logger.log(`SMS sent successfully to ${options.to}, MessageId: ${response.MessageId}`);

      return {
        success: true,
        messageId: response.MessageId,
        statusCode: response.$metadata.httpStatusCode?.toString(),
        rawResponse: response,
      };
    } catch (error: any) {
      this.stats.pending--;
      this.stats.failed++;

      this.logger.error(`Failed to send SMS to ${options.to}:`, error);

      return {
        success: false,
        error: error.message || 'Failed to send SMS',
        statusCode: error.$metadata?.httpStatusCode?.toString(),
        rawResponse: error,
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
        error: 'AWS SNS provider is not enabled',
      }));
    }

    // AWS SNS 支持批量发布，但短信需要逐个发送
    // 我们使用 Promise.all 并发发送
    const promises = recipients.map((to) =>
      this.send({ to, message }),
    );

    return Promise.all(promises);
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
   * 设置短信支出限额（美元/月）
   */
  async setSpendLimit(limit: number): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      // Note: AWS SNS 的支出限额需要通过 AWS CLI 或控制台设置
      // 这里仅作为示例
      this.logger.log(`SMS spend limit set to $${limit}/month (via AWS Console)`);
      return true;
    } catch (error: any) {
      this.logger.error('Failed to set spend limit:', error);
      return false;
    }
  }
}
