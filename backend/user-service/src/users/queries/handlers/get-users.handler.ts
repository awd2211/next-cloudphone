import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUsersQuery } from '../impl/get-users.query';
import { UsersService } from '../../users.service';

@QueryHandler(GetUsersQuery)
export class GetUsersHandler implements IQueryHandler<GetUsersQuery> {
  constructor(private readonly usersService: UsersService) {}

  async execute(query: GetUsersQuery): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.usersService.findAll(
      query.page,
      query.limit,
      query.tenantId,
      { includeRoles: query.includeRoles },
    );
  }
}
