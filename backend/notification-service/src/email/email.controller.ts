import { Controller, Post, Body, Logger, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MailgunProvider } from './providers/mailgun.provider';
import { SendGridProvider } from './providers/sendgrid.provider';
import { SESProvider } from './providers/ses.provider';
import { PostmarkProvider } from './providers/postmark.provider';
import { ResendProvider } from './providers/resend.provider';
import { SparkPostProvider } from './providers/sparkpost.provider';
import { SmtpProvider } from './providers/smtp.provider';

/**
 * 邮件控制器
 * 提供邮件发送相关的 API
 * 支持多种邮件服务提供商
 */
@Controller('email')
@UseGuards(JwtAuthGuard)
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly mailgunProvider: MailgunProvider,
    private readonly sendGridProvider: SendGridProvider,
    private readonly sesProvider: SESProvider,
    private readonly postmarkProvider: PostmarkProvider,
    private readonly resendProvider: ResendProvider,
    private readonly sparkPostProvider: SparkPostProvider,
    private readonly smtpProvider: SmtpProvider
  ) {}

  /**
   * 发送测试邮件
   * POST /email/test
   */
  @Post('test')
  async sendTestEmail(
    @Body()
    body: {
      testEmail: string;
      emailProvider?: string;
      fromName?: string;
      fromEmail?: string;
      // Mailgun 配置
      mailgunApiKey?: string;
      mailgunDomain?: string;
      mailgunRegion?: string;
      // SendGrid 配置
      sendgridApiKey?: string;
      // SES 配置
      sesRegion?: string;
      sesAccessKeyId?: string;
      sesSecretAccessKey?: string;
      // Postmark 配置
      postmarkServerToken?: string;
      // Resend 配置
      resendApiKey?: string;
      // SparkPost 配置
      sparkpostApiKey?: string;
      sparkpostRegion?: string;
      // SMTP 配置
      smtpHost?: string;
      smtpPort?: number;
      smtpSecure?: boolean;
      smtpUser?: string;
      smtpPassword?: string;
    }
  ) {
    const { testEmail, emailProvider = 'smtp', fromName, fromEmail } = body;

    if (!testEmail) {
      return {
        success: false,
        message: '请提供接收测试邮件的邮箱地址',
      };
    }

    this.logger.log(`Sending test email to ${testEmail} via ${emailProvider}`);

    try {
      const emailOptions = {
        to: testEmail,
        from: fromEmail || `${fromName || '云手机平台'} <noreply@cloudphone.run>`,
        subject: '【云手机平台】测试邮件',
        html: this.generateTestEmailTemplate(fromName || '云手机平台'),
        text: `这是一封来自 ${fromName || '云手机平台'} 的测试邮件。如果您收到此邮件，说明邮件服务配置正确。`,
      };

      let result: { success: boolean; error?: string; messageId?: string };

      // 根据选择的提供商发送邮件
      switch (emailProvider) {
        case 'mailgun':
          if (!body.mailgunApiKey || !body.mailgunDomain) {
            return {
              success: false,
              message: '请提供 Mailgun API Key 和 Domain',
            };
          }
          result = await this.sendViaMailgun(emailOptions, body);
          break;

        case 'sendgrid':
          if (!body.sendgridApiKey) {
            return {
              success: false,
              message: '请提供 SendGrid API Key',
            };
          }
          result = await this.sendViaSendGrid(emailOptions, body);
          break;

        case 'ses':
          if (!body.sesAccessKeyId || !body.sesSecretAccessKey) {
            return {
              success: false,
              message: '请提供 AWS SES Access Key ID 和 Secret Access Key',
            };
          }
          result = await this.sendViaSES(emailOptions, body);
          break;

        case 'postmark':
          if (!body.postmarkServerToken) {
            return {
              success: false,
              message: '请提供 Postmark Server Token',
            };
          }
          result = await this.sendViaPostmark(emailOptions, body);
          break;

        case 'resend':
          if (!body.resendApiKey) {
            return {
              success: false,
              message: '请提供 Resend API Key',
            };
          }
          result = await this.sendViaResend(emailOptions, body);
          break;

        case 'sparkpost':
          if (!body.sparkpostApiKey) {
            return {
              success: false,
              message: '请提供 SparkPost API Key',
            };
          }
          result = await this.sendViaSparkPost(emailOptions, body);
          break;

        case 'smtp':
        default:
          if (!body.smtpHost) {
            return {
              success: false,
              message: '请提供 SMTP 服务器地址',
            };
          }
          result = await this.sendViaSMTP(emailOptions, body);
          break;
      }

      if (result.success) {
        return {
          success: true,
          message: `测试邮件已发送至 ${testEmail}`,
          messageId: result.messageId,
        };
      } else {
        return {
          success: false,
          message: result.error || '邮件发送失败，请检查配置',
        };
      }
    } catch (error: any) {
      this.logger.error(`Failed to send test email: ${error.message}`);
      return {
        success: false,
        message: error.message || '邮件发送失败',
      };
    }
  }

  /**
   * 通过 Mailgun 发送邮件
   */
  private async sendViaMailgun(
    emailOptions: any,
    config: { mailgunApiKey?: string; mailgunDomain?: string; mailgunRegion?: string }
  ) {
    const FormDataModule = await import('form-data');
    const FormData = FormDataModule.default || FormDataModule;
    const axiosModule = await import('axios');
    const axios = axiosModule.default || axiosModule;

    const region = config.mailgunRegion || 'us';
    const baseUrl =
      region === 'eu' ? 'https://api.eu.mailgun.net/v3' : 'https://api.mailgun.net/v3';

    const form = new FormData();
    form.append('from', emailOptions.from);
    form.append('to', emailOptions.to);
    form.append('subject', emailOptions.subject);
    form.append('html', emailOptions.html);
    form.append('text', emailOptions.text);

    try {
      const response = await axios.post(
        `${baseUrl}/${config.mailgunDomain}/messages`,
        form,
        {
          auth: {
            username: 'api',
            password: config.mailgunApiKey!,
          },
          headers: form.getHeaders(),
          timeout: 15000,
        }
      );

      this.logger.log(`Mailgun response: ${JSON.stringify(response.data)}`);
      return {
        success: true,
        messageId: response.data.id,
      };
    } catch (error: any) {
      this.logger.error(`Mailgun error: ${error.response?.data?.message || error.message}`);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * 通过 SendGrid 发送邮件
   */
  private async sendViaSendGrid(emailOptions: any, config: { sendgridApiKey?: string }) {
    const axiosModule = await import('axios');
    const axios = axiosModule.default || axiosModule;

    const mailData = {
      personalizations: [{ to: [{ email: emailOptions.to }] }],
      from: this.parseEmailAddress(emailOptions.from),
      subject: emailOptions.subject,
      content: [
        { type: 'text/plain', value: emailOptions.text },
        { type: 'text/html', value: emailOptions.html },
      ],
    };

    try {
      const response = await axios.post('https://api.sendgrid.com/v3/mail/send', mailData, {
        headers: {
          Authorization: `Bearer ${config.sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      return {
        success: true,
        messageId: response.headers['x-message-id'],
      };
    } catch (error: any) {
      this.logger.error(`SendGrid error: ${error.response?.data?.errors?.[0]?.message || error.message}`);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.message || error.message,
      };
    }
  }

  /**
   * 通过 Amazon SES 发送邮件
   * 注意: 需要安装 @aws-sdk/client-ses 包才能使用此功能
   */
  private async sendViaSES(
    emailOptions: any,
    config: { sesRegion?: string; sesAccessKeyId?: string; sesSecretAccessKey?: string }
  ) {
    // 使用 nodemailer 的 SES transport
    const nodemailer = await import('nodemailer');

    try {
      // 使用 SMTP 方式连接 SES
      const transporter = nodemailer.createTransport({
        host: `email-smtp.${config.sesRegion || 'us-east-1'}.amazonaws.com`,
        port: 587,
        secure: false,
        auth: {
          user: config.sesAccessKeyId,
          pass: config.sesSecretAccessKey,
        },
      });

      const info = await transporter.sendMail({
        from: emailOptions.from,
        to: emailOptions.to,
        subject: emailOptions.subject,
        text: emailOptions.text,
        html: emailOptions.html,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      this.logger.error(`SES error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 通过 Postmark 发送邮件
   */
  private async sendViaPostmark(emailOptions: any, config: { postmarkServerToken?: string }) {
    const axiosModule = await import('axios');
    const axios = axiosModule.default || axiosModule;

    const fromParsed = this.parseEmailAddress(emailOptions.from);

    try {
      const response = await axios.post(
        'https://api.postmarkapp.com/email',
        {
          From: `${fromParsed.name || 'CloudPhone'} <${fromParsed.email}>`,
          To: emailOptions.to,
          Subject: emailOptions.subject,
          TextBody: emailOptions.text,
          HtmlBody: emailOptions.html,
        },
        {
          headers: {
            'X-Postmark-Server-Token': config.postmarkServerToken,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      return {
        success: true,
        messageId: response.data.MessageID,
      };
    } catch (error: any) {
      this.logger.error(`Postmark error: ${error.response?.data?.Message || error.message}`);
      return {
        success: false,
        error: error.response?.data?.Message || error.message,
      };
    }
  }

  /**
   * 通过 Resend 发送邮件
   */
  private async sendViaResend(emailOptions: any, config: { resendApiKey?: string }) {
    const axiosModule = await import('axios');
    const axios = axiosModule.default || axiosModule;

    try {
      const response = await axios.post(
        'https://api.resend.com/emails',
        {
          from: emailOptions.from,
          to: emailOptions.to,
          subject: emailOptions.subject,
          text: emailOptions.text,
          html: emailOptions.html,
        },
        {
          headers: {
            Authorization: `Bearer ${config.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      return {
        success: true,
        messageId: response.data.id,
      };
    } catch (error: any) {
      this.logger.error(`Resend error: ${error.response?.data?.message || error.message}`);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * 通过 SparkPost 发送邮件
   */
  private async sendViaSparkPost(
    emailOptions: any,
    config: { sparkpostApiKey?: string; sparkpostRegion?: string }
  ) {
    const axiosModule = await import('axios');
    const axios = axiosModule.default || axiosModule;

    const region = config.sparkpostRegion || 'us';
    const baseUrl =
      region === 'eu' ? 'https://api.eu.sparkpost.com/api/v1' : 'https://api.sparkpost.com/api/v1';

    const fromParsed = this.parseEmailAddress(emailOptions.from);

    try {
      const response = await axios.post(
        `${baseUrl}/transmissions`,
        {
          recipients: [{ address: { email: emailOptions.to } }],
          content: {
            from: { email: fromParsed.email, name: fromParsed.name || 'CloudPhone' },
            subject: emailOptions.subject,
            text: emailOptions.text,
            html: emailOptions.html,
          },
        },
        {
          headers: {
            Authorization: config.sparkpostApiKey,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      return {
        success: true,
        messageId: response.data.results?.id,
      };
    } catch (error: any) {
      this.logger.error(`SparkPost error: ${error.response?.data?.errors?.[0]?.message || error.message}`);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.message || error.message,
      };
    }
  }

  /**
   * 通过 SMTP 发送邮件
   */
  private async sendViaSMTP(
    emailOptions: any,
    config: {
      smtpHost?: string;
      smtpPort?: number;
      smtpSecure?: boolean;
      smtpUser?: string;
      smtpPassword?: string;
    }
  ) {
    const nodemailer = await import('nodemailer');

    try {
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort || 587,
        secure: config.smtpSecure || false,
        auth:
          config.smtpUser && config.smtpPassword
            ? {
                user: config.smtpUser,
                pass: config.smtpPassword,
              }
            : undefined,
      });

      const info = await transporter.sendMail({
        from: emailOptions.from,
        to: emailOptions.to,
        subject: emailOptions.subject,
        text: emailOptions.text,
        html: emailOptions.html,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      this.logger.error(`SMTP error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 解析邮件地址
   * 支持 "Name <email@domain.com>" 格式
   */
  private parseEmailAddress(address: string): { email: string; name?: string } {
    const match = address.match(/^(.+?)\s*<(.+?)>$/);
    if (match) {
      return {
        name: match[1].trim(),
        email: match[2].trim(),
      };
    }
    return { email: address };
  }

  /**
   * 生成测试邮件模板
   */
  private generateTestEmailTemplate(platformName: string): string {
    const now = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>测试邮件</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                ✉️ 测试邮件
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="background-color: #e6f7ff; border-left: 4px solid #1890ff; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                <p style="margin: 0; color: #096dd9; font-size: 16px;">
                  🎉 <strong>恭喜！</strong> 邮件服务配置正确
                </p>
              </div>

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
                您好！
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
                这是一封来自 <strong>${platformName}</strong> 的测试邮件。
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                如果您收到此邮件，说明您的邮件服务配置已经正确设置，系统可以正常发送通知邮件。
              </p>

              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fafafa; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px; color: #666666; font-size: 14px;">
                      📅 <strong>发送时间：</strong> ${now}
                    </p>
                    <p style="margin: 0; color: #666666; font-size: 14px;">
                      🔧 <strong>服务状态：</strong> <span style="color: #52c41a;">正常运行</span>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color: #999999; font-size: 14px; line-height: 1.6;">
                此邮件由系统自动发送，请勿直接回复。如有问题，请联系管理员。
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f5f5f5; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} ${platformName} - All Rights Reserved
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}
