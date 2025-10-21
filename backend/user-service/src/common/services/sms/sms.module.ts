import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmsService } from './sms.service';
import { AliyunSmsProvider } from './providers/aliyun-sms.provider';
import { TencentSmsProvider } from './providers/tencent-sms.provider';

@Module({
  imports: [ConfigModule],
  providers: [SmsService, AliyunSmsProvider, TencentSmsProvider],
  exports: [SmsService],
})
export class SmsModule {}
