import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserByUsernameQuery } from '../impl/get-user-by-username.query';
import { UsersService } from '../../users.service';
import { User } from '../../../entities/user.entity';

@QueryHandler(GetUserByUsernameQuery)
export class GetUserByUsernameHandler implements IQueryHandler<GetUserByUsernameQuery> {
  constructor(private readonly usersService: UsersService) {}

  async execute(query: GetUserByUsernameQuery): Promise<User> {
    return this.usersService.findByUsername(query.username);
  }
}
