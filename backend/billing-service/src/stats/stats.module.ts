import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpClientModule } from '@cloudphone/shared';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { Order } from '../billing/entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    HttpClientModule,
  ],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
