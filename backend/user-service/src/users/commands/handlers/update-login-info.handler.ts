import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateLoginInfoCommand } from '../impl/update-login-info.command';
import { UsersService } from '../../users.service';

@CommandHandler(UpdateLoginInfoCommand)
export class UpdateLoginInfoHandler implements ICommandHandler<UpdateLoginInfoCommand> {
  constructor(private readonly usersService: UsersService) {}

  async execute(command: UpdateLoginInfoCommand): Promise<void> {
    return this.usersService.updateLoginInfo(command.id, command.ip);
  }
}
