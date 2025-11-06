import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { UsageRecord } from '../billing/entities/usage-record.entity';
import { UserBalance } from '../balance/entities/user-balance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UsageRecord, UserBalance])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
