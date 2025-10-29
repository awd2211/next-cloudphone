import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmsService } from './sms.service';
import { OtpService } from './otp.service';
import { TwilioSmsProvider } from './providers/twilio.provider';
import { AwsSnsProvider } from './providers/aws-sns.provider';
import { MessageBirdProvider } from './providers/messagebird.provider';

/**
 * SMS 模块
 *
 * 集成多个海外短信服务商:
 * - Twilio (全球最流行)
 * - AWS SNS (AWS 生态)
 * - MessageBird (欧洲主流)
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
 * await this.otpService.sendOtp('+1234567890', OtpType.REGISTRATION);
 *
 * // 验证验证码
 * const result = await this.otpService.verifyOtp('+1234567890', '123456', OtpType.REGISTRATION);
 * ```
 */
@Module({
  imports: [ConfigModule],
  providers: [
    TwilioSmsProvider,
    AwsSnsProvider,
    MessageBirdProvider,
    SmsService,
    OtpService,
  ],
  exports: [SmsService, OtpService],
})
export class SmsModule {}
