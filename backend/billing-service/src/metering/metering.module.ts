import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { MeteringService } from './metering.service';
import { MeteringController } from './metering.controller';
import { MeteringConsumer } from './metering.consumer';
import { UsageRecord } from '../billing/entities/usage-record.entity';
import { EventBusModule } from '@cloudphone/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsageRecord]),
    HttpModule,
    EventBusModule,
  ],
  controllers: [MeteringController],
  providers: [MeteringService, MeteringConsumer],
  exports: [MeteringService],
})
export class MeteringModule {}
