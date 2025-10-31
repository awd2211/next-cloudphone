import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';
import { OtpService } from './otp.service';
import { TwilioSmsProvider } from './providers/twilio.provider';
import { AwsSnsProvider } from './providers/aws-sns.provider';
import { MessageBirdProvider } from './providers/messagebird.provider';
import { AliyunSmsProvider } from './providers/aliyun.provider';
import { TencentSmsProvider } from './providers/tencent.provider';
import { SmsRecord } from './entities/sms-record.entity';

/**
 * SMS 模块
 *
 * 集成多个短信服务商:
 *
 * 国际提供商:
 * - Twilio (全球最流行)
 * - AWS SNS (AWS 生态)
 * - MessageBird (欧洲主流)
 *
 * 中国本土提供商:
 * - 阿里云短信 (Aliyun SMS)
 * - 腾讯云短信 (Tencent Cloud SMS)
 *
 * 特性:
 * - 自动故障转移
 * - 多提供商负载均衡
 * - 统一的发送接口
 * - 验证码专用 API (OtpService)
 * - Redis 存储验证码
 * - 速率限制和重试控制
 *
 * 使用示例:
 * ```typescript
 * @Module({
 *   imports: [SmsModule],
 * })
 * export class NotificationModule {}
 *
 * // 在服务中使用
 * constructor(
 *   private readonly smsService: SmsService,
 *   private readonly otpService: OtpService,
 * ) {}
 *
 * // 发送验证码
 * await this.otpService.sendOtp('+8613800138000', OtpType.REGISTRATION);
 *
 * // 验证验证码
 * const result = await this.otpService.verifyOtp('+8613800138000', '123456', OtpType.REGISTRATION);
 * ```
 */
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([SmsRecord])],
  controllers: [SmsController],
  providers: [
    // 国际提供商
    TwilioSmsProvider,
    AwsSnsProvider,
    MessageBirdProvider,
    // 中国本土提供商
    AliyunSmsProvider,
    TencentSmsProvider,
    // 服务
    SmsService,
    OtpService,
  ],
  exports: [SmsService, OtpService],
})
export class SmsModule {}
