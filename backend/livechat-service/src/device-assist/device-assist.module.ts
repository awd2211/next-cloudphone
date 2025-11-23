import { Module } from '@nestjs/common';
import { DeviceAssistService } from './device-assist.service';
import { DeviceAssistController } from './device-assist.controller';

@Module({
  controllers: [DeviceAssistController],
  providers: [DeviceAssistService],
  exports: [DeviceAssistService],
})
export class DeviceAssistModule {}
