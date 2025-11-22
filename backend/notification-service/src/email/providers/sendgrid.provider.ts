import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider, EmailOptions, EmailResult, EmailProviderConfig } from '../email.interface';
import axios, { AxiosInstance } from 'axios';

/**
 * SendGrid 邮件提供商
 *
 * SendGrid (Twilio) 是全球最大的云邮件服务商之一:
 * - 每月 100 封免费邮件
 * - 强大的 API 和 SMTP 支持
 * - 完整的邮件追踪和分析
 * - 丰富的模板系统
 * - 实时 Webhook 事件
 *
 * 官方文档: https://docs.sendgrid.com/
 *
 * 环境变量配置:
 * - SENDGRID_API_KEY: SendGrid API 密钥
 * - SENDGRID_FROM: 默认发件人 (例如: CloudPhone <noreply@yourdomain.com>)
 *
 * 使用示例:
 * ```typescript
 * const provider = new SendGridProvider(configService);
 * const result = await provider.send({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Welcome to CloudPhone!</h1>',
 * });
 * ```
 */
@Injectable()
export class SendGridProvider implements EmailProvider {
  readonly name = 'SendGrid';
  private readonly logger = new Logger(SendGridProvider.name);
  private config: EmailProviderConfig & {
    apiKey?: string;
    fromEmail?: string;
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
    this.logger.log('SendGrid Provider initialized');
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    this.config = {
      provider: 'sendgrid',
      apiKey: this.configService.get<string>('SENDGRID_API_KEY'),
      fromEmail: this.configService.get<string>(
        'SENDGRID_FROM',
        'CloudPhone <noreply@cloudphone.run>'
      ),
    };

    if (!this.config.apiKey) {
      this.logger.warn('SendGrid API key not configured. Email sending will fail.');
    }
  }

  /**
   * 初始化 SendGrid 客户端
   */
  private initializeClient(): void {
    if (!this.config.apiKey) {
      this.logger.warn('SendGrid client not initialized due to missing API key');
      return;
    }

    this.client = axios.create({
      baseURL: 'https://api.sendgrid.com/v3',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
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
          error: 'SendGrid API key not configured',
        };
      }

      // 构建收件人列表
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      const toList = recipients.map((email) => ({ email }));

      // 构建邮件内容
      const mailData: any = {
        personalizations: [
          {
            to: toList,
          },
        ],
        from: this.parseEmailAddress(options.from || this.config.fromEmail!),
        subject: options.subject,
        content: [],
      };

      // 添加 CC
      if (options.cc) {
        const ccList = Array.isArray(options.cc) ? options.cc : [options.cc];
        mailData.personalizations[0].cc = ccList.map((email) => ({ email }));
      }

      // 添加 BCC
      if (options.bcc) {
        const bccList = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
        mailData.personalizations[0].bcc = bccList.map((email) => ({ email }));
      }

      // 添加邮件内容
      if (options.text) {
        mailData.content.push({
          type: 'text/plain',
          value: options.text,
        });
      }

      if (options.html) {
        mailData.content.push({
          type: 'text/html',
          value: options.html,
        });
      }

      // 添加回复地址
      if (options.replyTo) {
        const replyToAddr = Array.isArray(options.replyTo) ? options.replyTo[0] : options.replyTo;
        mailData.reply_to = this.parseEmailAddress(replyToAddr);
      }

      // 添加附件
      if (options.attachments && options.attachments.length > 0) {
        mailData.attachments = options.attachments.map((attachment) => ({
          content: attachment.content?.toString('base64'),
          filename: attachment.filename,
          type: attachment.contentType,
          disposition: 'attachment',
        }));
      }

      // 添加自定义头部
      if (options.headers) {
        mailData.headers = options.headers;
      }

      // 发送请求
      const response = await this.client.post('/mail/send', mailData);

      this.stats.pending--;
      this.stats.sent++;

      // SendGrid 返回 202 表示接受
      const messageId = response.headers['x-message-id'];
      this.logger.log(
        `Email sent successfully via SendGrid to ${recipients.join(', ')}, MessageId: ${messageId}`
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
      this.logger.error('SendGrid send error:', error.message);

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

    // SendGrid 支持单次发送多个收件人，但为了追踪每个收件人的状态，逐个发送
    // 或者使用 personalizations 实现批量发送
    const batchSize = 1000;
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

      // 检查 API 密钥是否有效
      const response = await this.client.get('/scopes');
      return response.status === 200;
    } catch (error) {
      this.logger.error('SendGrid health check failed:', error.message);
      return false;
    }
  }

  /**
   * 获取邮件统计（SendGrid 特有功能）
   */
  async getEmailStats(startDate: string, endDate?: string): Promise<any> {
    try {
      const params: any = {
        start_date: startDate,
      };

      if (endDate) {
        params.end_date = endDate;
      }

      const response = await this.client.get('/stats', { params });
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to get email stats:', error.message);
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
