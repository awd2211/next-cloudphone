import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdbService } from './adb.service';

@Module({
  imports: [ConfigModule],
  providers: [AdbService],
  exports: [AdbService],
})
export class AdbModule {}
