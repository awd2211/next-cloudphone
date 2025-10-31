import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateUserCommand } from '../impl/update-user.command';
import { UsersService } from '../../users.service';
import { User } from '../../../entities/user.entity';
import { UserUpdatedEvent } from '../../events/user.events';
import { EventStoreService } from '../../events/event-store.service';

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand> {
  constructor(
    private readonly usersService: UsersService,
    private readonly eventStore: EventStoreService
  ) {}

  async execute(command: UpdateUserCommand): Promise<User> {
    // 执行更新用户的业务逻辑
    const user = await this.usersService.update(command.id, command.updateUserDto);

    // 获取当前版本号并发布事件
    const version = await this.eventStore.getCurrentVersion(user.id);
    const event = new UserUpdatedEvent(user.id, version + 1, command.updateUserDto);

    await this.eventStore.saveEvent(event);

    return user;
  }
}
