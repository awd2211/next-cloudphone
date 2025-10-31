import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq'; // ✅ V2: 启用消费者
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';

/**
 * 用户事件监听器
 *
 * ✅ V2: 使用统一的 @golevelup/nestjs-rabbitmq 实现
 *
 * 功能: 监听 user-service 的事件，同步用户信息到 device 表的冗余字段
 */

export interface UserUpdatedEvent {
  userId: string;
  username: string;
  email: string;
  tenantId?: string;
  timestamp: string;
}

export interface UserDeletedEvent {
  userId: string;
  timestamp: string;
}

@Injectable()
export class UserEventsHandler {
  private readonly logger = new Logger(UserEventsHandler.name);

  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>
  ) {}

  /**
   * 监听用户更新事件，同步冗余数据
   *
   * ✅ V2: 启用装饰器
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'user.updated',
    queue: 'device-service.user-updated',
    queueOptions: {
      durable: true,
    },
  })
  async handleUserUpdated(event: UserUpdatedEvent) {
    this.logger.log(`收到用户更新事件: ${event.userId}`);

    try {
      // 更新所有该用户的设备中的冗余字段
      const result = await this.deviceRepository.update(
        { userId: event.userId },
        {
          userName: event.username,
          userEmail: event.email,
          tenantId: event.tenantId || null,
        }
      );

      this.logger.log(`已同步用户 ${event.userId} 的信息，影响 ${result.affected} 个设备`);
    } catch (error) {
      this.logger.error(`同步用户信息失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 监听用户删除事件，处理级联逻辑
   *
   * ✅ V2: 启用装饰器
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'user.deleted',
    queue: 'device-service.user-deleted',
    queueOptions: {
      durable: true,
    },
  })
  async handleUserDeleted(event: UserDeletedEvent) {
    this.logger.warn(`收到用户删除事件: ${event.userId}`);

    try {
      // 根据业务规则处理用户的设备
      // 选项1: 软删除
      await this.deviceRepository.update({ userId: event.userId }, { status: 'deleted' as any });

      // 选项2: 完全删除（谨慎使用）
      // await this.deviceRepository.delete({ userId: event.userId });

      this.logger.log(`已处理用户 ${event.userId} 的设备`);
    } catch (error) {
      this.logger.error(`处理用户删除失败: ${error.message}`, error.stack);
    }
  }
}
