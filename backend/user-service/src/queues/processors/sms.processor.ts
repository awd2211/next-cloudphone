import { Process, Processor } from '@nestjs/bull';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bull';
import { PinoLogger } from 'nestjs-pino';
import { QueueName } from '../../common/config/queue.config';
import { SmsService } from '../../common/services/sms/sms.service';

/**
 * 短信任务数据接口
 */
export interface SmsJobData {
  phone: string | string[];
  message: string;
  template?: string;
  templateCode?: string;
  templateParams?: Record<string, any>;
  variables?: Record<string, any>;
  provider?: 'aliyun' | 'tencent' | 'twilio';
}

/**
 * 短信队列处理器
 *
 * 功能：
 * - 异步发送短信
 * - 多供应商支持
 * - 失败自动重试
 * - 频率限制
 */
@Processor(QueueName.SMS)
export class SmsProcessor {
  private readonly logger = new Logger(SmsProcessor.name);

  // 短信发送频率限制（防止被限流）
  private readonly rateLimits = new Map<string, number>();
  private readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1分钟
  private readonly MAX_SMS_PER_MINUTE = 10; // 每分钟最多10条

  constructor(
    private readonly pinoLogger: PinoLogger,
    private readonly smsService: SmsService
  ) {
    this.pinoLogger.setContext(SmsProcessor.name);
  }

  /**
   * 处理单条短信发送
   */
  @Process('send-sms')
  async handleSendSms(job: Job<SmsJobData>): Promise<void> {
    const { id, data, attemptsMade } = job;

    this.pinoLogger.info({
      type: 'queue_job_start',
      queue: QueueName.SMS,
      jobId: id,
      jobType: 'send-sms',
      attemptsMade,
      data: {
        phone: data.phone,
        provider: data.provider || 'default',
      },
    });

    try {
      // 验证短信数据
      this.validateSmsData(data);
      await job.progress(20);

      // 检查频率限制
      await this.checkRateLimit(data.phone);
      await job.progress(40);

      // 发送短信
      const provider = data.provider || 'aliyun';
      await this.sendSmsViaProvider(provider, data);
      await job.progress(80);

      // 记录发送成功
      await job.progress(100);

      this.pinoLogger.info({
        type: 'queue_job_complete',
        queue: QueueName.SMS,
        jobId: id,
        message: `✅ SMS sent successfully to ${data.phone}`,
      });
    } catch (error) {
      this.pinoLogger.error({
        type: 'queue_job_failed',
        queue: QueueName.SMS,
        jobId: id,
        attemptsMade,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * 处理批量短信发送
   */
  @Process('send-batch-sms')
  async handleSendBatchSms(job: Job<{ messages: SmsJobData[] }>): Promise<void> {
    const { id, data } = job;
    const totalMessages = data.messages.length;

    this.logger.log(`📱 Processing batch SMS job ${id}: ${totalMessages} messages`);

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < data.messages.length; i++) {
      try {
        const smsData = data.messages[i];
        await this.sendSmsViaProvider(smsData.provider || 'aliyun', smsData);
        successCount++;

        // 添加延迟避免被限流
        if (i < data.messages.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        // 更新进度
        const progress = Math.floor(((i + 1) / totalMessages) * 100);
        await job.progress(progress);
      } catch (error) {
        this.logger.error(`Failed to send SMS ${i + 1}/${totalMessages}: ${error.message}`);
        failureCount++;
      }
    }

    this.pinoLogger.info({
      type: 'queue_batch_job_complete',
      queue: QueueName.SMS,
      jobId: id,
      totalMessages,
      successCount,
      failureCount,
    });
  }

  /**
   * 处理验证码短信
   */
  @Process('send-verification-code')
  async handleSendVerificationCode(
    job: Job<{ phone: string; code: string; expiresIn?: number }>
  ): Promise<void> {
    const { id, data } = job;

    this.logger.log(`🔑 Sending verification code to ${data.phone}`);

    const message = `Your verification code is: ${data.code}. Valid for ${data.expiresIn || 5} minutes.`;

    await this.sendSmsViaProvider('aliyun', {
      phone: data.phone,
      message,
      template: 'verification_code',
      variables: {
        code: data.code,
        expiresIn: data.expiresIn || 5,
      },
    });

    this.logger.log(`✅ Verification code sent to ${data.phone}`);
  }

  /**
   * 验证短信数据
   */
  private validateSmsData(data: SmsJobData): void {
    if (!data.phone || (Array.isArray(data.phone) && data.phone.length === 0)) {
      throw new Error('Phone number is required');
    }

    if (!data.message && !data.template) {
      throw new Error('SMS message or template is required');
    }

    // 验证手机号格式（中国手机号）
    const phones = Array.isArray(data.phone) ? data.phone : [data.phone];
    const phoneRegex = /^1[3-9]\d{9}$/;

    for (const phone of phones) {
      if (!phoneRegex.test(phone)) {
        throw new Error(`Invalid phone number: ${phone}`);
      }
    }
  }

  /**
   * 检查频率限制
   */
  private async checkRateLimit(phone: string | string[]): Promise<void> {
    const phones = Array.isArray(phone) ? phone : [phone];

    for (const p of phones) {
      const now = Date.now();
      const lastSent = this.rateLimits.get(p) || 0;

      if (now - lastSent < this.RATE_LIMIT_WINDOW) {
        const waitTime = this.RATE_LIMIT_WINDOW - (now - lastSent);
        throw new Error(
          `Rate limit exceeded for ${p}. Please wait ${Math.ceil(waitTime / 1000)} seconds.`
        );
      }

      this.rateLimits.set(p, now);

      // 清理过期的限制记录
      if (this.rateLimits.size > 10000) {
        this.cleanupRateLimits();
      }
    }
  }

  /**
   * 清理过期的频率限制记录
   */
  private cleanupRateLimits(): void {
    const now = Date.now();
    for (const [phone, lastSent] of this.rateLimits.entries()) {
      if (now - lastSent > this.RATE_LIMIT_WINDOW) {
        this.rateLimits.delete(phone);
      }
    }
  }

  /**
   * 通过指定供应商发送短信
   */
  private async sendSmsViaProvider(provider: string, data: SmsJobData): Promise<void> {
    // 准备短信数据
    const phoneNumber = Array.isArray(data.phone) ? data.phone[0] : data.phone;

    const smsData = {
      phone: phoneNumber,
      message: data.message,
      templateCode: data.templateCode || data.template,
      templateParams: data.templateParams || data.variables,
    };

    // 发送短信
    const result = await this.smsService.sendWithProvider(provider, smsData);

    if (!result.success) {
      throw new Error(`SMS send failed: ${result.error}`);
    }

    this.logger.log(
      `📲 SMS sent via ${provider} to ${phoneNumber} (messageId: ${result.messageId})`
    );
  }
}
