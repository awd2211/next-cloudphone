import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider, EmailOptions, EmailResult, EmailProviderConfig } from '../email.interface';
import axios, { AxiosInstance } from 'axios';

/**
 * SparkPost 邮件提供商
 *
 * SparkPost 是企业级邮件发送平台:
 * - 全球基础设施，支持多区域部署
 * - 每月 500 封免费邮件 (测试账户)
 * - 强大的预测性分析
 * - 实时事件流
 * - 支持 SMTP 和 REST API
 *
 * 官方文档: https://developers.sparkpost.com/api/
 *
 * 环境变量配置:
 * - SPARKPOST_API_KEY: SparkPost API 密钥
 * - SPARKPOST_FROM: 默认发件人 (例如: CloudPhone <noreply@yourdomain.com>)
 * - SPARKPOST_REGION: 区域 (us 或 eu，默认 us)
 *
 * 使用示例:
 * ```typescript
 * const provider = new SparkPostProvider(configService);
 * const result = await provider.send({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Welcome to CloudPhone!</h1>',
 * });
 * ```
 */
@Injectable()
export class SparkPostProvider implements EmailProvider {
  readonly name = 'SparkPost';
  private readonly logger = new Logger(SparkPostProvider.name);
  private config: EmailProviderConfig & {
    apiKey?: string;
    fromEmail?: string;
    region?: string;
  };
  private client: AxiosInstance;
  private stats = {
    sent: 0,
    failed: 0,
    pending: 0,
  };

  constructor(private configService: ConfigService) {
    this.loadConfig();
    this.initializeClient();
    this.logger.log('SparkPost Provider initialized');
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    this.config = {
      provider: 'sparkpost',
      apiKey: this.configService.get<string>('SPARKPOST_API_KEY'),
      fromEmail: this.configService.get<string>(
        'SPARKPOST_FROM',
        'CloudPhone <noreply@cloudphone.run>'
      ),
      region: this.configService.get<string>('SPARKPOST_REGION', 'us'),
    };

    if (!this.config.apiKey) {
      this.logger.warn('SparkPost API key not configured. Email sending will fail.');
    }
  }

  /**
   * 初始化 SparkPost 客户端
   */
  private initializeClient(): void {
    if (!this.config.apiKey) {
      this.logger.warn('SparkPost client not initialized due to missing API key');
      return;
    }

    // SparkPost 支持美国和欧洲区域
    const baseURL =
      this.config.region === 'eu'
        ? 'https://api.eu.sparkpost.com/api/v1'
        : 'https://api.sparkpost.com/api/v1';

    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: this.config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * 发送邮件
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      this.stats.pending++;

      if (!this.config.apiKey) {
        this.stats.pending--;
        this.stats.failed++;
        return {
          success: false,
          error: 'SparkPost API key not configured',
        };
      }

      // 构建收件人列表
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      const recipientList = recipients.map((email) => ({
        address: { email },
      }));

      // 构建邮件数据
      const mailData: any = {
        recipients: recipientList,
        content: {
          from: this.parseEmailAddress(options.from || this.config.fromEmail!),
          subject: options.subject,
        },
      };

      // 添加 CC
      if (options.cc) {
        const ccList = Array.isArray(options.cc) ? options.cc : [options.cc];
        mailData.cc = ccList.map((email) => ({ address: { email } }));
      }

      // 添加 BCC
      if (options.bcc) {
        const bccList = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
        mailData.bcc = bccList.map((email) => ({ address: { email } }));
      }

      // 添加邮件内容
      if (options.html) {
        mailData.content.html = options.html;
      }

      if (options.text) {
        mailData.content.text = options.text;
      }

      // 添加回复地址
      if (options.replyTo) {
        mailData.content.reply_to = Array.isArray(options.replyTo)
          ? options.replyTo[0]
          : options.replyTo;
      }

      // 添加附件
      if (options.attachments && options.attachments.length > 0) {
        mailData.content.attachments = options.attachments.map((attachment) => ({
          name: attachment.filename,
          type: attachment.contentType,
          data: attachment.content?.toString('base64'),
        }));
      }

      // 添加自定义头部
      if (options.headers) {
        mailData.content.headers = options.headers;
      }

      // 发送请求
      const response = await this.client.post('/transmissions', mailData);

      this.stats.pending--;
      this.stats.sent++;

      const messageId = response.data.results?.id;
      this.logger.log(
        `Email sent successfully via SparkPost to ${recipients.join(', ')}, TransmissionId: ${messageId}`
      );

      return {
        success: true,
        messageId,
        provider: this.name,
        accepted: recipients,
      };
    } catch (error: any) {
      this.stats.pending--;
      this.stats.failed++;
      this.logger.error('SparkPost send error:', error.message);

      const errorMessage =
        error.response?.data?.errors?.[0]?.message || error.message || 'Unknown error';

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 批量发送邮件
   */
  async sendBatch(recipients: string[], options: Omit<EmailOptions, 'to'>): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    // SparkPost 单次最多支持 3000 个收件人
    const batchSize = 3000;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const result = await this.send({
        ...options,
        to: batch,
      });

      if (result.success) {
        batch.forEach(() => results.push({ ...result }));
      } else {
        batch.forEach(() => results.push({ ...result }));
      }

      // 避免速率限制
      if (i + batchSize < recipients.length) {
        await this.sleep(100);
      }
    }

    return results;
  }

  /**
   * 验证邮箱格式
   */
  validateEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    sent: number;
    failed: number;
    pending: number;
  }> {
    return { ...this.stats };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }

      // 获取账户信息
      const response = await this.client.get('/account');
      return response.status === 200;
    } catch (error) {
      this.logger.error('SparkPost health check failed:', error.message);
      return false;
    }
  }

  /**
   * 获取发送域名列表（SparkPost 特有功能）
   */
  async getSendingDomains(): Promise<any> {
    try {
      const response = await this.client.get('/sending-domains');
      return response.data.results;
    } catch (error: any) {
      this.logger.error('Failed to get sending domains:', error.message);
      return null;
    }
  }

  /**
   * 获取邮件投递指标（SparkPost 特有功能）
   */
  async getDeliverabilityMetrics(params?: {
    from?: string;
    to?: string;
    domains?: string[];
  }): Promise<any> {
    try {
      const queryParams: any = {};
      if (params?.from) queryParams.from = params.from;
      if (params?.to) queryParams.to = params.to;
      if (params?.domains) queryParams.domains = params.domains.join(',');

      const response = await this.client.get('/metrics/deliverability', { params: queryParams });
      return response.data.results;
    } catch (error: any) {
      this.logger.error('Failed to get deliverability metrics:', error.message);
      return null;
    }
  }

  /**
   * 获取传输详情（SparkPost 特有功能）
   */
  async getTransmission(transmissionId: string): Promise<any> {
    try {
      const response = await this.client.get(`/transmissions/${transmissionId}`);
      return response.data.results;
    } catch (error: any) {
      this.logger.error('Failed to get transmission details:', error.message);
      return null;
    }
  }

  /**
   * 解析邮件地址
   * 支持 "Name <email@domain.com>" 格式
   */
  private parseEmailAddress(address: string): { email: string; name?: string } {
    const match = address.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      return {
        name: match[1].trim(),
        email: match[2].trim(),
      };
    }
    return { email: address };
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
