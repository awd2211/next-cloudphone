import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulingController } from './scheduling.controller';
import { SchedulingService } from './scheduling.service';
import {
  ShiftTemplate,
  AgentSchedule,
  RecurringSchedule,
  Agent,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShiftTemplate,
      AgentSchedule,
      RecurringSchedule,
      Agent,
    ]),
  ],
  controllers: [SchedulingController],
  providers: [SchedulingService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
