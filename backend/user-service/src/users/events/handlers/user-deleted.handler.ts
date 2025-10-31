import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserDeletedEvent } from '../user.events';
import { EventStoreService } from '../event-store.service';
import { EventBusService } from '@cloudphone/shared';

@EventsHandler(UserDeletedEvent)
export class UserDeletedEventHandler implements IEventHandler<UserDeletedEvent> {
  private readonly logger = new Logger(UserDeletedEventHandler.name);

  constructor(
    private readonly eventStore: EventStoreService,
    private readonly eventBusService: EventBusService
  ) {}

  async handle(event: UserDeletedEvent) {
    try {
      this.logger.log(`Handling UserDeletedEvent for user: ${event.aggregateId}`);

      // 保存事件
      await this.eventStore.saveEvent(event);

      // 发布删除事件（供其他服务清理相关数据）
      await this.eventBusService.publishUserEvent('deleted', {
        userId: event.aggregateId,
        deletedBy: event.deletedBy,
        deletedAt: event.occurredAt,
      });

      this.logger.log(`UserDeletedEvent processed for user: ${event.aggregateId}`);
    } catch (error) {
      this.logger.error(`Failed to handle UserDeletedEvent for user: ${event.aggregateId}`, error);
    }
  }
}
