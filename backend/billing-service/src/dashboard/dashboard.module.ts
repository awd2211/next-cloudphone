import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { UsageRecord } from '../billing/entities/usage-record.entity';
import { UserBalance } from '../balance/entities/user-balance.entity';
import { WarningConfigEntity } from './entities/warning-config.entity';
import { CacheModule } from '../cache/cache.module'; // ✅ 导入缓存模块

@Module({
  imports: [
    TypeOrmModule.forFeature([UsageRecord, UserBalance, WarningConfigEntity]),
    CacheModule, // ✅ 添加缓存模块
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
