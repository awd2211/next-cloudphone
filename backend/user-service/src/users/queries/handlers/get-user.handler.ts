import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserQuery } from '../impl/get-user.query';
import { UsersService } from '../../users.service';
import { User } from '../../../entities/user.entity';

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  constructor(private readonly usersService: UsersService) {}

  async execute(query: GetUserQuery): Promise<User> {
    return this.usersService.findOne(query.id);
  }
}
