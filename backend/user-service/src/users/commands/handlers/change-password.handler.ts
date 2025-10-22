import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ChangePasswordCommand } from '../impl/change-password.command';
import { UsersService } from '../../users.service';
import { PasswordChangedEvent } from '../../events/user.events';
import { EventStoreService } from '../../events/event-store.service';

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand> {
  constructor(
    private readonly usersService: UsersService,
    private readonly eventStore: EventStoreService,
  ) {}

  async execute(command: ChangePasswordCommand): Promise<void> {
    // 执行密码修改
    await this.usersService.changePassword(command.id, command.changePasswordDto);

    // 发布密码修改事件
    const version = await this.eventStore.getCurrentVersion(command.id);
    const event = new PasswordChangedEvent(
      command.id,
      version + 1,
      command.id, // changedBy - 当前用户自己修改密码
    );

    await this.eventStore.saveEvent(event);
  }
}
