import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider, EmailOptions, EmailResult, EmailProviderConfig } from '../email.interface';
import axios, { AxiosInstance } from 'axios';

/**
 * Postmark 邮件提供商
 *
 * Postmark 专注于事务性邮件:
 * - 极快的送达速度 (平均 < 10 秒)
 * - 专注事务性邮件，送达率高
 * - 详细的投递分析
 * - 支持入站邮件处理
 * - 模板管理系统
 *
 * 官方文档: https://postmarkapp.com/developer
 *
 * 环境变量配置:
 * - POSTMARK_SERVER_TOKEN: Postmark Server API Token
 * - POSTMARK_FROM: 默认发件人 (例如: CloudPhone <noreply@yourdomain.com>)
 * - POSTMARK_MESSAGE_STREAM: 消息流 (默认: outbound)
 *
 * 使用示例:
 * ```typescript
 * const provider = new PostmarkProvider(configService);
 * const result = await provider.send({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Welcome to CloudPhone!</h1>',
 * });
 * ```
 */
@Injectable()
export class PostmarkProvider implements EmailProvider {
  readonly name = 'Postmark';
  private readonly logger = new Logger(PostmarkProvider.name);
  private config: EmailProviderConfig & {
    serverToken?: string;
    fromEmail?: string;
    messageStream?: string;
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
    this.logger.log('Postmark Provider initialized');
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    this.config = {
      provider: 'postmark',
      serverToken: this.configService.get<string>('POSTMARK_SERVER_TOKEN'),
      fromEmail: this.configService.get<string>(
        'POSTMARK_FROM',
        'CloudPhone <noreply@cloudphone.run>'
      ),
      messageStream: this.configService.get<string>('POSTMARK_MESSAGE_STREAM', 'outbound'),
    };

    if (!this.config.serverToken) {
      this.logger.warn('Postmark server token not configured. Email sending will fail.');
    }
  }

  /**
   * 初始化 Postmark 客户端
   */
  private initializeClient(): void {
    if (!this.config.serverToken) {
      this.logger.warn('Postmark client not initialized due to missing server token');
      return;
    }

    this.client = axios.create({
      baseURL: 'https://api.postmarkapp.com',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': this.config.serverToken,
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

      if (!this.config.serverToken) {
        this.stats.pending--;
        this.stats.failed++;
        return {
          success: false,
          error: 'Postmark server token not configured',
        };
      }

      // 构建收件人列表
      const recipients = Array.isArray(options.to) ? options.to : [options.to];

      // 构建邮件数据
      const mailData: any = {
        From: options.from || this.config.fromEmail!,
        To: recipients.join(','),
        Subject: options.subject,
        MessageStream: this.config.messageStream,
      };

      // 添加 CC
      if (options.cc) {
        const ccList = Array.isArray(options.cc) ? options.cc : [options.cc];
        mailData.Cc = ccList.join(',');
      }

      // 添加 BCC
      if (options.bcc) {
        const bccList = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
        mailData.Bcc = bccList.join(',');
      }

      // 添加邮件内容
      if (options.html) {
        mailData.HtmlBody = options.html;
      }

      if (options.text) {
        mailData.TextBody = options.text;
      }

      // 添加回复地址
      if (options.replyTo) {
        mailData.ReplyTo = Array.isArray(options.replyTo) ? options.replyTo[0] : options.replyTo;
      }

      // 添加附件
      if (options.attachments && options.attachments.length > 0) {
        mailData.Attachments = options.attachments.map((attachment) => ({
          Name: attachment.filename,
          Content: attachment.content?.toString('base64'),
          ContentType: attachment.contentType,
        }));
      }

      // 添加自定义头部
      if (options.headers) {
        mailData.Headers = Object.entries(options.headers).map(([name, value]) => ({
          Name: name,
          Value: value,
        }));
      }

      // 发送请求
      const response = await this.client.post('/email', mailData);

      this.stats.pending--;
      this.stats.sent++;

      this.logger.log(
        `Email sent successfully via Postmark to ${recipients.join(', ')}, MessageId: ${response.data.MessageID}`
      );

      return {
        success: true,
        messageId: response.data.MessageID,
        provider: this.name,
        accepted: recipients,
      };
    } catch (error: any) {
      this.stats.pending--;
      this.stats.failed++;
      this.logger.error('Postmark send error:', error.message);

      const errorMessage = error.response?.data?.Message || error.message || 'Unknown error';

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

    // Postmark 支持批量发送 API，单次最多 500 封
    const batchSize = 500;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      // 构建批量邮件数据
      const messages = batch.map((to) => ({
        From: options.from || this.config.fromEmail!,
        To: to,
        Subject: options.subject,
        HtmlBody: options.html,
        TextBody: options.text,
        MessageStream: this.config.messageStream,
      }));

      try {
        const response = await this.client.post('/email/batch', messages);

        response.data.forEach((result: any, index: number) => {
          if (result.ErrorCode === 0) {
            results.push({
              success: true,
              messageId: result.MessageID,
              provider: this.name,
              accepted: [batch[index]],
            });
          } else {
            results.push({
              success: false,
              error: result.Message,
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

      // 获取服务器信息
      const response = await this.client.get('/server');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Postmark health check failed:', error.message);
      return false;
    }
  }

  /**
   * 获取投递统计（Postmark 特有功能）
   */
  async getDeliveryStats(): Promise<any> {
    try {
      const response = await this.client.get('/stats/outbound');
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to get delivery stats:', error.message);
      return null;
    }
  }

  /**
   * 获取退信统计（Postmark 特有功能）
   */
  async getBounceStats(): Promise<any> {
    try {
      const response = await this.client.get('/bounces');
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to get bounce stats:', error.message);
      return null;
    }
  }

  /**
   * 使用模板发送邮件（Postmark 特有功能）
   */
  async sendWithTemplate(
    to: string | string[],
    templateId: number,
    templateModel: Record<string, any>
  ): Promise<EmailResult> {
    try {
      this.stats.pending++;

      const recipients = Array.isArray(to) ? to : [to];

      const response = await this.client.post('/email/withTemplate', {
        From: this.config.fromEmail,
        To: recipients.join(','),
        TemplateId: templateId,
        TemplateModel: templateModel,
        MessageStream: this.config.messageStream,
      });

      this.stats.pending--;
      this.stats.sent++;

      return {
        success: true,
        messageId: response.data.MessageID,
        provider: this.name,
        accepted: recipients,
      };
    } catch (error: any) {
      this.stats.pending--;
      this.stats.failed++;
      return {
        success: false,
        error: error.response?.data?.Message || error.message,
      };
    }
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
