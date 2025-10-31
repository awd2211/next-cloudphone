import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job, JobOptions } from 'bull';
import { QueueName, JobPriority, JobDelay } from '../common/config/queue.config';
import { EmailJobData } from './processors/email.processor';
import { SmsJobData } from './processors/sms.processor';
import { DeviceOperationJobData } from './processors/device-operation.processor';

/**
 * 队列服务
 *
 * 统一管理所有队列操作
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QueueName.EMAIL) private emailQueue: Queue,
    @InjectQueue(QueueName.SMS) private smsQueue: Queue,
    @InjectQueue(QueueName.DEVICE_OPERATION) private deviceOperationQueue: Queue,
    @InjectQueue(QueueName.NOTIFICATION) private notificationQueue: Queue
  ) {}

  // ============================================================================
  // 邮件队列操作
  // ============================================================================

  /**
   * 添加邮件发送任务
   */
  async sendEmail(data: EmailJobData, options?: Partial<JobOptions>): Promise<Job<EmailJobData>> {
    this.logger.log(`📧 Adding email job: ${data.subject} to ${data.to}`);

    return this.emailQueue.add('send-email', data, {
      priority: JobPriority.NORMAL,
      ...options,
    });
  }

  /**
   * 批量发送邮件
   */
  async sendBatchEmail(emails: EmailJobData[], options?: Partial<JobOptions>): Promise<Job> {
    this.logger.log(`📧 Adding batch email job: ${emails.length} emails`);

    return this.emailQueue.add(
      'send-batch-email',
      { emails },
      {
        priority: JobPriority.LOW,
        ...options,
      }
    );
  }

  /**
   * 发送定时邮件
   */
  async sendScheduledEmail(
    data: EmailJobData & { scheduledTime: Date },
    options?: Partial<JobOptions>
  ): Promise<Job> {
    const delay = data.scheduledTime.getTime() - Date.now();

    if (delay < 0) {
      throw new Error('Scheduled time must be in the future');
    }

    this.logger.log(`📅 Scheduling email for ${data.scheduledTime.toISOString()}`);

    return this.emailQueue.add('send-scheduled-email', data, {
      delay,
      priority: JobPriority.NORMAL,
      ...options,
    });
  }

  // ============================================================================
  // 短信队列操作
  // ============================================================================

  /**
   * 发送短信
   */
  async sendSms(data: SmsJobData, options?: Partial<JobOptions>): Promise<Job<SmsJobData>> {
    this.logger.log(`📱 Adding SMS job to ${data.phone}`);

    return this.smsQueue.add('send-sms', data, {
      priority: JobPriority.HIGH, // 短信优先级较高
      ...options,
    });
  }

  /**
   * 批量发送短信
   */
  async sendBatchSms(messages: SmsJobData[], options?: Partial<JobOptions>): Promise<Job> {
    this.logger.log(`📱 Adding batch SMS job: ${messages.length} messages`);

    return this.smsQueue.add(
      'send-batch-sms',
      { messages },
      {
        priority: JobPriority.NORMAL,
        ...options,
      }
    );
  }

  /**
   * 发送验证码短信
   */
  async sendVerificationCode(
    phone: string,
    code: string,
    expiresIn: number = 5,
    options?: Partial<JobOptions>
  ): Promise<Job> {
    this.logger.log(`🔑 Sending verification code to ${phone}`);

    return this.smsQueue.add(
      'send-verification-code',
      { phone, code, expiresIn },
      {
        priority: JobPriority.CRITICAL, // 验证码最高优先级
        ...options,
      }
    );
  }

  // ============================================================================
  // 设备操作队列
  // ============================================================================

  /**
   * 启动设备
   */
  async startDevice(
    deviceId: string,
    userId?: string,
    params?: Record<string, any>,
    options?: Partial<JobOptions>
  ): Promise<Job<DeviceOperationJobData>> {
    this.logger.log(`🚀 Starting device ${deviceId}`);

    return this.deviceOperationQueue.add(
      'start-device',
      { deviceId, operation: 'start', userId, params },
      {
        priority: JobPriority.HIGH,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        ...options,
      }
    );
  }

  /**
   * 停止设备
   */
  async stopDevice(
    deviceId: string,
    userId?: string,
    options?: Partial<JobOptions>
  ): Promise<Job<DeviceOperationJobData>> {
    this.logger.log(`🛑 Stopping device ${deviceId}`);

    return this.deviceOperationQueue.add(
      'stop-device',
      { deviceId, operation: 'stop', userId },
      {
        priority: JobPriority.HIGH,
        ...options,
      }
    );
  }

  /**
   * 重启设备
   */
  async restartDevice(
    deviceId: string,
    userId?: string,
    options?: Partial<JobOptions>
  ): Promise<Job<DeviceOperationJobData>> {
    this.logger.log(`🔄 Restarting device ${deviceId}`);

    return this.deviceOperationQueue.add(
      'restart-device',
      { deviceId, operation: 'restart', userId },
      {
        priority: JobPriority.HIGH,
        ...options,
      }
    );
  }

  /**
   * 安装应用
   */
  async installApp(
    deviceId: string,
    appPackage: string,
    apkUrl: string,
    options?: Partial<JobOptions>
  ): Promise<Job> {
    this.logger.log(`📦 Installing app ${appPackage} on device ${deviceId}`);

    return this.deviceOperationQueue.add(
      'install-app',
      { deviceId, appPackage, apkUrl },
      {
        priority: JobPriority.NORMAL,
        timeout: 5 * 60 * 1000, // 5分钟超时
        ...options,
      }
    );
  }

  /**
   * 卸载应用
   */
  async uninstallApp(
    deviceId: string,
    appPackage: string,
    options?: Partial<JobOptions>
  ): Promise<Job> {
    this.logger.log(`🗑️ Uninstalling app ${appPackage} from device ${deviceId}`);

    return this.deviceOperationQueue.add(
      'uninstall-app',
      { deviceId, appPackage },
      {
        priority: JobPriority.NORMAL,
        ...options,
      }
    );
  }

  // ============================================================================
  // 队列管理和监控
  // ============================================================================

  /**
   * 获取所有队列的状态
   */
  async getAllQueuesStatus(): Promise<
    Array<{
      name: string;
      counts: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
      };
    }>
  > {
    const queues = [
      { name: QueueName.EMAIL, queue: this.emailQueue },
      { name: QueueName.SMS, queue: this.smsQueue },
      { name: QueueName.DEVICE_OPERATION, queue: this.deviceOperationQueue },
    ];

    const statuses = await Promise.all(
      queues.map(async ({ name, queue }) => {
        const counts = await queue.getJobCounts();
        return { name, counts };
      })
    );

    return statuses;
  }

  /**
   * 获取指定队列的任务列表
   */
  async getQueueJobs(
    queueName: QueueName,
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed',
    start: number = 0,
    end: number = 10
  ): Promise<Job[]> {
    const queue = this.getQueueByName(queueName);

    switch (status) {
      case 'waiting':
        return queue.getWaiting(start, end);
      case 'active':
        return queue.getActive(start, end);
      case 'completed':
        return queue.getCompleted(start, end);
      case 'failed':
        return queue.getFailed(start, end);
      case 'delayed':
        return queue.getDelayed(start, end);
      default:
        return [];
    }
  }

  /**
   * 获取任务详情
   */
  async getJob(queueName: QueueName, jobId: string): Promise<Job | null> {
    const queue = this.getQueueByName(queueName);
    return queue.getJob(jobId);
  }

  /**
   * 重试失败的任务
   */
  async retryJob(queueName: QueueName, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    await job.retry();
    this.logger.log(`🔄 Retrying job ${jobId} in queue ${queueName}`);
  }

  /**
   * 删除任务
   */
  async removeJob(queueName: QueueName, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    await job.remove();
    this.logger.log(`🗑️ Removed job ${jobId} from queue ${queueName}`);
  }

  /**
   * 暂停队列
   */
  async pauseQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.pause();
    this.logger.warn(`⏸️ Paused queue ${queueName}`);
  }

  /**
   * 恢复队列
   */
  async resumeQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.resume();
    this.logger.log(`▶️ Resumed queue ${queueName}`);
  }

  /**
   * 清空队列
   */
  async emptyQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.empty();
    this.logger.warn(`🗑️ Emptied queue ${queueName}`);
  }

  /**
   * 清理已完成的任务
   */
  async cleanQueue(
    queueName: QueueName,
    grace: number = 24 * 3600 * 1000, // 默认保留 24 小时
    type: 'completed' | 'failed' = 'completed'
  ): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.clean(grace, type);
    this.logger.log(`🧹 Cleaned ${type} jobs older than ${grace}ms in queue ${queueName}`);
  }

  /**
   * 根据队列名称获取队列实例
   */
  private getQueueByName(queueName: QueueName): Queue {
    switch (queueName) {
      case QueueName.EMAIL:
        return this.emailQueue;
      case QueueName.SMS:
        return this.smsQueue;
      case QueueName.DEVICE_OPERATION:
        return this.deviceOperationQueue;
      case QueueName.NOTIFICATION:
        return this.notificationQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }

  /**
   * 通用方法：添加任务到指定队列
   */
  async addJob(queueName: QueueName, data: any, options?: Partial<JobOptions>): Promise<Job> {
    const queue = this.getQueueByName(queueName);
    const jobType = data.type || 'default';

    this.logger.log(`Adding job to ${queueName} queue: ${jobType}`);

    return queue.add(jobType, data, {
      priority: JobPriority.NORMAL,
      ...options,
    });
  }
}
