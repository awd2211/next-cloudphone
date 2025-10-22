import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { UserEvent } from '../entities/user-event.entity';
import { UserSnapshot } from '../entities/user-snapshot.entity';
import { RolesModule } from '../roles/roles.module';
import { CacheService } from '../cache/cache.service';
import { CommandHandlers } from './commands/handlers';
import { QueryHandlers } from './queries/handlers';
import { EventHandlers } from './events/handlers';
import { EventStoreService } from './events/event-store.service';
import { EventReplayService } from './events/event-replay.service';
import { SnapshotService } from './events/snapshot.service';
import { EventsController } from './events/events.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, UserEvent, UserSnapshot]),
    RolesModule,
    CqrsModule,
  ],
  controllers: [UsersController, EventsController],
  providers: [
    UsersService,
    CacheService,
    EventStoreService,
    EventReplayService,
    SnapshotService,
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
  ],
  exports: [UsersService, EventStoreService, EventReplayService, SnapshotService],
})
export class UsersModule {
  constructor(
    private readonly eventReplay: EventReplayService,
    private readonly snapshotService: SnapshotService,
  ) {
    // 解决循环依赖：EventReplayService -> SnapshotService -> EventReplayService
    this.eventReplay.setSnapshotService(this.snapshotService);
  }
}
