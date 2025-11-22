import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider, EmailOptions, EmailResult, EmailProviderConfig } from '../email.interface';
import FormData from 'form-data';
import axios, { AxiosInstance } from 'axios';

/**
 * Mailgun 邮件提供商
 *
 * Mailgun 是全球领先的邮件发送服务,特点:
 * - 高送达率 (99%+)
 * - 强大的 API
 * - 详细的分析和追踪
 * - 支持多域名
 * - 完整的 SMTP/API 双模式
 * - 实时 Webhook 事件
 *
 * 官方文档: https://documentation.mailgun.com/
 *
 * 环境变量配置:
 * - MAILGUN_API_KEY: Mailgun API密钥
 * - MAILGUN_DOMAIN: 发信域名 (例如: mg.yourdomain.com)
 * - MAILGUN_FROM: 默认发件人 (例如: CloudPhone <noreply@mg.yourdomain.com>)
 * - MAILGUN_REGION: 地区 (us 或 eu, 默认: us)
 *
 * 使用示例:
 * ```typescript
 * const provider = new MailgunProvider(configService);
 * const result = await provider.send({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Welcome to CloudPhone!</h1>',
 * });
 * ```
 */
@Injectable()
export class MailgunProvider implements EmailProvider {
  readonly name = 'Mailgun';
  private readonly logger = new Logger(MailgunProvider.name);
  private config: EmailProviderConfig & {
    apiKey?: string;
    domain?: string;
    fromEmail?: string;
    region?: string;
    baseUrl?: string;
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
    this.logger.log('Mailgun Provider initialized');
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    const region = this.configService.get<string>('MAILGUN_REGION', 'us');
    const baseUrl =
      region === 'eu' ? 'https://api.eu.mailgun.net/v3' : 'https://api.mailgun.net/v3';

    this.config = {
      provider: 'mailgun',
      apiKey: this.configService.get<string>('MAILGUN_API_KEY'),
      domain: this.configService.get<string>('MAILGUN_DOMAIN'),
      fromEmail: this.configService.get<string>(
        'MAILGUN_FROM',
        'CloudPhone <noreply@cloudphone.run>'
      ),
      region,
      baseUrl,
    };

    // 验证必需配置
    if (!this.config.apiKey || !this.config.domain) {
      this.logger.warn('Mailgun credentials not configured. Email sending will fail.');
    }
  }

  /**
   * 初始化 Mailgun 客户端
   */
  private initializeClient(): void {
    if (!this.config.apiKey || !this.config.domain) {
      this.logger.warn('Mailgun client not initialized due to missing config');
      return;
    }

    this.client = axios.create({
      baseURL: `${this.config.baseUrl}/${this.config.domain}`,
      auth: {
        username: 'api',
        password: this.config.apiKey!,
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

      // 验证配置
      if (!this.config.apiKey || !this.config.domain) {
        this.stats.pending--;
        this.stats.failed++;
        return {
          success: false,
          error: 'Mailgun not properly configured',
        };
      }

      // 构建 FormData
      const form = new FormData();
      form.append('from', options.from || this.config.fromEmail!);

      // 处理收件人
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      recipients.forEach((recipient) => form.append('to', recipient));

      // 处理 CC
      if (options.cc) {
        const ccList = Array.isArray(options.cc) ? options.cc : [options.cc];
        ccList.forEach((cc) => form.append('cc', cc));
      }

      // 处理 BCC
      if (options.bcc) {
        const bccList = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
        bccList.forEach((bcc) => form.append('bcc', bcc));
      }

      form.append('subject', options.subject);

      if (options.text) {
        form.append('text', options.text);
      }

      if (options.html) {
        form.append('html', options.html);
      }

      // 添加自定义头部
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          form.append(`h:${key}`, value);
        });
      }

      // 添加附件
      if (options.attachments && options.attachments.length > 0) {
        options.attachments.forEach((attachment) => {
          if (attachment.content) {
            form.append('attachment', attachment.content, {
              filename: attachment.filename,
              contentType: attachment.contentType,
            });
          } else if (attachment.path) {
            // 注意: 这里需要读取文件内容
            this.logger.warn('File path attachments not yet implemented');
          }
        });
      }

      // 发送请求
      const response = await this.client.post('/messages', form, {
        headers: form.getHeaders(),
      });

      this.stats.pending--;
      this.stats.sent++;

      this.logger.log(
        `Email sent successfully via Mailgun to ${recipients.join(', ')}, MessageId: ${response.data.id}`
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
      this.logger.error('Mailgun send error:', error.message);

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Unknown error',
      };
    }
  }

  /**
   * 批量发送邮件
   */
  async sendBatch(recipients: string[], options: Omit<EmailOptions, 'to'>): Promise<EmailResult[]> {
    // Mailgun 支持批量发送（收件人变量），这里简化为逐个发送
    const results: EmailResult[] = [];

    // 分批发送，每批最多 1000 个收件人
    const batchSize = 1000;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      // Mailgun 可以在一个请求中发送给多个收件人
      const result = await this.send({
        ...options,
        to: batch,
      });

      // 为每个收件人创建结果
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

      // 验证域名状态
      const response = await this.client.get('/stats/total', {
        params: {
          event: 'accepted',
          duration: '1d',
        },
      });

      return response.status === 200;
    } catch (error) {
      this.logger.error('Mailgun health check failed:', error.message);
      return false;
    }
  }

  /**
   * 获取域名统计
   * Mailgun 特有功能
   */
  async getDomainStats(duration = '1d'): Promise<any> {
    try {
      const response = await this.client.get('/stats/total', {
        params: {
          duration,
        },
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to get domain stats:', error.message);
      return null;
    }
  }

  /**
   * 验证邮箱地址（Mailgun API）
   * 使用 Mailgun 的邮箱验证服务
   */
  async verifyEmailAddress(email: string): Promise<{
    valid: boolean;
    mailboxVerification?: boolean;
    didYouMean?: string;
  }> {
    try {
      const response = await axios.get('https://api.mailgun.net/v4/address/validate', {
        params: { address: email },
        auth: {
          username: 'api',
          password: this.config.apiKey!,
        },
      });

      return {
        valid: response.data.result === 'deliverable',
        mailboxVerification: response.data.mailbox_verification,
        didYouMean: response.data.did_you_mean,
      };
    } catch (error: any) {
      this.logger.error('Email verification failed:', error.message);
      return { valid: false };
    }
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
