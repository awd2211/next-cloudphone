import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { MeteringService } from './metering.service';
import { MeteringController } from './metering.controller';
import { UsageRecord } from '../billing/entities/usage-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsageRecord]),
    HttpModule,
  ],
  controllers: [MeteringController],
  providers: [MeteringService],
  exports: [MeteringService],
})
export class MeteringModule {}
