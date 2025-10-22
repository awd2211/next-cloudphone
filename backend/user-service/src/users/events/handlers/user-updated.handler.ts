import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserUpdatedEvent } from '../user.events';
import { EventStoreService } from '../event-store.service';
import { EventBusService } from '@cloudphone/shared';

@EventsHandler(UserUpdatedEvent)
export class UserUpdatedEventHandler implements IEventHandler<UserUpdatedEvent> {
  private readonly logger = new Logger(UserUpdatedEventHandler.name);

  constructor(
    private readonly eventStore: EventStoreService,
    private readonly eventBusService: EventBusService,
  ) {}

  async handle(event: UserUpdatedEvent) {
    try {
      this.logger.log(`Handling UserUpdatedEvent for user: ${event.aggregateId}`);

      // 保存事件
      await this.eventStore.saveEvent(event);

      // 发布到事件总线（用于同步其他服务的用户信息）
      await this.eventBusService.publish('events', 'user.updated', {
        userId: event.aggregateId,
        updates: event.updates,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`UserUpdatedEvent processed for user: ${event.aggregateId}`);
    } catch (error) {
      this.logger.error(
        `Failed to handle UserUpdatedEvent for user: ${event.aggregateId}`,
        error,
      );
    }
  }
}
