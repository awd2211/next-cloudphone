import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../billing/entities/order.entity';
import { UsageRecord } from '../billing/entities/usage-record.entity';

/**
 * 设备事件监听器（Billing Service）
 * 
 * 监听 device-service 的事件，同步设备信息
 */

export interface DeviceUpdatedEvent {
  deviceId: string;
  name: string;
  status?: string;
  timestamp: string;
}

@Injectable()
export class BillingDeviceEventsHandler {
  private readonly logger = new Logger(BillingDeviceEventsHandler.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(UsageRecord)
    private usageRepository: Repository<UsageRecord>,
  ) {}

  /**
   * 监听设备更新事件
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'device.updated',
    queue: 'billing-service.device-updated',
  })
  async handleDeviceUpdated(event: DeviceUpdatedEvent) {
    this.logger.log(`收到设备更新事件: ${event.deviceId}`);
    
    try {
      // 更新订单中的设备名称
      const orderResult = await this.orderRepository.update(
        { deviceId: event.deviceId },
        { deviceName: event.name },
      );
      
      this.logger.log(`已同步设备 ${event.deviceId} 的信息到 ${orderResult.affected} 个订单`);
    } catch (error) {
      this.logger.error(`同步设备信息失败: ${error.message}`, error.stack);
    }
  }
}

