import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceAllocation, AllocationStatus } from '../../entities/device-allocation.entity';
import { Device } from '../../entities/device.entity';
import { AllocationService } from '../allocation.service';
import { NotificationClientService } from '../notification-client.service';
import { runInTraceContext } from '@cloudphone/shared';

/**
 * Billing 事件消费者
 *
 * 监听 billing.* 事件，执行自动化操作：
 * 1. billing.payment_failed - 支付失败时记录，多次失败后暂停服务
 * 2. billing.balance_low - 余额不足预警
 * 3. billing.overdue - 账户欠费时立即释放所有设备
 * 4. billing.payment_success - 支付成功时恢复服务（如有必要）
 */
@Injectable()
export class BillingEventsConsumer {
  private readonly logger = new Logger(BillingEventsConsumer.name);

  // 用户支付失败计数 (in-memory, 生产环境应使用 Redis)
  private paymentFailureCount = new Map<string, number>();

  // 支付失败阈值（超过此次数将释放设备）
  private readonly FAILURE_THRESHOLD = 3;

  constructor(
    @InjectRepository(DeviceAllocation)
    private allocationRepository: Repository<DeviceAllocation>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private allocationService: AllocationService,
    private notificationClient: NotificationClientService
  ) {}

  /**
   * 支付失败事件 - 记录失败次数，达到阈值后释放设备
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'billing.payment_failed',
    queue: 'scheduler.billing-payment-failed',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'scheduler.billing-payment-failed.failed',
    },
  })
  async handlePaymentFailed(event: {
    userId: string;
    amount: number;
    reason: string;
    timestamp: string;
  }): Promise<void> {
    return runInTraceContext(event, async () => {
      this.logger.warn(
        `📥 Received billing.payment_failed event: ${event.userId} (${event.amount} - ${event.reason})`
      );

      try {
      // 增加失败计数
      const currentCount = this.paymentFailureCount.get(event.userId) || 0;
      const newCount = currentCount + 1;
      this.paymentFailureCount.set(event.userId, newCount);

      this.logger.log(
        `User ${event.userId} payment failure count: ${newCount}/${this.FAILURE_THRESHOLD}`
      );

      // 发送余额不足警告
      await this.notificationClient.sendBatchNotifications([
        {
          userId: event.userId,
          type: 'billing_alert' as any,
          title: '⚠️ 支付失败',
          message: `支付失败：${event.reason}。请及时充值，避免服务中断。`,
          data: {
            amount: event.amount,
            reason: event.reason,
            failureCount: newCount,
            threshold: this.FAILURE_THRESHOLD,
          },
          channels: ['websocket', 'email'],
        },
      ]);

      // 达到阈值，释放所有设备
      if (newCount >= this.FAILURE_THRESHOLD) {
        this.logger.warn(
          `User ${event.userId} reached payment failure threshold, releasing all devices`
        );

        const activeAllocations = await this.allocationRepository.find({
          where: {
            userId: event.userId,
            status: AllocationStatus.ALLOCATED,
          },
        });

        if (activeAllocations.length > 0) {
          this.logger.log(`Releasing ${activeAllocations.length} devices for user ${event.userId}`);

          for (const allocation of activeAllocations) {
            try {
              await this.allocationService.releaseAllocation(allocation.id, {
                reason: '多次支付失败，账户已暂停服务',
                automatic: true,
              });

              // 通知用户设备已释放
              const device = await this.deviceRepository.findOne({
                where: { id: allocation.deviceId },
              });

              if (device) {
                await this.notificationClient.notifyDeviceReleased({
                  userId: event.userId,
                  deviceId: device.id,
                  deviceName: device.name || `Device-${device.id.substring(0, 8)}`,
                  allocationId: allocation.id,
                  durationSeconds: Math.floor(
                    (new Date().getTime() - allocation.allocatedAt.getTime()) / 1000
                  ),
                });
              }
            } catch (error) {
              this.logger.error(`Failed to release allocation ${allocation.id}: ${error.message}`);
            }
          }

          this.logger.log(
            `✅ Released ${activeAllocations.length} devices due to payment failures`
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle billing.payment_failed event: ${error.message}`,
        error.stack
      );
      // Don't throw - payment failures are informational
    }
    });
  }

  /**
   * 余额不足预警事件
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'billing.balance_low',
    queue: 'scheduler.billing-balance-low',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'scheduler.billing-balance-low.failed',
    },
  })
  async handleBalanceLow(event: {
    userId: string;
    currentBalance: number;
    threshold: number;
    timestamp: string;
  }): Promise<void> {
    return runInTraceContext(event, async () => {
      this.logger.log(
        `📥 Received billing.balance_low event: ${event.userId} (balance: ${event.currentBalance}, threshold: ${event.threshold})`
      );

      try {
        // 发送余额不足预警通知
        await this.notificationClient.sendBatchNotifications([
          {
            userId: event.userId,
            type: 'billing_alert' as any,
            title: '💰 余额不足提醒',
            message: `您的账户余额为 ¥${event.currentBalance}，已低于预警值 ¥${event.threshold}。请及时充值以保证服务正常使用。`,
            data: {
              currentBalance: event.currentBalance,
              threshold: event.threshold,
            },
            channels: ['websocket', 'email'],
          },
        ]);

        this.logger.log(`✅ Sent balance low notification to user ${event.userId}`);
      } catch (error) {
        this.logger.error(
          `Failed to handle billing.balance_low event: ${error.message}`,
          error.stack
        );
        // Don't throw - balance warnings are informational
      }
    });
  }

  /**
   * 账户欠费事件 - 立即释放所有设备
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'billing.overdue',
    queue: 'scheduler.billing-overdue',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'scheduler.billing-overdue.failed',
    },
  })
  async handleOverdue(event: {
    userId: string;
    overdueAmount: number;
    overdueDays: number;
    timestamp: string;
  }): Promise<void> {
    return runInTraceContext(event, async () => {
      this.logger.warn(
        `📥 Received billing.overdue event: ${event.userId} (amount: ${event.overdueAmount}, days: ${event.overdueDays})`
      );

      try {
      // 查找该用户的所有活跃分配
      const activeAllocations = await this.allocationRepository.find({
        where: {
          userId: event.userId,
          status: AllocationStatus.ALLOCATED,
        },
      });

      if (activeAllocations.length === 0) {
        this.logger.debug(`No active allocations for overdue user ${event.userId}`);
        return;
      }

      this.logger.log(
        `Found ${activeAllocations.length} active allocations for overdue user, releasing...`
      );

      let successCount = 0;
      let notificationCount = 0;

      for (const allocation of activeAllocations) {
        try {
          await this.allocationService.releaseAllocation(allocation.id, {
            reason: `账户欠费 ¥${event.overdueAmount}（${event.overdueDays} 天），服务已暂停`,
            automatic: true,
          });
          successCount++;

          // 通知用户设备已释放
          const device = await this.deviceRepository.findOne({
            where: { id: allocation.deviceId },
          });

          if (device) {
            const durationSeconds = Math.floor(
              (new Date().getTime() - allocation.allocatedAt.getTime()) / 1000
            );

            await this.notificationClient.notifyDeviceReleased({
              userId: event.userId,
              deviceId: device.id,
              deviceName: device.name || `Device-${device.id.substring(0, 8)}`,
              allocationId: allocation.id,
              durationSeconds,
            });
            notificationCount++;
          }
        } catch (error) {
          this.logger.error(`Failed to release allocation ${allocation.id}: ${error.message}`);
        }
      }

      this.logger.log(
        `✅ Released ${successCount} allocations, sent ${notificationCount} notifications due to overdue account`
      );

      // 发送账户欠费通知
      await this.notificationClient.sendBatchNotifications([
        {
          userId: event.userId,
          type: 'billing_alert' as any,
          title: '🚨 账户欠费提醒',
          message: `您的账户已欠费 ¥${event.overdueAmount}（${event.overdueDays} 天），所有设备已自动释放。请尽快充值恢复服务。`,
          data: {
            overdueAmount: event.overdueAmount,
            overdueDays: event.overdueDays,
            releasedDevices: successCount,
          },
          channels: ['websocket', 'email', 'sms'],
        },
      ]);
    } catch (error) {
      this.logger.error(`Failed to handle billing.overdue event: ${error.message}`, error.stack);
      throw error; // Important event - throw to DLX
    }
    });
  }

  /**
   * 支付成功事件 - 重置失败计数
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'billing.payment_success',
    queue: 'scheduler.billing-payment-success',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'scheduler.billing-payment-success.failed',
    },
  })
  async handlePaymentSuccess(event: {
    userId: string;
    amount: number;
    newBalance: number;
    timestamp: string;
  }): Promise<void> {
    return runInTraceContext(event, async () => {
      this.logger.log(
        `📥 Received billing.payment_success event: ${event.userId} (amount: ${event.amount}, new balance: ${event.newBalance})`
      );

      try {
        // 重置支付失败计数
        if (this.paymentFailureCount.has(event.userId)) {
          this.paymentFailureCount.delete(event.userId);
          this.logger.log(`Reset payment failure count for user ${event.userId}`);
        }

        // 发送支付成功通知
        await this.notificationClient.sendBatchNotifications([
          {
            userId: event.userId,
            type: 'billing_alert' as any,
            title: '✅ 支付成功',
            message: `支付 ¥${event.amount} 成功，当前余额 ¥${event.newBalance}。服务已恢复正常。`,
            data: {
              amount: event.amount,
              newBalance: event.newBalance,
            },
            channels: ['websocket'],
          },
        ]);

        this.logger.log(`✅ Sent payment success notification to user ${event.userId}`);
      } catch (error) {
        this.logger.error(
          `Failed to handle billing.payment_success event: ${error.message}`,
          error.stack
        );
        // Don't throw - payment success is informational
      }
    });
  }

  /**
   * 账户充值事件
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'billing.recharged',
    queue: 'scheduler.billing-recharged',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'scheduler.billing-recharged.failed',
    },
  })
  async handleRecharged(event: {
    userId: string;
    amount: number;
    newBalance: number;
    timestamp: string;
  }): Promise<void> {
    return runInTraceContext(event, async () => {
      this.logger.log(
        `📥 Received billing.recharged event: ${event.userId} (amount: ${event.amount}, new balance: ${event.newBalance})`
      );

      try {
        // 重置支付失败计数
        if (this.paymentFailureCount.has(event.userId)) {
          this.paymentFailureCount.delete(event.userId);
          this.logger.log(`Reset payment failure count after recharge for user ${event.userId}`);
        }

        // 发送充值成功通知
        await this.notificationClient.sendBatchNotifications([
          {
            userId: event.userId,
            type: 'billing_alert' as any,
            title: '💳 充值成功',
            message: `充值 ¥${event.amount} 成功，当前余额 ¥${event.newBalance}。感谢您的支持！`,
            data: {
              amount: event.amount,
              newBalance: event.newBalance,
            },
            channels: ['websocket'],
          },
        ]);
      } catch (error) {
        this.logger.error(`Failed to handle billing.recharged event: ${error.message}`, error.stack);
        // Don't throw - recharge is informational
      }
    });
  }

  /**
   * 周期性清理支付失败计数（可选）
   * 可以通过 Cron 定期调用此方法
   */
  cleanupFailureCounters(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    // 简单实现：清空所有计数（生产环境应使用 Redis 带 TTL）
    if (this.paymentFailureCount.size > 1000) {
      this.logger.log('Clearing payment failure counters (size limit reached)');
      this.paymentFailureCount.clear();
    }
  }
}
