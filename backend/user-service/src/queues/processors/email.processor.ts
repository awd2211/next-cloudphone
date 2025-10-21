import { Process, Processor } from '@nestjs/bull';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bull';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';
import { QueueName } from '../../common/config/queue.config';

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

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly winstonLogger: WinstonLogger,
  ) {}

  /**
   * 处理单个邮件发送任务
   */
  @Process('send-email')
  async handleSendEmail(job: Job<EmailJobData>): Promise<void> {
    const { id, data, attemptsMade } = job;

    this.winstonLogger.info({
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

      // TODO: 集成实际的邮件发送服务（Nodemailer, SendGrid, 等）
      // 示例：await this.emailService.send(data);
      await this.simulateEmailSending(data);
      await job.progress(80);

      // 记录发送成功
      await job.progress(100);

      this.winstonLogger.info({
        type: 'queue_job_complete',
        queue: QueueName.EMAIL,
        jobId: id,
        jobType: 'send-email',
        message: `✅ Email sent successfully to ${data.to}`,
      });
    } catch (error) {
      this.winstonLogger.error({
        type: 'queue_job_failed',
        queue: QueueName.EMAIL,
        jobId: id,
        jobType: 'send-email',
        attemptsMade,
        error: error.message,
        stack: error.stack,
      });

      throw error; // 抛出错误以触发重试机制
    }
  }

  /**
   * 处理批量邮件发送
   */
  @Process('send-batch-email')
  async handleSendBatchEmail(
    job: Job<{ emails: EmailJobData[] }>,
  ): Promise<void> {
    const { id, data } = job;
    const totalEmails = data.emails.length;

    this.logger.log(`📧 Processing batch email job ${id}: ${totalEmails} emails`);

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < data.emails.length; i++) {
      try {
        await this.simulateEmailSending(data.emails[i]);
        successCount++;

        // 更新进度
        const progress = Math.floor(((i + 1) / totalEmails) * 100);
        await job.progress(progress);
      } catch (error) {
        this.logger.error(
          `Failed to send email ${i + 1}/${totalEmails}: ${error.message}`,
        );
        failureCount++;
      }
    }

    this.winstonLogger.info({
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
    const scheduledTime = new Date(job.data['scheduledTime']);
    if (scheduledTime > new Date()) {
      this.logger.log(`Email not due yet, rescheduling...`);
      throw new Error('Not due yet'); // 触发重试
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
  private async simulateEmailSending(data: EmailJobData): Promise<void> {
    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 模拟 5% 的失败率（用于测试重试机制）
    if (Math.random() < 0.05) {
      throw new Error('Simulated email sending failure');
    }

    this.logger.log(
      `📨 Email sent to ${data.to}: ${data.subject}`,
    );
  }

  /**
   * 任务失败事件处理
   */
  @Process()
  async onFailed(job: Job, error: Error): Promise<void> {
    this.logger.error(
      `❌ Email job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );

    // TODO: 发送失败告警通知管理员
    // await this.notificationService.alertAdmins({ ... });
  }

  /**
   * 任务完成事件处理
   */
  @Process()
  async onCompleted(job: Job, result: any): Promise<void> {
    this.logger.log(`✅ Email job ${job.id} completed successfully`);
  }
}
