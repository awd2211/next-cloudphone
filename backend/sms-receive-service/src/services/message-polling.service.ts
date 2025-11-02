import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { VirtualNumber, SmsMessage } from '../entities';
import { SmsActivateAdapter } from '../providers/sms-activate.adapter';
import { EventBusService } from '@cloudphone/shared';

@Injectable()
export class MessagePollingService {
  private readonly logger = new Logger(MessagePollingService.name);
  private readonly pollingTasks = new Map<string, NodeJS.Timeout>();

  private readonly initialDelay: number;
  private readonly maxDelay: number;
  private readonly backoffFactor: number;
  private readonly maxAttempts: number;

  constructor(
    @InjectRepository(VirtualNumber)
    private readonly numberRepo: Repository<VirtualNumber>,
    @InjectRepository(SmsMessage)
    private readonly messageRepo: Repository<SmsMessage>,
    private readonly smsActivate: SmsActivateAdapter,
    private readonly eventBus: EventBusService,
    private readonly configService: ConfigService,
  ) {
    this.initialDelay = this.configService.get<number>('POLLING_INITIAL_DELAY_MS', 1000);
    this.maxDelay = this.configService.get<number>('POLLING_MAX_DELAY_MS', 60000);
    this.backoffFactor = this.configService.get<number>('POLLING_BACKOFF_FACTOR', 1.5);
    this.maxAttempts = this.configService.get<number>('POLLING_MAX_ATTEMPTS', 60);
  }

  /**
   * 启动轮询检查验证码
   */
  startPolling(numberId: string): void {
    if (this.pollingTasks.has(numberId)) {
      this.logger.warn(`Polling already started for ${numberId}`);
      return;
    }

    this.logger.log(`Starting polling for virtual number ${numberId}`);

    let attempts = 0;

    const poll = async () => {
      try {
        const number = await this.numberRepo.findOne({ where: { id: numberId } });

        // 如果号码不存在或已完成，停止轮询
        if (!number || ['completed', 'cancelled', 'expired'].includes(number.status)) {
          this.stopPolling(numberId);
          return;
        }

        // 检查是否超时
        if (attempts >= this.maxAttempts || new Date() > number.expiresAt) {
          await this.handleTimeout(number);
          this.stopPolling(numberId);
          return;
        }

        // 更新状态为waiting_sms（如果还是active）
        if (number.status === 'active') {
          number.status = 'waiting_sms';
          await this.numberRepo.save(number);
        }

        // 调用平台API检查状态
        let status;
        if (number.provider === 'sms-activate') {
          status = await this.smsActivate.getStatus(number.providerActivationId);
        } else {
          this.logger.error(`Unsupported provider: ${number.provider}`);
          this.stopPolling(numberId);
          return;
        }

        if (status.status === 'received') {
          // 收到验证码
          await this.handleSmsReceived(number, status.code, status.message);
          this.stopPolling(numberId);
          return;
        }

        // 继续轮询（指数退避）
        attempts++;
        const delay = this.calculateDelay(attempts);

        const timeout = setTimeout(poll, delay);
        this.pollingTasks.set(numberId, timeout);
      } catch (error) {
        this.logger.error(`Polling error for ${numberId}: ${error.message}`, error.stack);

        // 错误时也继续重试，但增加延迟
        attempts++;
        if (attempts < this.maxAttempts) {
          const timeout = setTimeout(poll, 5000);
          this.pollingTasks.set(numberId, timeout);
        } else {
          this.stopPolling(numberId);
        }
      }
    };

    // 首次立即执行
    poll();
  }

  /**
   * 停止轮询
   */
  stopPolling(numberId: string): void {
    const timeout = this.pollingTasks.get(numberId);
    if (timeout) {
      clearTimeout(timeout);
      this.pollingTasks.delete(numberId);
      this.logger.log(`Stopped polling for ${numberId}`);
    }
  }

  /**
   * 处理收到短信
   */
  private async handleSmsReceived(
    number: VirtualNumber,
    code: string,
    messageText: string,
  ): Promise<void> {
    this.logger.log(`SMS received for ${number.phoneNumber}: ${code}`);

    // 1. 更新虚拟号码状态
    number.status = 'received';
    number.smsReceivedAt = new Date();
    await this.numberRepo.save(number);

    // 2. 保存短信记录
    const message = this.messageRepo.create({
      virtualNumberId: number.id,
      verificationCode: code,
      messageText,
      receivedAt: new Date(),
    });
    await this.messageRepo.save(message);

    // 3. 通知设备（通过RabbitMQ）
    await this.eventBus.publish('cloudphone.events', 'sms.code.received', {
      numberId: number.id,
      deviceId: number.deviceId,
      phoneNumber: number.phoneNumber,
      verificationCode: code,
      messageText,
      service: number.serviceName,
    });

    // 4. 调用平台API确认完成
    try {
      if (number.provider === 'sms-activate') {
        await this.smsActivate.finish(number.providerActivationId);
      }

      number.status = 'completed';
      number.completedAt = new Date();
      await this.numberRepo.save(number);

      this.logger.log(`Activation completed for ${number.phoneNumber}`);
    } catch (error) {
      this.logger.error(`Failed to finish activation ${number.id}`, error.stack);
    }
  }

  /**
   * 处理超时
   */
  private async handleTimeout(number: VirtualNumber): Promise<void> {
    this.logger.warn(`Number ${number.phoneNumber} timed out`);

    // 1. 取消号码（退款）
    try {
      if (number.provider === 'sms-activate') {
        await this.smsActivate.cancel(number.providerActivationId);
      }
    } catch (error) {
      this.logger.error('Failed to cancel timed out number', error.stack);
    }

    // 2. 更新状态
    number.status = 'expired';
    number.completedAt = new Date();
    await this.numberRepo.save(number);

    // 3. 发布事件
    await this.eventBus.publish('cloudphone.events', 'sms.number.expired', {
      numberId: number.id,
      deviceId: number.deviceId,
      phoneNumber: number.phoneNumber,
    });
  }

  /**
   * 计算轮询延迟（指数退避）
   * 第1次: 1秒
   * 第2次: 1.5秒
   * 第3次: 2.25秒
   * ...
   * 最大: 60秒
   */
  private calculateDelay(attempts: number): number {
    const delay = Math.min(
      this.initialDelay * Math.pow(this.backoffFactor, attempts - 1),
      this.maxDelay,
    );

    return Math.floor(delay);
  }

  /**
   * 获取活跃轮询数量
   */
  getActivePollingCount(): number {
    return this.pollingTasks.size;
  }

  /**
   * 停止所有轮询（用于优雅关闭）
   */
  stopAllPolling(): void {
    this.logger.log(`Stopping all ${this.pollingTasks.size} active pollings`);
    this.pollingTasks.forEach((timeout, numberId) => {
      clearTimeout(timeout);
    });
    this.pollingTasks.clear();
  }
}
