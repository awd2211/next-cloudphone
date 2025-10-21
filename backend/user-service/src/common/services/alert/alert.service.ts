import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 告警级别
 */
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * 告警消息接口
 */
export interface AlertMessage {
  level: AlertLevel;
  title: string;
  content: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

/**
 * 告警服务
 *
 * 支持多种告警渠道：
 * - 邮件
 * - 短信
 * - 钉钉机器人
 * - 企业微信
 * - Slack
 * - Telegram
 *
 * 环境变量配置：
 * - ALERT_ENABLED: 是否启用告警（默认: true）
 * - ALERT_CHANNELS: 告警渠道（逗号分隔，如: email,dingtalk）
 * - DINGTALK_WEBHOOK_URL: 钉钉机器人 Webhook
 * - DINGTALK_SECRET: 钉钉机器人密钥
 * - WECHAT_WEBHOOK_URL: 企业微信机器人 Webhook
 * - SLACK_WEBHOOK_URL: Slack Webhook
 */
@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  private readonly enabled: boolean;
  private readonly channels: string[];

  constructor(private configService: ConfigService) {
    this.enabled = this.configService.get<string>('ALERT_ENABLED', 'true') === 'true';
    this.channels = (this.configService.get<string>('ALERT_CHANNELS', 'email,dingtalk') || '')
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c);

