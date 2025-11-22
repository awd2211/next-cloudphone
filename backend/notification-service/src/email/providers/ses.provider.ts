import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider, EmailOptions, EmailResult, EmailProviderConfig } from '../email.interface';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

/**
 * Amazon SES 邮件提供商
 *
 * Amazon Simple Email Service (SES) 是 AWS 提供的邮件服务:
 * - 性价比极高 ($0.10/1000 封)
 * - 与 AWS 生态深度集成
 * - 高可用性和可扩展性
 * - 支持发送和接收邮件
 * - 完整的邮件分析功能
 *
 * 官方文档: https://docs.aws.amazon.com/ses/
 *
 * 环境变量配置:
 * - AWS_SES_REGION: AWS 区域 (例如: us-east-1)
 * - AWS_ACCESS_KEY_ID: AWS Access Key ID
 * - AWS_SECRET_ACCESS_KEY: AWS Secret Access Key
 * - AWS_SES_FROM: 默认发件人 (例如: CloudPhone <noreply@yourdomain.com>)
 *
 * 注意: 新账户默认在沙盒模式，需要申请生产环境访问权限
 */
@Injectable()
export class SESProvider implements EmailProvider {
  readonly name = 'Amazon SES';
  private readonly logger = new Logger(SESProvider.name);
  private config: EmailProviderConfig & {
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    fromEmail?: string;
  };
  private stats = {
    sent: 0,
    failed: 0,
    pending: 0,
  };

  constructor(private configService: ConfigService) {
    this.loadConfig();
    this.logger.log('Amazon SES Provider initialized');
  }

  /**
   * 加载配置
   */
  private loadConfig(): void {
    this.config = {
      provider: 'ses',
      region: this.configService.get<string>('AWS_SES_REGION', 'us-east-1'),
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      fromEmail: this.configService.get<string>(
        'AWS_SES_FROM',
        'CloudPhone <noreply@cloudphone.run>'
      ),
    };

    if (!this.config.accessKeyId || !this.config.secretAccessKey) {
      this.logger.warn('AWS credentials not configured. Email sending will fail.');
    }
  }

  /**
   * 发送邮件
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      this.stats.pending++;

      if (!this.config.accessKeyId || !this.config.secretAccessKey) {
        this.stats.pending--;
        this.stats.failed++;
        return {
          success: false,
          error: 'AWS credentials not configured',
        };
      }

      // 构建收件人列表
      const recipients = Array.isArray(options.to) ? options.to : [options.to];

      // 构建 SES API 请求参数
      const params: Record<string, string> = {
        Action: 'SendEmail',
        Source: options.from || this.config.fromEmail!,
        'Message.Subject.Data': options.subject,
        'Message.Subject.Charset': 'UTF-8',
      };

      // 添加收件人
      recipients.forEach((email, index) => {
        params[`Destination.ToAddresses.member.${index + 1}`] = email;
      });

      // 添加 CC
      if (options.cc) {
        const ccList = Array.isArray(options.cc) ? options.cc : [options.cc];
        ccList.forEach((email, index) => {
          params[`Destination.CcAddresses.member.${index + 1}`] = email;
        });
      }

      // 添加 BCC
      if (options.bcc) {
        const bccList = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
        bccList.forEach((email, index) => {
          params[`Destination.BccAddresses.member.${index + 1}`] = email;
        });
      }

      // 添加邮件内容
      if (options.html) {
        params['Message.Body.Html.Data'] = options.html;
        params['Message.Body.Html.Charset'] = 'UTF-8';
      }

      if (options.text) {
        params['Message.Body.Text.Data'] = options.text;
        params['Message.Body.Text.Charset'] = 'UTF-8';
      }

      // 添加回复地址
      if (options.replyTo) {
        const replyToList = Array.isArray(options.replyTo) ? options.replyTo : [options.replyTo];
        replyToList.forEach((email, index) => {
          params[`ReplyToAddresses.member.${index + 1}`] = email;
        });
      }

      // 发送请求
      const response = await this.makeRequest(params);

      this.stats.pending--;
      this.stats.sent++;

      // 解析响应获取 MessageId
      const messageIdMatch = response.match(/<MessageId>(.+?)<\/MessageId>/);
      const messageId = messageIdMatch ? messageIdMatch[1] : undefined;

      this.logger.log(
        `Email sent successfully via Amazon SES to ${recipients.join(', ')}, MessageId: ${messageId}`
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
      this.logger.error('Amazon SES send error:', error.message);

      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * 批量发送邮件
   */
  async sendBatch(recipients: string[], options: Omit<EmailOptions, 'to'>): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    // SES 单次最多 50 个收件人
    const batchSize = 50;
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

