import { Process, Processor } from '@nestjs/bull';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bull';
import { PinoLogger } from 'nestjs-pino';
import { QueueName } from '../../common/config/queue.config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

/**
 * 邮件任务数据接口
 */
export interface EmailJobData {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
  }>;
  scheduledTime?: string | Date;
}

/**
 * 邮件队列处理器
 *
 * 功能：
 * - 异步发送邮件
 * - 失败自动重试
 * - 批量发送支持
 * - 发送进度跟踪
 */
@Processor(QueueName.EMAIL)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);
  private transporter: Transporter | null;

  constructor(private readonly pinoLogger: PinoLogger) {
    // 初始化邮件传输器
    this.initializeTransporter();
    this.pinoLogger.setContext(EmailProcessor.name);
  }

  /**
   * 处理单个邮件发送任务
   */
  @Process('send-email')
  async handleSendEmail(job: Job<EmailJobData>): Promise<void> {
    const { id, data, attemptsMade } = job;

    this.pinoLogger.info({
      type: 'queue_job_start',
      queue: QueueName.EMAIL,
      jobId: id,
      jobType: 'send-email',
      attemptsMade,
      data: {
        to: data.to,
        subject: data.subject,
      },
    });

    try {
      // 更新任务进度
      await job.progress(10);

      // 验证邮件数据
      this.validateEmailData(data);
      await job.progress(30);

      // 发送邮件
      await this.sendEmail(data);
      await job.progress(80);

      // 记录发送成功
      await job.progress(100);

      this.pinoLogger.info({
        type: 'queue_job_complete',
        queue: QueueName.EMAIL,
        jobId: id,
        jobType: 'send-email',
        message: `✅ Email sent successfully to ${data.to}`,
      });
    } catch (error) {
      this.pinoLogger.error({
        type: 'queue_job_failed',
        queue: QueueName.EMAIL,
        jobId: id,
        jobType: 'send-email',
        attemptsMade,
        error: error.message,
        stack: error.stack,
      });

      // 如果重试次数较多，发送告警
      if (attemptsMade >= 2) {
        await this.alertEmailFailure(data, error, attemptsMade);
      }

      throw error; // 抛出错误以触发重试机制
    }
  }

  /**
   * 处理批量邮件发送
   */
  @Process('send-batch-email')
  async handleSendBatchEmail(job: Job<{ emails: EmailJobData[] }>): Promise<void> {
    const { id, data } = job;
    const totalEmails = data.emails.length;

    this.logger.log(`📧 Processing batch email job ${id}: ${totalEmails} emails`);

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < data.emails.length; i++) {
      try {
        await this.sendEmail(data.emails[i]);
        successCount++;

        // 更新进度
        const progress = Math.floor(((i + 1) / totalEmails) * 100);
        await job.progress(progress);
      } catch (error) {
        this.logger.error(`Failed to send email ${i + 1}/${totalEmails}: ${error.message}`);
        failureCount++;
      }
    }

    this.pinoLogger.info({
      type: 'queue_batch_job_complete',
      queue: QueueName.EMAIL,
      jobId: id,
      totalEmails,
      successCount,
      failureCount,
    });
  }

  /**
   * 处理定时邮件发送
   */
  @Process('send-scheduled-email')
  async handleSendScheduledEmail(job: Job<EmailJobData>): Promise<void> {
    this.logger.log(`📅 Processing scheduled email job ${job.id}`);

    // 检查是否到达预定时间
    if (job.data.scheduledTime) {
      const scheduledTime = new Date(job.data.scheduledTime);
      if (scheduledTime > new Date()) {
        this.logger.log(`Email not due yet, rescheduling...`);
        throw new Error('Not due yet'); // 触发重试
      }
    }

    // 发送邮件
    await this.handleSendEmail(job);
  }

  /**
   * 验证邮件数据
   */
  private validateEmailData(data: EmailJobData): void {
    if (!data.to || (Array.isArray(data.to) && data.to.length === 0)) {
      throw new Error('Email recipient is required');
    }

    if (!data.subject || data.subject.trim() === '') {
      throw new Error('Email subject is required');
    }

    if (!data.html && !data.text) {
      throw new Error('Email content (html or text) is required');
    }

    // 验证邮箱格式
    const recipients = Array.isArray(data.to) ? data.to : [data.to];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const email of recipients) {
      if (!emailRegex.test(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }
    }
  }

  /**
   * 模拟邮件发送（实际项目中替换为真实邮件服务）
   */
  /**
   * 发送邮件
   *
   * 生产环境集成示例（使用 Nodemailer）：
   * ```typescript
   * const transporter = nodemailer.createTransport({
   *   host: process.env.SMTP_HOST,
   *   port: process.env.SMTP_PORT,
   *   auth: {
   *     user: process.env.SMTP_USER,
   *     pass: process.env.SMTP_PASS
   *   }
   * });
   *
   * await transporter.sendMail({
   *   from: data.from || process.env.SMTP_FROM,
   *   to: data.to,
   *   subject: data.subject,
   *   html: data.html,
   *   text: data.text
   * });
   * ```
   */
  /**
   * 初始化邮件传输器
   */
  private initializeTransporter(): void {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // 如果配置了SMTP，使用真实邮件服务
    if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.logger.log(`✅ Email transporter initialized: ${smtpHost}:${smtpPort}`);
    } else {
      this.logger.warn('⚠️ SMTP not configured, using mock email service');
      this.transporter = null;
    }
  }

  private async sendEmail(data: EmailJobData): Promise<void> {
    if (this.transporter) {
      // 真实SMTP发送
      await this.transporter.sendMail({
        from: data.from || process.env.SMTP_FROM || process.env.SMTP_USER,
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
        cc: data.cc,
        bcc: data.bcc,
        attachments: data.attachments,
      });
      this.logger.log(`📨 Email sent to ${data.to}: ${data.subject}`);
    } else {
      // 开发环境模拟发送
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 模拟 3% 的失败率（用于测试重试机制）
      if (Math.random() < 0.03) {
        throw new Error('Email service temporarily unavailable');
      }

      this.logger.log(`📨 [MOCK] Email sent to ${data.to}: ${data.subject}`);
    }
  }

  /**
   * 发送失败告警给管理员
   */
  private async alertEmailFailure(
    jobData: EmailJobData,
    error: Error,
    attemptsMade: number
  ): Promise<void> {
    try {
      this.logger.error(`⚠️ Email job failed after ${attemptsMade} attempts: ${error.message}`);

      // 生产环境应集成 AlertService 通知管理员
      // 参考实现在 src/common/services/alert/alert.service.ts
      // 支持 DingTalk、WeChat、Slack、Email 多渠道通知
      // 示例:
      // await this.alertService.sendAlert({
      //   title: 'Email Service Alert',
      //   message: `Failed to send email to ${jobData.to}`,
      //   level: 'error',
      //   metadata: { error: error.message, attempts: attemptsMade }
      // });

      this.pinoLogger.error({
        type: 'email_send_failure_alert',
        recipient: jobData.to,
        subject: jobData.subject,
        error: error.message,
        attemptsMade,
        timestamp: new Date().toISOString(),
      });
    } catch (alertError) {
      this.logger.error(`Failed to send alert: ${alertError.message}`);
    }
  }

  /**
   * 任务失败事件处理
   * Note: These are event handlers, not processors
   * Remove @Process() decorators to avoid duplicate handler errors
   */
  // @Process()
  // async onFailed(job: Job, error: Error): Promise<void> {
  //   this.logger.error(
  //     `❌ Email job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
  //   );
  //
  //   // 已在 handleSendEmail 方法中实现告警（line 97-99）
  //   // 参考 alertEmailFailure 方法集成 AlertService
  // }

  /**
   * 任务完成事件处理
   * Note: Use Bull queue events instead of @Process() decorator
   */
  // @Process()
  // async onCompleted(job: Job, result: any): Promise<void> {
  //   this.logger.log(`✅ Email job ${job.id} completed successfully`);
  // }
}
