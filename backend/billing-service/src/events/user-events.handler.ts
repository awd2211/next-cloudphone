import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../billing/entities/order.entity';
import { UsageRecord } from '../billing/entities/usage-record.entity';

/**
 * 用户事件监听器（Billing Service）
 *
 * 监听 user-service 的事件，同步用户信息
 */

export interface UserUpdatedEvent {
  userId: string;
  username: string;
  email: string;
  tenantId?: string;
  timestamp: string;
}

@Injectable()
export class BillingUserEventsHandler {
  private readonly logger = new Logger(BillingUserEventsHandler.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(UsageRecord)
    private usageRepository: Repository<UsageRecord>
  ) {}

  /**
   * 监听用户更新事件
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'user.updated',
    queue: 'billing-service.user-updated',
  })
  async handleUserUpdated(event: UserUpdatedEvent) {
    this.logger.log(`收到用户更新事件: ${event.userId}`);

    try {
      // 更新订单中的用户信息
      const orderResult = await this.orderRepository.update(
        { userId: event.userId },
        {
          userName: event.username,
          userEmail: event.email,
        }
      );

      // 更新使用记录中的用户信息（如果有 userName 字段）
      // const usageResult = await this.usageRepository.update(
      //   { userId: event.userId },
      //   { userName: event.username },
      // );

      this.logger.log(`已同步用户 ${event.userId} 的信息到 ${orderResult.affected} 个订单`);
    } catch (error) {
      this.logger.error(`同步用户信息失败: ${error.message}`, error.stack);
    }
  }
}
