import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Order } from '../billing/entities/order.entity';
import { UsageRecord } from '../billing/entities/usage-record.entity';
import { Plan } from '../billing/entities/plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, UsageRecord, Plan])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
