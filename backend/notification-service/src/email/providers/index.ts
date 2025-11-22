/**
 * 邮件服务提供商导出
 *
 * 支持的邮件服务商:
 * - SMTP: 标准 SMTP 协议
 * - Mailgun: 高送达率 API 服务
 * - SendGrid: Twilio 旗下服务
 * - Amazon SES: AWS 邮件服务
 * - Postmark: 事务性邮件专家
 * - Resend: 新一代开发者友好服务
 * - SparkPost: 企业级邮件平台
 */

export { SmtpProvider } from './smtp.provider';
export { MailgunProvider } from './mailgun.provider';
export { SendGridProvider } from './sendgrid.provider';
export { SESProvider } from './ses.provider';
export { PostmarkProvider } from './postmark.provider';
export { ResendProvider } from './resend.provider';
export { SparkPostProvider } from './sparkpost.provider';

/**
 * 邮件提供商类型映射
 */
export const EMAIL_PROVIDER_TYPES = {
  smtp: 'SmtpProvider',
  mailgun: 'MailgunProvider',
  sendgrid: 'SendGridProvider',
  ses: 'SESProvider',
  postmark: 'PostmarkProvider',
  resend: 'ResendProvider',
  sparkpost: 'SparkPostProvider',
} as const;

export type EmailProviderType = keyof typeof EMAIL_PROVIDER_TYPES;
