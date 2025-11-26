import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { EventBusModule } from '@cloudphone/shared';
import { AdbService } from './adb.service';
import { AdbReconnectionService } from './adb-reconnection.service';
import { AdbConnectionPoolService } from './adb-connection-pool.service';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    EventBusModule,
  ],
  providers: [
    AdbService,
    AdbReconnectionService,
    AdbConnectionPoolService,
  ],
  exports: [
    AdbService,
    AdbReconnectionService,
    AdbConnectionPoolService,
  ],
})
export class AdbModule {}
