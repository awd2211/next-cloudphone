import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../../entities/device.entity';
import { DeviceAllocation, AllocationStatus } from '../../entities/device-allocation.entity';
import { AllocationService } from '../allocation.service';
import { NotificationClientService } from '../notification-client.service';

/**
 * Device 事件消费者
 *
 * 监听 device.* 事件，执行自动化操作：
 * 1. device.failed - 设备故障时自动释放分配
 * 2. device.deleted - 设备删除时释放分配并通知用户
 * 3. device.status_changed - 设备状态变更时更新分配状态
 * 4. device.maintenance - 设备维护时释放分配
 */
@Injectable()
export class DeviceEventsConsumer {
  private readonly logger = new Logger(DeviceEventsConsumer.name);

  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(DeviceAllocation)
    private allocationRepository: Repository<DeviceAllocation>,
    private allocationService: AllocationService,
    private notificationClient: NotificationClientService
  ) {}

  /**
   * 设备故障事件 - 自动释放分配
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'device.failed',
    queue: 'scheduler.device-failed',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'scheduler.device-failed.failed',
    },
  })
  async handleDeviceFailed(event: {
    deviceId: string;
    reason: string;
    timestamp: string;
  }): Promise<void> {
    this.logger.log(`📥 Received device.failed event: ${event.deviceId}`);

    try {
      // 查找该设备的活跃分配
      const activeAllocation = await this.allocationRepository.findOne({
        where: {
          deviceId: event.deviceId,
          status: AllocationStatus.ALLOCATED,
        },
      });

      if (!activeAllocation) {
        this.logger.debug(`No active allocation for failed device ${event.deviceId}`);
        return;
      }

      // 释放分配
      await this.allocationService.releaseAllocation(activeAllocation.id, {
        reason: `设备故障：${event.reason}`,
        automatic: true,
      });

      this.logger.log(`✅ Auto-released allocation ${activeAllocation.id} due to device failure`);

      // 发送故障通知
      const device = await this.deviceRepository.findOne({
        where: { id: event.deviceId },
      });

      if (device) {
        const durationSeconds = Math.floor(
          (new Date().getTime() - activeAllocation.allocatedAt.getTime()) / 1000
        );

        await this.notificationClient.notifyDeviceReleased({
          userId: activeAllocation.userId,
          deviceId: device.id,
          deviceName: device.name || `Device-${device.id.substring(0, 8)}`,
          allocationId: activeAllocation.id,
          durationSeconds,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle device.failed event for ${event.deviceId}: ${error.message}`,
        error.stack
      );
      throw error; // Re-throw to send to DLX
    }
  }

  /**
   * 设备删除事件 - 释放分配并通知用户
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'device.deleted',
    queue: 'scheduler.device-deleted',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'scheduler.device-deleted.failed',
    },
  })
  async handleDeviceDeleted(event: {
    deviceId: string;
    userId: string;
    timestamp: string;
  }): Promise<void> {
    this.logger.log(`📥 Received device.deleted event: ${event.deviceId}`);

    try {
      // 查找所有该设备的活跃分配（理论上应该只有一个）
      const activeAllocations = await this.allocationRepository.find({
        where: {
          deviceId: event.deviceId,
          status: AllocationStatus.ALLOCATED,
        },
      });

      if (activeAllocations.length === 0) {
        this.logger.debug(`No active allocations for deleted device ${event.deviceId}`);
        return;
      }

      this.logger.log(`Found ${activeAllocations.length} active allocations for deleted device`);

      // 释放所有活跃分配
      for (const allocation of activeAllocations) {
        try {
          await this.allocationService.releaseAllocation(allocation.id, {
            reason: '设备已删除',
            automatic: true,
          });

          this.logger.log(`✅ Released allocation ${allocation.id} due to device deletion`);

          // 通知用户设备已被删除
          await this.notificationClient.notifyAllocationFailed({
            userId: allocation.userId,
            reason: '您使用的设备已被删除，分配已自动释放',
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          this.logger.error(`Failed to release allocation ${allocation.id}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle device.deleted event for ${event.deviceId}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * 设备状态变更事件
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'device.status_changed',
    queue: 'scheduler.device-status-changed',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'scheduler.device-status-changed.failed',
    },
  })
  async handleDeviceStatusChanged(event: {
    deviceId: string;
    oldStatus: string;
    newStatus: string;
    timestamp: string;
  }): Promise<void> {
    this.logger.debug(
      `📥 Received device.status_changed event: ${event.deviceId} (${event.oldStatus} → ${event.newStatus})`
    );

    try {
      // 如果设备从 running 变为 stopped/error，释放分配
      if (
        event.oldStatus === 'running' &&
        (event.newStatus === 'stopped' || event.newStatus === 'error')
      ) {
        const activeAllocation = await this.allocationRepository.findOne({
          where: {
            deviceId: event.deviceId,
            status: AllocationStatus.ALLOCATED,
          },
        });

        if (activeAllocation) {
          await this.allocationService.releaseAllocation(activeAllocation.id, {
            reason: `设备状态变更：${event.oldStatus} → ${event.newStatus}`,
            automatic: true,
          });

          this.logger.log(
            `✅ Auto-released allocation ${activeAllocation.id} due to status change`
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle device.status_changed event: ${error.message}`,
        error.stack
      );
      // Don't throw - status changes are informational
    }
  }

  /**
   * 设备维护事件 - 释放分配以便维护
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'device.maintenance',
    queue: 'scheduler.device-maintenance',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'scheduler.device-maintenance.failed',
    },
  })
  async handleDeviceMaintenance(event: {
    deviceId: string;
    maintenanceType: string;
    estimatedDuration?: number;
    timestamp: string;
  }): Promise<void> {
    this.logger.log(
      `📥 Received device.maintenance event: ${event.deviceId} (${event.maintenanceType})`
    );

    try {
      const activeAllocation = await this.allocationRepository.findOne({
        where: {
          deviceId: event.deviceId,
          status: AllocationStatus.ALLOCATED,
        },
      });

      if (activeAllocation) {
        await this.allocationService.releaseAllocation(activeAllocation.id, {
          reason: `设备维护：${event.maintenanceType}`,
          automatic: true,
        });

        this.logger.log(`✅ Released allocation ${activeAllocation.id} for device maintenance`);

        // 通知用户设备需要维护
        const device = await this.deviceRepository.findOne({
          where: { id: event.deviceId },
        });

        if (device) {
          const message = event.estimatedDuration
            ? `您使用的设备需要进行维护（${event.maintenanceType}），预计需要 ${event.estimatedDuration} 分钟。分配已自动释放。`
            : `您使用的设备需要进行维护（${event.maintenanceType}）。分配已自动释放。`;

          await this.notificationClient.notifyAllocationFailed({
            userId: activeAllocation.userId,
            reason: message,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to handle device.maintenance event: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 设备创建事件 - 记录新设备加入
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'device.created',
    queue: 'scheduler.device-created',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
      deadLetterRoutingKey: 'scheduler.device-created.failed',
    },
  })
  async handleDeviceCreated(event: {
    deviceId: string;
    userId: string;
    deviceType: string;
    timestamp: string;
  }): Promise<void> {
    this.logger.log(`📥 Received device.created event: ${event.deviceId} (${event.deviceType})`);

    // Currently just logging, could trigger autoscaling decisions
    // or update device pool statistics
  }
}
