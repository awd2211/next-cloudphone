import { Module } from '@nestjs/common';
import { HttpClientModule } from '@cloudphone/shared';
import { DeviceAssistService } from './device-assist.service';
import { DeviceAssistController } from './device-assist.controller';

@Module({
  imports: [HttpClientModule],
  controllers: [DeviceAssistController],
  providers: [DeviceAssistService],
  exports: [DeviceAssistService],
})
export class DeviceAssistModule {}
