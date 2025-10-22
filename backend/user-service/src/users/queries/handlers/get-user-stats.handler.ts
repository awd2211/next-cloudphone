import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserStatsQuery } from '../impl/get-user-stats.query';
import { UsersService } from '../../users.service';

@QueryHandler(GetUserStatsQuery)
export class GetUserStatsHandler implements IQueryHandler<GetUserStatsQuery> {
  constructor(private readonly usersService: UsersService) {}

  async execute(query: GetUserStatsQuery): Promise<any> {
    return this.usersService.getStats(query.tenantId);
  }
}
