import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider, EmailOptions, EmailResult, EmailProviderConfig } from '../email.interface';
import axios, { AxiosInstance } from 'axios';

/**
 * Resend 邮件提供商
 *
 * Resend 是新一代开发者友好的邮件服务:
 * - 现代化 API 设计
 * - 支持 React Email 模板
 * - 每月 3000 封免费邮件
 * - 实时邮件追踪
 * - Webhook 事件通知
 *
 * 官方文档: https://resend.com/docs
 *
 * 环境变量配置:
 * - RESEND_API_KEY: Resend API 密钥
 * - RESEND_FROM: 默认发件人 (例如: CloudPhone <noreply@yourdomain.com>)
 *
 * 使用示例:
 * ```typescript
 * const provider = new ResendProvider(configService);
 * const result = await provider.send({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Welcome to CloudPhone!</h1>',
 * });
 * ```
 */
@Injectable()
export class ResendProvider implements EmailProvider {
  readonly name = 'Resend';
  private readonly logger = new Logger(ResendProvider.name);
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
    this.logger.log('Resend Provider initialized');
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    this.config = {
      provider: 'resend',
      apiKey: this.configService.get<string>('RESEND_API_KEY'),
      fromEmail: this.configService.get<string>(
        'RESEND_FROM',
        'CloudPhone <noreply@cloudphone.run>'
      ),
    };

    if (!this.config.apiKey) {
      this.logger.warn('Resend API key not configured. Email sending will fail.');
    }
  }

  /**
   * 初始化 Resend 客户端
   */
  private initializeClient(): void {
    if (!this.config.apiKey) {
      this.logger.warn('Resend client not initialized due to missing API key');
      return;
    }

    this.client = axios.create({
      baseURL: 'https://api.resend.com',
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
          error: 'Resend API key not configured',
        };
      }

      // 构建收件人列表
      const recipients = Array.isArray(options.to) ? options.to : [options.to];

      // 构建邮件数据
      const mailData: any = {
        from: options.from || this.config.fromEmail!,
        to: recipients,
        subject: options.subject,
      };

      // 添加 CC
      if (options.cc) {
        mailData.cc = Array.isArray(options.cc) ? options.cc : [options.cc];
      }

      // 添加 BCC
      if (options.bcc) {
        mailData.bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
      }

      // 添加邮件内容
      if (options.html) {
        mailData.html = options.html;
      }

      if (options.text) {
        mailData.text = options.text;
      }

      // 添加回复地址
      if (options.replyTo) {
        mailData.reply_to = Array.isArray(options.replyTo) ? options.replyTo : [options.replyTo];
      }

      // 添加附件
      if (options.attachments && options.attachments.length > 0) {
        mailData.attachments = options.attachments.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content?.toString('base64'),
          content_type: attachment.contentType,
        }));
      }

      // 添加标签
      if (options.tags) {
        mailData.tags = options.tags;
      }

      // 发送请求
      const response = await this.client.post('/emails', mailData);

      this.stats.pending--;
      this.stats.sent++;

      this.logger.log(
        `Email sent successfully via Resend to ${recipients.join(', ')}, MessageId: ${response.data.id}`
      );

      return {
        success: true,
        messageId: response.data.id,
        provider: this.name,
        accepted: recipients,
      };
    } catch (error: any) {
      this.stats.pending--;
      this.stats.failed++;
      this.logger.error('Resend send error:', error.message);

      const errorMessage =
        error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';

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

    // Resend 支持批量发送 API
    const batchSize = 100;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      // 构建批量邮件数据
      const messages = batch.map((to) => ({
        from: options.from || this.config.fromEmail!,
        to: [to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }));

      try {
        const response = await this.client.post('/emails/batch', messages);

        response.data.data.forEach((result: any, index: number) => {
          if (result.id) {
            results.push({
              success: true,
              messageId: result.id,
              provider: this.name,
              accepted: [batch[index]],
            });
          } else {
            results.push({
              success: false,
              error: result.message || 'Unknown error',
            });
          }
        });
      } catch (error: any) {
        batch.forEach(() =>
          results.push({
            success: false,
            error: error.message,
          })
        );
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

      // 获取 API 密钥信息
      const response = await this.client.get('/api-keys');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Resend health check failed:', error.message);
      return false;
    }
  }

  /**
   * 获取邮件详情（Resend 特有功能）
   */
  async getEmail(emailId: string): Promise<any> {
    try {
      const response = await this.client.get(`/emails/${emailId}`);
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to get email details:', error.message);
      return null;
    }
  }

  /**
   * 获取域名列表（Resend 特有功能）
   */
  async getDomains(): Promise<any> {
    try {
      const response = await this.client.get('/domains');
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to get domains:', error.message);
      return null;
    }
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