    if (this.enabled) {
      this.logger.log(`告警服务已启用，渠道: ${this.channels.join(', ')}`);
    } else {
      this.logger.warn('告警服务已禁用');
    }
  }

  /**
   * 发送告警
   */
  async sendAlert(message: AlertMessage): Promise<void> {
    if (!this.enabled) {
      this.logger.debug('告警已禁用，跳过发送');
      return;
    }

    // 添加时间戳
    const alertMessage: AlertMessage = {
      ...message,
      timestamp: message.timestamp || new Date(),
    };

    // 记录告警
    this.logger.log({
      type: 'alert_sent',
      ...alertMessage,
    });

    // 并发发送到所有渠道
    const promises = this.channels.map((channel) =>
      this.sendToChannel(channel, alertMessage).catch((error) => {
        this.logger.error(`发送告警到 ${channel} 失败: ${error.message}`);
      }),
    );

    await Promise.allSettled(promises);
  }

  /**
   * 发送到指定渠道
   */
  private async sendToChannel(channel: string, message: AlertMessage): Promise<void> {
    switch (channel.toLowerCase()) {
      case 'email':
        await this.sendToEmail(message);
        break;
      case 'dingtalk':
        await this.sendToDingTalk(message);
        break;
      case 'wechat':
        await this.sendToWeChat(message);
        break;
      case 'slack':
        await this.sendToSlack(message);
        break;
      default:
        this.logger.warn(`未知的告警渠道: ${channel}`);
    }
  }

  /**
   * 发送邮件告警
   *
   * 生产环境集成示例（使用邮件队列服务）：
   * ```typescript
   * // 注入 EmailQueueService（在 src/queues/queue.service.ts）
   * constructor(private readonly emailQueue: EmailQueueService) {}
   *
   * // 发送告警邮件
   * const recipients = this.configService.get('ALERT_EMAIL_RECIPIENTS', '').split(',');
   * await this.emailQueue.sendEmail({
   *   to: recipients,
   *   subject: `[${message.level.toUpperCase()}] ${message.title}`,
   *   html: this.formatEmailContent(message),
   * });
   * ```
   */
  private async sendToEmail(message: AlertMessage): Promise<void> {
    // 当前为开发环境日志输出
    this.logger.debug(`[Email] ${message.title}: ${message.content}`);
  }

  /**
   * 发送钉钉告警
   */
  private async sendToDingTalk(message: AlertMessage): Promise<void> {
    const webhookUrl = this.configService.get<string>('DINGTALK_WEBHOOK_URL');
    if (!webhookUrl) {
      this.logger.warn('钉钉 Webhook URL 未配置');
      return;
    }

    const levelEmoji = this.getLevelEmoji(message.level);
    const markdown = this.formatDingTalkMarkdown(message, levelEmoji);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msgtype: 'markdown',
          markdown: {
            title: message.title,
            text: markdown,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.logger.log(`钉钉告警已发送: ${message.title}`);
    } catch (error) {
      this.logger.error(`钉钉告警发送失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 发送企业微信告警
   */
  private async sendToWeChat(message: AlertMessage): Promise<void> {
    const webhookUrl = this.configService.get<string>('WECHAT_WEBHOOK_URL');
    if (!webhookUrl) {
      this.logger.warn('企业微信 Webhook URL 未配置');
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msgtype: 'markdown',
          markdown: {
            content: this.formatWeChatMarkdown(message),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.logger.log(`企业微信告警已发送: ${message.title}`);
    } catch (error) {
      this.logger.error(`企业微信告警发送失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 发送 Slack 告警
   */
  private async sendToSlack(message: AlertMessage): Promise<void> {
    const webhookUrl = this.configService.get<string>('SLACK_WEBHOOK_URL');
    if (!webhookUrl) {
      this.logger.warn('Slack Webhook URL 未配置');
      return;
    }

    const color = this.getLevelColor(message.level);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachments: [
            {
              color,
              title: message.title,
              text: message.content,
              timestamp: Math.floor((message.timestamp?.getTime() || Date.now()) / 1000),
              fields: this.formatSlackFields(message.metadata),
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.logger.log(`Slack 告警已发送: ${message.title}`);
    } catch (error) {
      this.logger.error(`Slack 告警发送失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 格式化钉钉 Markdown
   */
  private formatDingTalkMarkdown(message: AlertMessage, emoji: string): string {
    let markdown = `### ${emoji} ${message.title}\n\n`;
    markdown += `> ${message.content}\n\n`;
    markdown += `**级别**: ${message.level.toUpperCase()}\n\n`;
    markdown += `**时间**: ${message.timestamp?.toLocaleString('zh-CN')}\n\n`;

    if (message.metadata && Object.keys(message.metadata).length > 0) {
      markdown += `**详细信息**:\n\n`;
      for (const [key, value] of Object.entries(message.metadata)) {
        markdown += `- **${key}**: ${value}\n`;
      }
    }

    return markdown;
  }

  /**
   * 格式化企业微信 Markdown
   */
  private formatWeChatMarkdown(message: AlertMessage): string {
    let markdown = `## ${message.title}\n`;
    markdown += `> ${message.content}\n`;
    markdown += `> 级别: <font color="warning">${message.level.toUpperCase()}</font>\n`;
    markdown += `> 时间: ${message.timestamp?.toLocaleString('zh-CN')}`;
    return markdown;
  }

  /**
   * 格式化 Slack 字段
   */
  private formatSlackFields(metadata?: Record<string, any>): Array<{ title: string; value: string; short: boolean }> {
    if (!metadata) return [];

    return Object.entries(metadata).map(([key, value]) => ({
      title: key,
      value: String(value),
      short: true,
    }));
  }

  /**
   * 获取级别对应的 Emoji
   */
  private getLevelEmoji(level: AlertLevel): string {
    switch (level) {
      case AlertLevel.INFO:
        return 'ℹ️';
      case AlertLevel.WARNING:
        return '⚠️';
      case AlertLevel.ERROR:
        return '❌';
      case AlertLevel.CRITICAL:
        return '🚨';
      default:
        return '📢';
    }
  }

  /**
   * 获取级别对应的颜色（Slack）
   */
  private getLevelColor(level: AlertLevel): string {
    switch (level) {
      case AlertLevel.INFO:
        return '#36a64f'; // 绿色
      case AlertLevel.WARNING:
        return '#ff9900'; // 橙色
      case AlertLevel.ERROR:
        return '#ff0000'; // 红色
      case AlertLevel.CRITICAL:
        return '#8b0000'; // 深红色
      default:
        return '#808080'; // 灰色
    }
  }
}
