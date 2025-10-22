import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { AccountUnlockedEvent } from '../user.events';
import { EventStoreService } from '../event-store.service';

/**
 * 账户解锁事件处理器
 * 当账户被管理员解锁或自动解锁时触发
 */
@EventsHandler(AccountUnlockedEvent)
export class AccountUnlockedEventHandler
  implements IEventHandler<AccountUnlockedEvent>
{
  private readonly logger = new Logger(AccountUnlockedEventHandler.name);

  constructor(private readonly eventStore: EventStoreService) {}

  async handle(event: AccountUnlockedEvent) {
    try {
      this.logger.log(
        `Handling AccountUnlockedEvent for user: ${event.aggregateId}`,
      );

      // 事件已经在 EventStoreService 中保存和发布
      // 这里可以添加其他副作用，例如：

      // 1. 记录解锁日志
      this.logger.debug(
        `Account unlocked for user ${event.aggregateId} by ${event.unlockedBy}`,
      );

      // 2. 发送账户解锁通知
      // await this.notificationService.sendAccountUnlockedNotification({
      //   userId: event.aggregateId,
      //   unlockedBy: event.unlockedBy,
      //   unlockedAt: event.occurredAt,
      // });

      // 3. 更新安全日志
      // await this.securityService.logAccountUnlocked({
      //   userId: event.aggregateId,
      //   unlockedBy: event.unlockedBy,
      //   timestamp: event.occurredAt,
      // });

      // 4. 清除相关的安全警报
      // await this.securityService.clearSecurityAlerts(event.aggregateId);

      this.logger.log(
        `AccountUnlockedEvent handled successfully for user: ${event.aggregateId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle AccountUnlockedEvent for user: ${event.aggregateId}`,
        error.stack,
      );
      // 不抛出异常，避免影响主流程
    }
  }
}
