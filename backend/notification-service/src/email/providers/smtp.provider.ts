import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmailProvider,
  EmailOptions,
  EmailResult,
  EmailProviderConfig,
} from '../email.interface';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

/**
 * SMTP 邮件提供商
 *
 * 使用标准 SMTP 协议发送邮件,支持任何 SMTP 服务器:
 * - Gmail
 * - Outlook/Office365
 * - 自建 SMTP 服务器
 * - 企业邮件服务器
 *
 * 环境变量配置:
 * - SMTP_HOST: SMTP 服务器地址
 * - SMTP_PORT: SMTP 端口 (默认: 587)
 * - SMTP_SECURE: 是否使用 SSL/TLS (默认: false)
 * - SMTP_USER: SMTP 用户名
 * - SMTP_PASS: SMTP 密码
 * - SMTP_FROM: 默认发件人 (例如: CloudPhone <noreply@cloudphone.com>)
 *
 * 使用示例:
 * ```typescript
 * const provider = new SmtpProvider(configService);
 * const result = await provider.send({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   html: '<h1>Welcome to CloudPhone!</h1>',
 * });
 * ```
 */
@Injectable()
export class SmtpProvider implements EmailProvider {
  readonly name = 'SMTP';
  private readonly logger = new Logger(SmtpProvider.name);
  private config: EmailProviderConfig & {
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
    fromEmail?: string;
  };
  private transporter: Transporter;
  private stats = {
    sent: 0,
    failed: 0,
    pending: 0,
  };
  private enabled = false;

  constructor(private configService: ConfigService) {
    this.loadConfig();
    this.initializeTransporter();
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    this.config = {
      provider: 'smtp',
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
      user: this.configService.get<string>('SMTP_USER'),
      pass: this.configService.get<string>('SMTP_PASS'),
      fromEmail: this.configService.get<string>(
        'SMTP_FROM',
        'CloudPhone <noreply@cloudphone.com>',
      ),
    };

    // 验证必需配置
    if (!this.config.host) {
      this.logger.warn('SMTP host not configured. Email sending will be disabled.');
    }
  }

  /**
   * 初始化 SMTP 传输器
   */
  private initializeTransporter(): void {
    if (!this.config.host) {
      this.logger.warn('SMTP not initialized due to missing configuration');
      this.enabled = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.user && this.config.pass
          ? {
              user: this.config.user,
              pass: this.config.pass,
            }
          : undefined,
        // 连接超时和套接字超时
        connectionTimeout: 10000,
        socketTimeout: 10000,
        // 日志调试
        logger: false,
        debug: false,
      });

      this.enabled = true;
      this.logger.log(`SMTP transporter initialized: ${this.config.host}:${this.config.port}`);
    } catch (error: any) {
      this.logger.error('SMTP transporter initialization failed:', error.message);
      this.enabled = false;
    }
  }

  /**
   * 发送邮件
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    if (!this.enabled) {
      return {
        success: false,
        error: 'SMTP provider not enabled',
      };
    }

    try {
      this.stats.pending++;

      // 构建邮件选项
      const mailOptions: any = {
        from: options.from || this.config.fromEmail,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
      };

      if (options.text) {
        mailOptions.text = options.text;
      }

      if (options.html) {
        mailOptions.html = options.html;
      }

      if (options.cc) {
        mailOptions.cc = Array.isArray(options.cc) ? options.cc.join(', ') : options.cc;
      }

      if (options.bcc) {
        mailOptions.bcc = Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc;
      }

      if (options.headers) {
        mailOptions.headers = options.headers;
      }

      if (options.attachments) {
        mailOptions.attachments = options.attachments;
      }

      // 发送邮件
      const info = await this.transporter.sendMail(mailOptions);

      this.stats.pending--;
      this.stats.sent++;

      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      this.logger.log(
        `Email sent successfully via SMTP to ${recipients.join(', ')}, MessageId: ${info.messageId}`,
      );

      return {
        success: true,
        messageId: info.messageId,
        provider: this.name,
        accepted: info.accepted as string[],
        rejected: info.rejected as string[],
      };
    } catch (error: any) {
      this.stats.pending--;
      this.stats.failed++;
      this.logger.error('SMTP send error:', error.message);

      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * 批量发送邮件
   */
  async sendBatch(
    recipients: string[],
    options: Omit<EmailOptions, 'to'>,
  ): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    for (const recipient of recipients) {
      const result = await this.send({
        ...options,
        to: recipient,
      });
      results.push(result);

      // 避免速率限制，添加小延迟
      if (recipients.length > 10) {
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
    if (!this.enabled || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error: any) {
      this.logger.error('SMTP health check failed:', error.message);
      return false;
    }
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 关闭传输器
   */
  async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.logger.log('SMTP transporter closed');
    }
  }
}