      // 避免速率限制 (SES 默认 14/秒)
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
      if (!this.config.accessKeyId || !this.config.secretAccessKey) {
        return false;
      }

      // 获取发送配额
      const params = {
        Action: 'GetSendQuota',
      };

      await this.makeRequest(params);
      return true;
    } catch (error) {
      this.logger.error('Amazon SES health check failed:', error.message);
      return false;
    }
  }

  /**
   * 获取发送配额（SES 特有功能）
   */
  async getSendQuota(): Promise<{
    max24HourSend: number;
    maxSendRate: number;
    sentLast24Hours: number;
  } | null> {
    try {
      const params = {
        Action: 'GetSendQuota',
      };

      const response = await this.makeRequest(params);

      const max24HourSendMatch = response.match(/<Max24HourSend>(.+?)<\/Max24HourSend>/);
      const maxSendRateMatch = response.match(/<MaxSendRate>(.+?)<\/MaxSendRate>/);
      const sentLast24HoursMatch = response.match(/<SentLast24Hours>(.+?)<\/SentLast24Hours>/);

      return {
        max24HourSend: parseFloat(max24HourSendMatch?.[1] || '0'),
        maxSendRate: parseFloat(maxSendRateMatch?.[1] || '0'),
        sentLast24Hours: parseFloat(sentLast24HoursMatch?.[1] || '0'),
      };
    } catch (error: any) {
      this.logger.error('Failed to get send quota:', error.message);
      return null;
    }
  }

  /**
   * 验证邮箱地址（SES 特有功能）
   * 用于沙盒模式下验证发件人/收件人邮箱
   */
  async verifyEmailAddress(email: string): Promise<boolean> {
    try {
      const params = {
        Action: 'VerifyEmailAddress',
        EmailAddress: email,
      };

      await this.makeRequest(params);
      this.logger.log(`Verification email sent to ${email}`);
      return true;
    } catch (error: any) {
      this.logger.error('Failed to verify email address:', error.message);
      return false;
    }
  }

  /**
   * 发送 AWS SES API 请求
   */
  private async makeRequest(params: Record<string, string>): Promise<string> {
    const host = `email.${this.config.region}.amazonaws.com`;
    const endpoint = `https://${host}/`;
    const method = 'POST';
    const service = 'ses';

    // 构建请求体
    const body = new URLSearchParams(params).toString();

    // 获取当前时间
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    // 构建签名
    const headers = {
      host,
      'x-amz-date': amzDate,
      'content-type': 'application/x-www-form-urlencoded',
    };

    const canonicalHeaders = Object.entries(headers)
      .map(([k, v]) => `${k.toLowerCase()}:${v}`)
      .sort()
      .join('\n');

    const signedHeaders = Object.keys(headers)
      .map((k) => k.toLowerCase())
      .sort()
      .join(';');

    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');

    const canonicalRequest = [
      method,
      '/',
      '',
      canonicalHeaders,
      '',
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.config.region}/${service}/aws4_request`;

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    // 计算签名
    const kDate = this.hmac('AWS4' + this.config.secretAccessKey!, dateStamp);
    const kRegion = this.hmac(kDate, this.config.region!);
    const kService = this.hmac(kRegion, service);
    const kSigning = this.hmac(kService, 'aws4_request');
    const signature = this.hmac(kSigning, stringToSign, 'hex');

    const authorization = `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // 发送请求
    const response = await axios.post(endpoint, body, {
      headers: {
        ...headers,
        Authorization: authorization,
      },
      timeout: 10000,
    });

    return response.data;
  }

  /**
   * HMAC 签名
   */
  private hmac(key: string | Buffer, data: string, encoding?: 'hex'): string | Buffer {
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(data);
    if (encoding) {
      return hmac.digest(encoding);
    }
    return hmac.digest();
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
