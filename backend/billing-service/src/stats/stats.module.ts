import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpClientModule } from '@cloudphone/shared';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { Order } from '../billing/entities/order.entity';
import { Plan } from '../billing/entities/plan.entity';
import { CacheModule } from '../cache/cache.module'; // ✅ 导入缓存模块

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Plan]),
    HttpClientModule,
    CacheModule, // ✅ 添加缓存模块
  ],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
