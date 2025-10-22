import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteUserCommand } from '../impl/delete-user.command';
import { UsersService } from '../../users.service';
import { UserDeletedEvent } from '../../events/user.events';
import { EventStoreService } from '../../events/event-store.service';

@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand> {
  constructor(
    private readonly usersService: UsersService,
    private readonly eventStore: EventStoreService,
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    // 执行删除用户（软删除）
    await this.usersService.remove(command.id);

    // 发布用户删除事件
    const version = await this.eventStore.getCurrentVersion(command.id);
    const event = new UserDeletedEvent(
      command.id,
      version + 1,
      'system', // deletedBy - 可以从上下文获取当前操作者
    );

    await this.eventStore.saveEvent(event);
  }
}
