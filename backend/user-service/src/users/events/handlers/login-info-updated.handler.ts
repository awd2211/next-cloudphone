import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { LoginInfoUpdatedEvent } from '../user.events';
import { EventStoreService } from '../event-store.service';

/**
 * 登录信息更新事件处理器
 * 当用户成功登录时触发
 */
@EventsHandler(LoginInfoUpdatedEvent)
export class LoginInfoUpdatedEventHandler
  implements IEventHandler<LoginInfoUpdatedEvent>
{
  private readonly logger = new Logger(LoginInfoUpdatedEventHandler.name);

  constructor(private readonly eventStore: EventStoreService) {}

  async handle(event: LoginInfoUpdatedEvent) {
    try {
      this.logger.log(
        `Handling LoginInfoUpdatedEvent for user: ${event.aggregateId}`,
      );

      // 事件已经在 EventStoreService 中保存和发布
      // 这里可以添加其他副作用，例如：

      // 1. 记录登录日志到审计系统
      this.logger.debug(
        `User ${event.aggregateId} logged in from IP: ${event.ipAddress} at ${event.loginAt}`,
      );

      // 2. 可以发送登录通知（如果启用）
      // await this.notificationService.sendLoginNotification(event);

      // 3. 更新用户行为分析
      // await this.analyticsService.recordUserActivity(event);

      // 4. 检查异常登录（可选）
      // if (await this.isAnomalousLogin(event)) {
      //   await this.securityService.flagAnomalousLogin(event);
      // }

      this.logger.log(
        `LoginInfoUpdatedEvent handled successfully for user: ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle LoginInfoUpdatedEvent for user: ${event.aggregateId}`,
        error.stack,
      );
      // 不抛出异常，避免影响主流程
    }
  }
}
