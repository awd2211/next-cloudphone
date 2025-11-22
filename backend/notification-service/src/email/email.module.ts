import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { SmtpProvider } from './providers/smtp.provider';
import { MailgunProvider } from './providers/mailgun.provider';
import { SendGridProvider } from './providers/sendgrid.provider';
import { SESProvider } from './providers/ses.provider';
import { PostmarkProvider } from './providers/postmark.provider';
import { ResendProvider } from './providers/resend.provider';
import { SparkPostProvider } from './providers/sparkpost.provider';

/**
 * 邮件模块
 *
 * 支持多种邮件服务提供商:
 * - SMTP: 标准 SMTP 协议，支持任意邮件服务器
 * - Mailgun: 高送达率 API 邮件服务
 * - SendGrid: Twilio 旗下邮件服务
 * - Amazon SES: AWS 邮件服务，性价比高
 * - Postmark: 专注事务性邮件
 * - Resend: 新一代开发者友好邮件服务
 * - SparkPost: 企业级邮件发送平台
 */
@Module({
  controllers: [EmailController],
  providers: [
    EmailService,
    SmtpProvider,
    MailgunProvider,
    SendGridProvider,
    SESProvider,
    PostmarkProvider,
    ResendProvider,
    SparkPostProvider,
  ],
  exports: [
    EmailService,
    SmtpProvider,
    MailgunProvider,
    SendGridProvider,
    SESProvider,
    PostmarkProvider,
    ResendProvider,
    SparkPostProvider,
  ],
})
export class EmailModule {}
