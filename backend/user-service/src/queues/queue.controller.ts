import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QueueService } from './queue.service';
import { QueueName } from '../common/config/queue.config';
import { PublicThrottle } from '../common/decorators/throttler.decorator';

/**
 * 队列管理控制器
 *
 * 提供队列管理和监控接口
 */
@Controller('queues')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  /**
   * 获取所有队列状态
   */
  @Get('status')
  @PublicThrottle() // 使用宽松限流
  async getAllQueuesStatus() {
    const statuses = await this.queueService.getAllQueuesStatus();

    return {
      timestamp: new Date().toISOString(),
      queues: statuses,
      summary: {
        totalQueues: statuses.length,
        totalWaiting: statuses.reduce((sum, s) => sum + s.counts.waiting, 0),
        totalActive: statuses.reduce((sum, s) => sum + s.counts.active, 0),
        totalCompleted: statuses.reduce((sum, s) => sum + s.counts.completed, 0),
        totalFailed: statuses.reduce((sum, s) => sum + s.counts.failed, 0),
      },
    };
  }

  /**
   * 获取指定队列的任务列表
   */
  @Get(':queueName/jobs')
  async getQueueJobs(
    @Param('queueName') queueName: QueueName,
    @Query('status') status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' = 'waiting',
    @Query('start') start: number = 0,
    @Query('end') end: number = 10,
  ) {
    const jobs = await this.queueService.getQueueJobs(queueName, status, start, end);

    return {
      queueName,
      status,
      jobs: jobs.map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress(),
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
      })),
      pagination: {
        start,
        end,
        count: jobs.length,
      },
    };
  }

  /**
   * 获取任务详情
   */
  @Get(':queueName/jobs/:jobId')
  async getJob(
    @Param('queueName') queueName: QueueName,
    @Param('jobId') jobId: string,
  ) {
    const job = await this.queueService.getJob(queueName, jobId);

    if (!job) {
      return {
        error: `Job ${jobId} not found in queue ${queueName}`,
      };
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      opts: job.opts,
      progress: job.progress(),
      delay: job.opts?.delay || 0,
      timestamp: job.timestamp,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      returnvalue: job.returnvalue,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
    };
  }

  /**
   * 重试失败的任务
   */
  @Post(':queueName/jobs/:jobId/retry')
  @HttpCode(HttpStatus.OK)
  async retryJob(
    @Param('queueName') queueName: QueueName,
    @Param('jobId') jobId: string,
  ) {
    await this.queueService.retryJob(queueName, jobId);

    return {
      message: `Job ${jobId} in queue ${queueName} has been retried`,
    };
  }

  /**
   * 删除任务
   */
  @Delete(':queueName/jobs/:jobId')
  async removeJob(
    @Param('queueName') queueName: QueueName,
    @Param('jobId') jobId: string,
  ) {
    await this.queueService.removeJob(queueName, jobId);

    return {
      message: `Job ${jobId} removed from queue ${queueName}`,
    };
  }

  /**
   * 暂停队列
   */
  @Post(':queueName/pause')
  @HttpCode(HttpStatus.OK)
  async pauseQueue(@Param('queueName') queueName: QueueName) {
    await this.queueService.pauseQueue(queueName);

    return {
      message: `Queue ${queueName} paused`,
    };
  }

  /**
   * 恢复队列
   */
  @Post(':queueName/resume')
  @HttpCode(HttpStatus.OK)
  async resumeQueue(@Param('queueName') queueName: QueueName) {
    await this.queueService.resumeQueue(queueName);

    return {
      message: `Queue ${queueName} resumed`,
    };
  }

  /**
   * 清空队列
   */
  @Delete(':queueName/empty')
  async emptyQueue(@Param('queueName') queueName: QueueName) {
    await this.queueService.emptyQueue(queueName);

    return {
      message: `Queue ${queueName} emptied`,
    };
  }

  /**
   * 清理已完成的任务
   */
  @Post(':queueName/clean')
  @HttpCode(HttpStatus.OK)
  async cleanQueue(
    @Param('queueName') queueName: QueueName,
    @Body('grace') grace: number = 24 * 3600 * 1000, // 默认 24 小时
    @Body('type') type: 'completed' | 'failed' = 'completed',
  ) {
    await this.queueService.cleanQueue(queueName, grace, type);

    return {
      message: `Cleaned ${type} jobs older than ${grace}ms in queue ${queueName}`,
    };
  }

  // ============================================================================
  // 示例：创建任务的接口
  // ============================================================================

  /**
   * 示例：发送邮件
   */
  @Post('test/send-email')
  @HttpCode(HttpStatus.ACCEPTED)
  async testSendEmail(
    @Body() body: { to: string; subject: string; html: string },
  ) {
    const job = await this.queueService.sendEmail({
      to: body.to,
      subject: body.subject,
      html: body.html,
    });

    return {
      message: 'Email job created',
      jobId: job.id,
    };
  }

  /**
   * 示例：发送短信
   */
  @Post('test/send-sms')
  @HttpCode(HttpStatus.ACCEPTED)
  async testSendSms(
    @Body() body: { phone: string; message: string },
  ) {
    const job = await this.queueService.sendSms({
      phone: body.phone,
      message: body.message,
    });

    return {
      message: 'SMS job created',
      jobId: job.id,
    };
  }

  /**
   * 示例：启动设备
   */
  @Post('test/start-device')
  @HttpCode(HttpStatus.ACCEPTED)
  async testStartDevice(
    @Body() body: { deviceId: string; userId?: string },
  ) {
    const job = await this.queueService.startDevice(
      body.deviceId,
      body.userId,
    );

    return {
      message: 'Device start job created',
      jobId: job.id,
    };
  }
}
