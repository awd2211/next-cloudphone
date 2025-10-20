import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';

export interface SendEmailDto {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  templateData?: Record<string, any>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('EMAIL_HOST', 'smtp.gmail.com'),
      port: this.configService.get('EMAIL_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASSWORD'),
      },
    });
  }

  async sendEmail(dto: SendEmailDto): Promise<boolean> {
    try {
      let htmlContent = dto.html;

      // 如果提供了模板，使用 Handlebars 渲染
      if (dto.template && dto.templateData) {
        const template = Handlebars.compile(dto.template);
        htmlContent = template(dto.templateData);
      }

      await this.transporter.sendMail({
        from: this.configService.get('EMAIL_FROM', 'noreply@cloudphone.com'),
        to: Array.isArray(dto.to) ? dto.to.join(', ') : dto.to,
        subject: dto.subject,
        text: dto.text,
        html: htmlContent,
      });

      this.logger.log(`Email sent successfully to ${dto.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      return false;
    }
  }

  // 预定义模板
  async sendTicketReplyNotification(
    email: string,
    data: { userName: string; ticketNumber: string; replyContent: string },
  ): Promise<boolean> {
    const template = `
      <h2>您的工单有新回复</h2>
      <p>您好 {{userName}}，</p>
      <p>您的工单 <strong>{{ticketNumber}}</strong> 有新的回复：</p>
      <blockquote>{{replyContent}}</blockquote>
      <p>请<a href="https://cloudphone.com/tickets/{{ticketNumber}}">点击这里</a>查看详情。</p>
    `;

    return this.sendEmail({
      to: email,
      subject: `工单 ${data.ticketNumber} 有新回复`,
      template,
      templateData: data,
    });
  }

  async sendBalanceLowNotification(
    email: string,
    data: { userName: string; balance: number; threshold: number },
  ): Promise<boolean> {
    const template = `
      <h2>余额不足提醒</h2>
      <p>您好 {{userName}}，</p>
      <p>您的账户余额已不足：</p>
      <ul>
        <li>当前余额：<strong>¥{{balance}}</strong></li>
        <li>预警阈值：¥{{threshold}}</li>
      </ul>
      <p>请<a href="https://cloudphone.com/billing/recharge">点击这里</a>充值。</p>
    `;

    return this.sendEmail({
      to: email,
      subject: '余额不足提醒',
      template,
      templateData: data,
    });
  }

  async sendInvoiceNotification(
    email: string,
    data: { userName: string; invoiceNumber: string; amount: number; dueDate: string },
  ): Promise<boolean> {
    const template = `
      <h2>新账单通知</h2>
      <p>您好 {{userName}}，</p>
      <p>您有一份新的账单：</p>
      <ul>
        <li>账单编号：<strong>{{invoiceNumber}}</strong></li>
        <li>金额：¥{{amount}}</li>
        <li>到期日：{{dueDate}}</li>
      </ul>
      <p>请<a href="https://cloudphone.com/billing/invoices/{{invoiceNumber}}">点击这里</a>查看并支付。</p>
    `;

    return this.sendEmail({
      to: email,
      subject: `新账单 ${data.invoiceNumber}`,
      template,
      templateData: data,
    });
  }
}
