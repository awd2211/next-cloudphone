import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DeviceStatusGateway } from './device-status.gateway';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [DeviceStatusGateway],
  exports: [DeviceStatusGateway],
})
export class WebSocketModule {}
