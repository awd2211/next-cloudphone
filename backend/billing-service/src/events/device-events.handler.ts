import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../billing/entities/order.entity';
import { UsageRecord } from '../billing/entities/usage-record.entity';
import { MeteringService } from '../metering/metering.service';
import { BalanceService } from '../balance/balance.service';

/**
 * 设备事件监听器（Billing Service）
 *
 * 监听 device-service 的事件，同步设备信息并进行计费
 */

export interface DeviceUpdatedEvent {
  deviceId: string;
  name: string;
  status?: string;
  timestamp: string;
}

export interface DeviceStartedEvent {
  deviceId: string;
  userId: string;
  tenantId?: string;
  startedAt: string;
}

export interface DeviceStoppedEvent {
  deviceId: string;
  userId: string;
  stoppedAt: string;
  duration: number; // 运行时长（秒）
}

@Injectable()
export class BillingDeviceEventsHandler {
  private readonly logger = new Logger(BillingDeviceEventsHandler.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(UsageRecord)
    private usageRepository: Repository<UsageRecord>,
    private meteringService: MeteringService,
    private balanceService: BalanceService
  ) {}

  /**
   * 监听设备更新事件
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'device.updated',
    queue: 'billing-service.device-updated',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
    },
  })
  async handleDeviceUpdated(event: DeviceUpdatedEvent) {
    this.logger.log(`收到设备更新事件: ${event.deviceId}`);

    try {
      // 更新订单中的设备名称
      const orderResult = await this.orderRepository.update(
        { deviceId: event.deviceId },
        { deviceName: event.name }
      );

      this.logger.log(`已同步设备 ${event.deviceId} 的信息到 ${orderResult.affected} 个订单`);
    } catch (error) {
      this.logger.error(`同步设备信息失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 监听设备启动事件 - 开始用量追踪
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'device.started',
    queue: 'billing-service.device-started',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
    },
  })
  async handleDeviceStarted(event: DeviceStartedEvent) {
    this.logger.log(`收到设备启动事件: ${event.deviceId}, 用户: ${event.userId}`);

    try {
      // 开始用量追踪
      await this.meteringService.startUsageTracking({
        deviceId: event.deviceId,
        userId: event.userId,
        tenantId: event.tenantId,
      });

      this.logger.log(`已开始追踪设备 ${event.deviceId} 的用量`);
    } catch (error) {
      this.logger.error(`开始用量追踪失败 - 设备: ${event.deviceId}`, error.stack);
    }
  }

  /**
   * 监听设备停止事件 - 停止用量追踪并计费
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'device.stopped',
    queue: 'billing-service.device-stopped',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
    },
  })
  async handleDeviceStopped(event: DeviceStoppedEvent) {
    this.logger.log(
      `收到设备停止事件: ${event.deviceId}, 用户: ${event.userId}, 运行时长: ${event.duration}秒`
    );

    try {
      // 1. 停止用量追踪并计算费用
      await this.meteringService.stopUsageTracking(event.deviceId, event.duration);

      // 2. 查找刚创建的用量记录
      const usageRecord = await this.usageRepository.findOne({
        where: {
          deviceId: event.deviceId,
          endTime: null as any,
        },
        order: {
          createdAt: 'DESC',
        },
      });

      // 如果没有找到记录，可能是之前没有调用 startUsageTracking
      // 使用 stopUsageTracking 会更新最近的记录
      // 所以我们需要重新查找已更新的记录
      const updatedRecord = await this.usageRepository.findOne({
        where: {
          deviceId: event.deviceId,
        },
        order: {
          createdAt: 'DESC',
        },
      });

      if (!updatedRecord || !updatedRecord.cost) {
        this.logger.warn(`未找到设备 ${event.deviceId} 的用量记录或费用未计算`);
        return;
      }

      // 3. 从用户余额扣费
      try {
        const { balance, transaction } = await this.balanceService.consume({
          userId: event.userId,
          amount: Number(updatedRecord.cost),
          deviceId: event.deviceId,
          description: `设备使用费 (${(event.duration / 3600).toFixed(2)} 小时)`,
          metadata: {
            duration: event.duration,
            usageRecordId: updatedRecord.id,
            deviceId: event.deviceId,
          },
        });

        // 4. 标记用量记录为已计费
        updatedRecord.isBilled = true;
        await this.usageRepository.save(updatedRecord);

        this.logger.log(
          `设备 ${event.deviceId} 计费完成 - 用户: ${event.userId}, 费用: ${updatedRecord.cost} 元, 余额: ${balance.balance} 元`
        );
      } catch (balanceError) {
        // 余额不足或其他错误
        this.logger.error(
          `扣费失败 - 用户: ${event.userId}, 设备: ${event.deviceId}, 费用: ${updatedRecord.cost} 元`,
          balanceError.stack
        );

        // 可以发送余额不足通知
        // await this.notificationService.send(...)
      }
    } catch (error) {
      this.logger.error(`处理设备停止事件失败 - 设备: ${event.deviceId}`, error.stack);
    }
  }

  /**
   * 监听设备删除事件 - 清理未计费的用量记录
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'device.deleted',
    queue: 'billing-service.device-deleted',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.dlx',
    },
  })
  async handleDeviceDeleted(event: { deviceId: string; userId: string }) {
    this.logger.log(`收到设备删除事件: ${event.deviceId}`);

    try {
      // 检查是否有未计费的用量记录
      const unpaidRecords = await this.usageRepository.find({
        where: {
          deviceId: event.deviceId,
          isBilled: false,
        },
      });

      if (unpaidRecords.length > 0) {
        this.logger.warn(`设备 ${event.deviceId} 有 ${unpaidRecords.length} 条未计费的用量记录`);

        // 计算总费用并尝试扣费
        const totalCost = unpaidRecords.reduce((sum, record) => sum + Number(record.cost || 0), 0);

        if (totalCost > 0) {
          try {
            await this.balanceService.consume({
              userId: event.userId,
              amount: totalCost,
              deviceId: event.deviceId,
              description: `设备删除时结算未计费用量`,
            });

            // 标记所有记录为已计费
            await this.usageRepository.update(
              { deviceId: event.deviceId, isBilled: false },
              { isBilled: true }
            );

            this.logger.log(`设备 ${event.deviceId} 删除时结算完成 - 总费用: ${totalCost} 元`);
          } catch (error) {
            this.logger.error(
              `设备删除时结算失败 - 设备: ${event.deviceId}, 费用: ${totalCost} 元`,
              error.stack
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`处理设备删除事件失败 - 设备: ${event.deviceId}`, error.stack);
    }
  }
}
