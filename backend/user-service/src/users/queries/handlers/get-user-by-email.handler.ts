import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserByEmailQuery } from '../impl/get-user-by-email.query';
import { UsersService } from '../../users.service';
import { User } from '../../../entities/user.entity';

@QueryHandler(GetUserByEmailQuery)
export class GetUserByEmailHandler implements IQueryHandler<GetUserByEmailQuery> {
  constructor(private readonly usersService: UsersService) {}

  async execute(query: GetUserByEmailQuery): Promise<User> {
    return this.usersService.findByEmail(query.email);
  }
}
