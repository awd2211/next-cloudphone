import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DeviceAllocation, AllocationStatus } from '../../entities/device-allocation.entity';
import { Device } from '../../entities/device.entity';
import { AllocationService } from '../allocation.service';
import { NotificationClientService } from '../notification-client.service';

/**
 * User 事件消费者
 *
 * 监听 user.* 事件，执行自动化操作：
 * 1. user.deleted - 用户删除时释放所有设备
 * 2. user.suspended - 用户暂停时释放所有设备
 * 3. user.quota_updated - 配额更新时检查是否需要释放设备
 * 4. user.quota_exceeded - 配额超限时释放超出的设备
 */
@Injectable()
export class UserEventsConsumer {
  private readonly logger = new Logger(UserEventsConsumer.name);

  constructor(
    @InjectRepository(DeviceAllocation)
    private allocationRepository: Repository<DeviceAllocation>,
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    private allocationService: AllocationService,
    private notificationClient: NotificationClientService
  ) {}

  /**
   * 用户删除事件 - 释放该用户的所有设备分配
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'user.deleted',
    queue: 'scheduler.user-deleted',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'scheduler.user-deleted.failed',
    },
  })
  async handleUserDeleted(event: { userId: string; timestamp: string }): Promise<void> {
    this.logger.log(`📥 Received user.deleted event: ${event.userId}`);

    try {
      // 查找该用户的所有活跃分配
      const activeAllocations = await this.allocationRepository.find({
        where: {
          userId: event.userId,
          status: AllocationStatus.ALLOCATED,
        },
      });

      if (activeAllocations.length === 0) {
        this.logger.debug(`No active allocations for deleted user ${event.userId}`);
        return;
      }

      this.logger.log(
        `Found ${activeAllocations.length} active allocations for deleted user, releasing...`
      );

      let successCount = 0;

      for (const allocation of activeAllocations) {
        try {
          await this.allocationService.releaseAllocation(allocation.id, {
            reason: '用户账户已删除',
            automatic: true,
          });
          successCount++;
        } catch (error) {
          this.logger.error(`Failed to release allocation ${allocation.id}: ${error.message}`);
        }
      }

      this.logger.log(
        `✅ Released ${successCount}/${activeAllocations.length} allocations for deleted user`
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle user.deleted event for ${event.userId}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * 用户暂停事件 - 释放该用户的所有设备分配
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'user.suspended',
    queue: 'scheduler.user-suspended',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'scheduler.user-suspended.failed',
    },
  })
  async handleUserSuspended(event: {
    userId: string;
    reason: string;
    timestamp: string;
  }): Promise<void> {
    this.logger.log(`📥 Received user.suspended event: ${event.userId} (${event.reason})`);

    try {
      const activeAllocations = await this.allocationRepository.find({
        where: {
          userId: event.userId,
          status: AllocationStatus.ALLOCATED,
        },
      });

      if (activeAllocations.length === 0) {
        this.logger.debug(`No active allocations for suspended user ${event.userId}`);
        return;
      }

      this.logger.log(`Found ${activeAllocations.length} active allocations for suspended user`);

      let successCount = 0;
      let notificationCount = 0;

      for (const allocation of activeAllocations) {
        try {
          await this.allocationService.releaseAllocation(allocation.id, {
            reason: `账户已暂停：${event.reason}`,
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
        `✅ Released ${successCount} allocations, sent ${notificationCount} notifications`
      );
    } catch (error) {
      this.logger.error(`Failed to handle user.suspended event: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 用户配额更新事件 - 检查是否需要释放设备
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'user.quota_updated',
    queue: 'scheduler.user-quota-updated',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'scheduler.user-quota-updated.failed',
    },
  })
  async handleUserQuotaUpdated(event: {
    userId: string;
    oldQuota: { maxDevices: number; maxCpu: number; maxMemory: number };
    newQuota: { maxDevices: number; maxCpu: number; maxMemory: number };
    timestamp: string;
  }): Promise<void> {
    this.logger.log(
      `📥 Received user.quota_updated event: ${event.userId} (devices: ${event.oldQuota.maxDevices} → ${event.newQuota.maxDevices})`
    );

    try {
      // 如果设备配额降低，检查是否需要释放设备
      if (event.newQuota.maxDevices < event.oldQuota.maxDevices) {
        const activeAllocations = await this.allocationRepository.find({
          where: {
            userId: event.userId,
            status: AllocationStatus.ALLOCATED,
          },
          order: {
            allocatedAt: 'ASC', // 优先释放最早分配的设备
          },
        });

        const currentDeviceCount = activeAllocations.length;
        const excessCount = currentDeviceCount - event.newQuota.maxDevices;

        if (excessCount > 0) {
          this.logger.log(
            `User has ${currentDeviceCount} devices, quota reduced to ${event.newQuota.maxDevices}, releasing ${excessCount} oldest devices`
          );

          // 释放超出配额的设备（最早分配的）
          const devicesToRelease = activeAllocations.slice(0, excessCount);

          for (const allocation of devicesToRelease) {
            try {
              await this.allocationService.releaseAllocation(allocation.id, {
                reason: `配额已调整为 ${event.newQuota.maxDevices} 台设备`,
                automatic: true,
              });

              // 通知用户
              const device = await this.deviceRepository.findOne({
                where: { id: allocation.deviceId },
              });

              if (device) {
                await this.notificationClient.notifyAllocationFailed({
                  userId: event.userId,
                  reason: `您的设备配额已调整为 ${event.newQuota.maxDevices} 台，设备 ${device.name || device.id.substring(0, 8)} 已自动释放`,
                  timestamp: new Date().toISOString(),
                });
              }
            } catch (error) {
              this.logger.error(
                `Failed to release excess allocation ${allocation.id}: ${error.message}`
              );
            }
          }

          this.logger.log(`✅ Released ${excessCount} excess devices due to quota reduction`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to handle user.quota_updated event: ${error.message}`, error.stack);
      // Don't throw - quota updates are informational
    }
  }

  /**
   * 用户配额超限事件 - 立即释放超出的设备
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'user.quota_exceeded',
    queue: 'scheduler.user-quota-exceeded',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'scheduler.user-quota-exceeded.failed',
    },
  })
  async handleUserQuotaExceeded(event: {
    userId: string;
    quotaType: 'devices' | 'cpu' | 'memory';
    current: number;
    limit: number;
    timestamp: string;
  }): Promise<void> {
    this.logger.warn(
      `📥 Received user.quota_exceeded event: ${event.userId} (${event.quotaType}: ${event.current}/${event.limit})`
    );

    try {
      if (event.quotaType === 'devices') {
        const activeAllocations = await this.allocationRepository.find({
          where: {
            userId: event.userId,
            status: AllocationStatus.ALLOCATED,
          },
          order: {
            allocatedAt: 'ASC',
          },
        });

        const excessCount = event.current - event.limit;

        if (excessCount > 0 && activeAllocations.length >= excessCount) {
          this.logger.log(`Releasing ${excessCount} oldest devices to enforce quota limit`);

          const devicesToRelease = activeAllocations.slice(0, excessCount);

          for (const allocation of devicesToRelease) {
            await this.allocationService.releaseAllocation(allocation.id, {
              reason: '设备配额超限，已自动释放',
              automatic: true,
            });
          }

          this.logger.log(`✅ Released ${excessCount} devices to enforce quota`);
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle user.quota_exceeded event: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * 用户激活事件 - 记录日志（暂无自动化操作）
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'user.activated',
    queue: 'scheduler.user-activated',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'scheduler.user-activated.failed',
    },
  })
  async handleUserActivated(event: { userId: string; timestamp: string }): Promise<void> {
    this.logger.log(`📥 Received user.activated event: ${event.userId}`);

    // Currently just logging - could trigger welcome notifications
    // or restore previous allocations if needed
  }
}
