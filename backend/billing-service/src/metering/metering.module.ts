import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { MeteringService } from './metering.service';
import { MeteringController } from './metering.controller';
import { MeteringConsumer } from './metering.consumer';
import { UsageRecord } from '../billing/entities/usage-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsageRecord]),
    HttpModule,
    // EventBusModule 是全局模块，已在 AppModule 中导入，无需重复导入
  ],
  controllers: [MeteringController],
  providers: [MeteringService, MeteringConsumer],
  exports: [MeteringService],
})
export class MeteringModule {}
