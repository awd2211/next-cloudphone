import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { CreateUserCommand } from '../impl/create-user.command';
import { UsersService } from '../../users.service';
import { User } from '../../../entities/user.entity';
import { UserCreatedEvent } from '../../events/user.events';
import { EventStoreService } from '../../events/event-store.service';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    private readonly usersService: UsersService,
    private readonly eventStore: EventStoreService,
  ) {}

  async execute(command: CreateUserCommand): Promise<User> {
    // 执行创建用户的业务逻辑
    const user = await this.usersService.create(command.createUserDto);

    // 获取当前版本号
    const version = await this.eventStore.getCurrentVersion(user.id);

    // 创建并发布领域事件
    const event = new UserCreatedEvent(
      user.id,
      version + 1,
      user.username,
      user.email,
      user.fullName,
      user.phone,
      user.tenantId,
      command.createUserDto.roleIds,
    );

    // EventStoreService 会保存事件并发布到 EventBus
    // EventBus 会触发 UserCreatedEventHandler
    await this.eventStore.saveEvent(event);

    return user;
  }
}
