import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { VirtualNumber, SmsMessage } from '../entities';
import { PlatformSelectorService } from './platform-selector.service';
import { EventBusService } from '@cloudphone/shared';

/**
 * 短信消息轮询服务（批量定时轮询版）
 */
@Injectable()
export class MessagePollingService {
  private readonly logger = new Logger(MessagePollingService.name);

  private readonly BATCH_SIZE = 50;
  private isPolling = false;

  constructor(
    @InjectRepository(VirtualNumber)
    private readonly numberRepo: Repository<VirtualNumber>,
    @InjectRepository(SmsMessage)
    private readonly messageRepo: Repository<SmsMessage>,
    private readonly platformSelector: PlatformSelectorService,
    private readonly eventBus: EventBusService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async pollMessages() {
    if (this.isPolling) {
      this.logger.debug('Previous polling still in progress, skipping');
      return;
    }

    this.isPolling = true;
    const startTime = Date.now();

    try {
      const activeNumbers = await this.getActiveNumbers();
      if (activeNumbers.length === 0) {
        return;
      }

      this.logger.log(`Polling ${activeNumbers.length} active numbers`);

      const batches = this.chunkArray(activeNumbers, this.BATCH_SIZE);
      let totalChecked = 0;
      let totalReceived = 0;
      let totalExpired = 0;
      let totalErrors = 0;

      for (const batch of batches) {
        const results = await Promise.allSettled(batch.map((number) => this.checkNumberStatus(number)));
        results.forEach((result, index) => {
          totalChecked++;
          if (result.status === 'fulfilled') {
            const { received, expired } = result.value;
            if (received) totalReceived++;
            if (expired) totalExpired++;
          } else {
            totalErrors++;
            this.logger.error(`Failed to check number ${batch[index].id}: ${result.reason}`);
          }
        });
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Polling completed in ${duration}ms: checked=${totalChecked}, received=${totalReceived}, expired=${totalExpired}, errors=${totalErrors}`);
    } catch (error) {
      this.logger.error(`Polling task failed: ${error.message}`, error.stack);
    } finally {
      this.isPolling = false;
    }
  }

  private async checkNumberStatus(number: VirtualNumber): Promise<{ received: boolean; expired: boolean }> {
    try {
      const selection = await this.platformSelector.selectBestPlatform(number.serviceName, number.countryCode);
      const provider = selection.provider;
      const status = await provider.getStatus(number.providerActivationId);

      switch (status.status) {
        case 'received':
          await this.handleMessageReceived(number, status.code, status.message);
          return { received: true, expired: false };
        case 'expired':
        case 'cancelled':
          await this.handleNumberExpired(number, status.status);
          return { received: false, expired: true };
        case 'waiting':
          if (Date.now() > number.expiresAt.getTime()) {
            await this.handleNumberExpired(number, 'expired');
            return { received: false, expired: true };
          }
          return { received: false, expired: false };
        default:
          this.logger.warn(`Unknown status '${status.status}' for number ${number.id}`);
          return { received: false, expired: false };
      }
    } catch (error) {
      this.logger.error(`Error checking number ${number.id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleMessageReceived(number: VirtualNumber, code: string | null, messageText?: string): Promise<void> {
    try {
      const existingMessage = await this.messageRepo.findOne({ where: { virtualNumberId: number.id } });
      if (existingMessage) {
        this.logger.debug(`Message already processed for number ${number.id}`);
        return;
      }

      const smsMessage = new SmsMessage();
      smsMessage.virtualNumberId = number.id;
      if (code) smsMessage.verificationCode = code;
      if (messageText) smsMessage.messageText = messageText;
      const sender = this.extractSender(messageText);
      if (sender) smsMessage.sender = sender;
      await this.messageRepo.save(smsMessage);

      number.status = 'received';
      number.smsReceivedAt = new Date();
      if (number.rentalType !== 'one_time') {
        number.rentalSmsCount += 1;
      }
      await this.numberRepo.save(number);

      await this.eventBus.publish('cloudphone.events', 'sms.message.received', {
        messageId: smsMessage.id,
        numberId: number.id,
        deviceId: number.deviceId,
        userId: number.userId,
        phoneNumber: number.phoneNumber,
        verificationCode: code,
        messageText: messageText,
        service: number.serviceName,
        provider: number.provider,
        receivedAt: smsMessage.receivedAt.toISOString(),
      });

      this.logger.log(`SMS received for ${number.phoneNumber}: code=${code || 'N/A'}`);
    } catch (error) {
      this.logger.error(`Failed to handle received message for number ${number.id}`, error.stack);
      throw error;
    }
  }

  private async handleNumberExpired(number: VirtualNumber, reason: string): Promise<void> {
    try {
      number.status = 'expired';
      number.completedAt = new Date();
      await this.numberRepo.save(number);

      await this.eventBus.publish('cloudphone.events', 'sms.number.expired', {
        numberId: number.id,
        deviceId: number.deviceId,
        userId: number.userId,
        phoneNumber: number.phoneNumber,
        service: number.serviceName,
        provider: number.provider,
        reason,
        expiredAt: number.completedAt.toISOString(),
      });

      this.logger.debug(`Number ${number.phoneNumber} expired: reason=${reason}`);
    } catch (error) {
      this.logger.error(`Failed to handle expired number ${number.id}`, error.stack);
      throw error;
    }
  }

  private async getActiveNumbers(): Promise<VirtualNumber[]> {
    const now = new Date();
    return await this.numberRepo.find({
      where: {
        status: In(['active', 'waiting_sms']),
        expiresAt: MoreThan(now),
      },
      order: { createdAt: 'ASC' },
      take: 500,
    });
  }

  private extractSender(messageText?: string): string | null {
    if (!messageText) return null;
    const senderMatch = messageText.match(/From:\s*([^\n]+)/i);
    return senderMatch ? senderMatch[1].trim() : null;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  async triggerPoll(): Promise<void> {
    this.logger.log('Manual poll triggered');
    await this.pollMessages();
  }

  async getPollingStats(): Promise<{
    isPolling: boolean;
    activeNumbers: number;
    receivedToday: number;
    expiredToday: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeNumbers, receivedToday, expiredToday] = await Promise.all([
      this.numberRepo.count({ where: { status: In(['active', 'waiting_sms']) } }),
      this.messageRepo.count({ where: { receivedAt: MoreThan(today) } }),
      this.numberRepo.count({ where: { status: 'expired', completedAt: MoreThan(today) } }),
    ]);

    return {
      isPolling: this.isPolling,
      activeNumbers,
      receivedToday,
      expiredToday,
    };
  }
}
