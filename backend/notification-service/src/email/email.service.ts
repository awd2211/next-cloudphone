import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  context?: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = this.configService.get('SMTP_HOST');
    
    if (!smtpHost) {
      this.logger.warn('SMTP 未配置，邮件功能已禁用');
      this.enabled = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: this.configService.get('SMTP_PORT', 587),
        secure: this.configService.get('SMTP_SECURE', 'false') === 'true',
        auth: {
          user: this.configService.get('SMTP_USER'),
          pass: this.configService.get('SMTP_PASS'),
        },
      });

      this.enabled = true;
      this.logger.log(`邮件服务已初始化: ${smtpHost}`);
    } catch (error) {
      this.logger.error(`邮件服务初始化失败: ${error.message}`);
      this.enabled = false;
    }
  }

  /**
   * 发送邮件
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn('邮件服务未启用，跳过发送');
      return false;
    }

    try {
      // 如果提供了模板，渲染模板
      let html = options.html;
      if (options.template && options.context) {
        html = this.renderTemplate(options.template, options.context);
      }

      const mailOptions = {
        from: this.configService.get('SMTP_FROM', 'Cloud Phone <noreply@cloudphone.com>'),
        to: options.to,
        subject: options.subject,
        text: options.text,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`邮件已发送: ${info.messageId} -> ${options.to}`);

      return true;
    } catch (error) {
      this.logger.error(`邮件发送失败: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 渲染 Handlebars 模板
   */
  private renderTemplate(template: string, context: Record<string, any>): string {
    try {
      const compiledTemplate = Handlebars.compile(template);
      return compiledTemplate(context);
    } catch (error) {
      this.logger.error(`模板渲染失败: ${error.message}`);
      return template;
    }
  }

  /**
   * 发送设备创建通知邮件
   */
  async sendDeviceCreatedEmail(userEmail: string, deviceName: string) {
    const template = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">设备创建成功</h2>
        <p>您的云手机设备 <strong>{{deviceName}}</strong> 已成功创建。</p>
        <p>您现在可以登录管理后台开始使用。</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          此邮件由系统自动发送，请勿回复。
        </p>
      </div>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: '设备创建成功通知',
      template,
      context: { deviceName },
    });
  }

  /**
   * 发送余额不足告警邮件
   */
  async sendLowBalanceAlert(userEmail: string, balance: number) {
    const template = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff4d4f;">余额不足提醒</h2>
        <p>您的账户余额仅剩 <strong style="color: #ff4d4f;">¥{{balance}}</strong>。</p>
        <p>为避免服务中断，请及时充值。</p>
        <a href="http://localhost:5173/billing/balance" 
           style="display: inline-block; padding: 10px 20px; background: #1890ff; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px;">
          立即充值
        </a>
      </div>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: '余额不足提醒',
      template,
      context: { balance: balance.toFixed(2) },
    });
  }
}

