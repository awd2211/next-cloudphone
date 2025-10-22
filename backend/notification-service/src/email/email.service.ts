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

  /**
   * 发送欢迎邮件
   */
  async sendWelcomeEmail(userEmail: string, username: string) {
    const template = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">欢迎加入云手机平台</h2>
        <p>您好，<strong>{{username}}</strong>！</p>
        <p>感谢您注册云手机平台，我们为您提供专业的云手机托管服务。</p>
        <p>您现在可以：</p>
        <ul>
          <li>创建和管理云手机设备</li>
          <li>安装和运行应用程序</li>
          <li>查看使用统计和账单</li>
        </ul>
        <a href="http://localhost:5173"
           style="display: inline-block; padding: 10px 20px; background: #1890ff; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px;">
          立即开始
        </a>
      </div>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: '欢迎加入云手机平台',
      template,
      context: { username },
    });
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordResetEmail(userEmail: string, resetToken: string, expiresAt: string) {
    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
    const template = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">密码重置请求</h2>
        <p>我们收到了您的密码重置请求。</p>
        <p>请点击下方按钮重置密码（有效期至 {{expiresAt}}）：</p>
        <a href="{{resetLink}}"
           style="display: inline-block; padding: 10px 20px; background: #1890ff; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px;">
          重置密码
        </a>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          如果您没有请求重置密码，请忽略此邮件。
        </p>
      </div>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: '密码重置请求',
      template,
      context: { resetLink, expiresAt },
    });
  }

  /**
   * 发送密码变更通知
   */
  async sendPasswordChangedNotification(userEmail: string, username: string, changedAt: string) {
    const template = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">密码已更改</h2>
        <p>您好，<strong>{{username}}</strong>！</p>
        <p>您的账户密码已于 {{changedAt}} 成功更改。</p>
        <p style="color: #ff4d4f;">如果这不是您本人的操作，请立即联系客服。</p>
        <a href="http://localhost:5173/support"
           style="display: inline-block; padding: 10px 20px; background: #ff4d4f; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px;">
          联系客服
        </a>
      </div>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: '密码已更改通知',
      template,
      context: { username, changedAt },
    });
  }

  /**
   * 发送设备到期提醒邮件
   */
  async sendDeviceExpirationWarning(
    userEmail: string,
    deviceName: string,
    expiresAt: Date,
    daysRemaining: number,
  ) {
    const expiresAtStr = new Date(expiresAt).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const urgencyColor = daysRemaining <= 3 ? '#ff4d4f' : '#faad14';
    const urgencyText =
      daysRemaining <= 1
        ? '即将到期！'
        : daysRemaining <= 3
          ? '紧急提醒'
          : '到期提醒';

    const template = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: {{urgencyColor}};">设备{{urgencyText}}</h2>
        <p>您的设备 <strong>{{deviceName}}</strong> 将在 <strong style="color: {{urgencyColor}};">{{daysRemaining}} 天</strong>后到期。</p>
        <p>到期时间：<strong>{{expiresAt}}</strong></p>
        <p style="margin-top: 20px;">为避免服务中断和数据丢失，请您：</p>
        <ul>
          <li>及时续费延长使用期限</li>
          <li>或者备份重要数据</li>
        </ul>
        <div style="margin-top: 30px;">
          <a href="http://localhost:5173/devices"
             style="display: inline-block; padding: 10px 20px; background: #1890ff; color: white; text-decoration: none; border-radius: 4px; margin-right: 10px;">
            查看设备
          </a>
          <a href="http://localhost:5173/billing/balance"
             style="display: inline-block; padding: 10px 20px; background: #52c41a; color: white; text-decoration: none; border-radius: 4px;">
            立即续费
          </a>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          此邮件由系统自动发送，请勿回复。
        </p>
      </div>
    `;

    return this.sendEmail({
      to: userEmail,
      subject: `设备到期提醒 - ${deviceName}（剩余${daysRemaining}天）`,
      template,
      context: {
        deviceName,
        expiresAt: expiresAtStr,
        daysRemaining,
        urgencyColor,
        urgencyText,
      },
    });
  }
}

