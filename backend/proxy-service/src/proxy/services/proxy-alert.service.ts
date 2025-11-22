import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import {
  ProxyAlertChannel,
  ProxyAlertRule,
  ProxyAlertHistory,
} from '../entities';
import { EventBusService } from '@cloudphone/shared';

/**
 * 代理告警管理服务
 *
 * 功能：
 * 1. 告警通道管理（Email, SMS, Webhook, DingTalk, WeChat, Slack）
 * 2. 告警规则配置
 * 3. 告警历史记录和查询
 * 4. 告警统计分析
 */
@Injectable()
export class ProxyAlertService {
  private readonly logger = new Logger(ProxyAlertService.name);

  private emailTransporter: nodemailer.Transporter | null = null;

  constructor(
    @InjectRepository(ProxyAlertChannel)
    private channelRepo: Repository<ProxyAlertChannel>,
    @InjectRepository(ProxyAlertRule)
    private ruleRepo: Repository<ProxyAlertRule>,
    @InjectRepository(ProxyAlertHistory)
    private historyRepo: Repository<ProxyAlertHistory>,
    private configService: ConfigService,
    private eventBusService: EventBusService,
  ) {
    this.initializeEmailTransporter();
  }

  /**
   * 初始化邮件传输器
   */
  private initializeEmailTransporter(): void {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (smtpHost && smtpUser && smtpPass) {
      this.emailTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.logger.log('Email transporter initialized');
    } else {
      this.logger.warn('SMTP configuration incomplete, email alerts disabled');
    }
  }

  // ==================== 告警通道管理 ====================

  /**
   * 创建告警通道
   */
  async createChannel(params: {
    userId: string;
    channelName: string;
    channelType: string;
    isActive?: boolean;
    isDefault?: boolean;
    priority?: number;
    emailAddresses?: string[];
    phoneNumbers?: string[];
    webhookUrl?: string;
    webhookMethod?: string;
    webhookHeaders?: Record<string, string>;
    dingtalkWebhookUrl?: string;
    dingtalkSecret?: string;
    wechatWebhookUrl?: string;
    slackWebhookUrl?: string;
    slackChannel?: string;
    alertLevels: string[];
    maxAlertsPerHour?: number;
  }): Promise<ProxyAlertChannel> {
    const channel = this.channelRepo.create({
      ...params,
      isActive: params.isActive ?? true,
      isDefault: params.isDefault ?? false,
      priority: params.priority ?? 5,
      maxAlertsPerHour: params.maxAlertsPerHour ?? 10,
    });

    await this.channelRepo.save(channel);

    this.logger.log(`Created alert channel: ${channel.channelName} (${channel.channelType})`);

    return channel;
  }

  /**
   * 获取用户的告警通道列表
   */
  async getUserChannels(userId: string): Promise<ProxyAlertChannel[]> {
    return this.channelRepo.find({
      where: { userId },
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * 获取通道详情
   */
  async getChannel(channelId: string): Promise<ProxyAlertChannel> {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException(`Alert channel ${channelId} not found`);
    }

    return channel;
  }

  /**
   * 更新告警通道
   */
  async updateChannel(
    channelId: string,
    updates: Partial<ProxyAlertChannel>,
  ): Promise<ProxyAlertChannel> {
    const channel = await this.getChannel(channelId);

    Object.assign(channel, updates, { updatedAt: new Date() });

    await this.channelRepo.save(channel);

    this.logger.log(`Updated alert channel: ${channel.channelName}`);

    return channel;
  }

  /**
   * 删除告警通道
   */
  async deleteChannel(channelId: string): Promise<void> {
    const channel = await this.getChannel(channelId);

    await this.channelRepo.remove(channel);

    this.logger.log(`Deleted alert channel: ${channel.channelName}`);
  }

  /**
   * 测试告警通道
   */
  async testChannel(channelId: string, testMessage: string): Promise<{
    success: boolean;
    message: string;
    sentAt?: Date;
    error?: string;
  }> {
    const channel = await this.getChannel(channelId);

    if (!channel.isActive) {
      return {
        success: false,
        message: 'Channel is inactive',
      };
    }

    try {
      // 根据通道类型发送通知
      await this.sendNotification(channel, {
        title: '测试告警',
        message: testMessage,
        level: 'info',
        timestamp: new Date().toISOString(),
      });

      const sentAt = new Date();

      // 更新统计
      channel.totalSent += 1;
      channel.successfulSent += 1;
      channel.lastSentAt = sentAt;
      channel.lastSuccessAt = sentAt;
      await this.channelRepo.save(channel);

      return {
        success: true,
        message: `Test alert sent via ${channel.channelType}`,
        sentAt,
      };
    } catch (error) {
      // 更新失败统计
      channel.totalSent += 1;
      channel.failedSent += 1;
      channel.lastFailureAt = new Date();
      channel.lastErrorMessage = error.message;
      await this.channelRepo.save(channel);

      return {
        success: false,
        message: 'Failed to send test alert',
        error: error.message,
      };
    }
  }

  // ==================== 通知发送实现 ====================

  /**
   * 发送通知到指定通道
   */
  async sendNotification(
    channel: ProxyAlertChannel,
    alert: {
      title: string;
      message: string;
      level: string;
      timestamp: string;
      details?: Record<string, any>;
    },
  ): Promise<void> {
    switch (channel.channelType) {
      case 'email':
        await this.sendEmailNotification(channel, alert);
        break;
      case 'sms':
        await this.sendSmsNotification(channel, alert);
        break;
      case 'webhook':
        await this.sendWebhookNotification(channel, alert);
        break;
      case 'dingtalk':
        await this.sendDingTalkNotification(channel, alert);
        break;
      case 'wechat':
        await this.sendWeChatNotification(channel, alert);
        break;
      case 'slack':
        await this.sendSlackNotification(channel, alert);
        break;
      default:
        throw new Error(`Unsupported channel type: ${channel.channelType}`);
    }
  }

  /**
   * 发送邮件通知
   */
  private async sendEmailNotification(
    channel: ProxyAlertChannel,
    alert: { title: string; message: string; level: string; timestamp: string },
  ): Promise<void> {
    if (!this.emailTransporter) {
      throw new Error('Email transporter not configured');
    }

    if (!channel.emailAddresses || channel.emailAddresses.length === 0) {
      throw new Error('No email addresses configured for this channel');
    }

    const levelEmoji = this.getLevelEmoji(alert.level);
    const smtpFrom = this.configService.get<string>('SMTP_FROM', 'noreply@cloudphone.run');

    await this.emailTransporter.sendMail({
      from: smtpFrom,
      to: channel.emailAddresses.join(','),
      subject: `${levelEmoji} [代理告警] ${alert.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${this.getLevelColor(alert.level)}; color: white; padding: 15px; border-radius: 5px 5px 0 0;">
            <h2 style="margin: 0;">${levelEmoji} ${alert.title}</h2>
          </div>
          <div style="border: 1px solid #ddd; border-top: none; padding: 20px; border-radius: 0 0 5px 5px;">
            <p style="font-size: 16px; line-height: 1.6;">${alert.message}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              告警时间: ${alert.timestamp}<br>
              告警级别: ${alert.level.toUpperCase()}<br>
              通道名称: ${channel.channelName}
            </p>
          </div>
        </div>
      `,
    });

    this.logger.log(`Email notification sent to ${channel.emailAddresses.length} recipients`);
  }

  /**
   * 发送短信通知（需要集成短信服务）
   */
  private async sendSmsNotification(
    channel: ProxyAlertChannel,
    alert: { title: string; message: string; level: string },
  ): Promise<void> {
    if (!channel.phoneNumbers || channel.phoneNumbers.length === 0) {
      throw new Error('No phone numbers configured for this channel');
    }

    // 通过 HTTP 调用 SMS 服务
    const smsServiceUrl = this.configService.get<string>('SMS_SERVICE_URL', 'http://localhost:30008');

    for (const phone of channel.phoneNumbers) {
      try {
        const response = await fetch(`${smsServiceUrl}/sms/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: phone,
            message: `[${alert.level.toUpperCase()}] ${alert.title}: ${alert.message}`,
            type: 'alert',
          }),
        });

        if (!response.ok) {
          this.logger.warn(`Failed to send SMS to ${phone}: ${response.statusText}`);
        }
      } catch (error) {
        this.logger.warn(`SMS send error for ${phone}: ${error.message}`);
      }
    }

    this.logger.log(`SMS notification sent to ${channel.phoneNumbers.length} numbers`);
  }

  /**
   * 发送 Webhook 通知
   */
  private async sendWebhookNotification(
    channel: ProxyAlertChannel,
    alert: { title: string; message: string; level: string; timestamp: string; details?: Record<string, any> },
  ): Promise<void> {
    if (!channel.webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      event: 'proxy_alert',
      timestamp: alert.timestamp,
      alert: {
        title: alert.title,
        message: alert.message,
        level: alert.level,
        details: alert.details || {},
      },
      channel: {
        id: channel.id,
        name: channel.channelName,
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(channel.webhookHeaders || {}),
    };

    const response = await fetch(channel.webhookUrl, {
      method: channel.webhookMethod || 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
    }

    this.logger.log(`Webhook notification sent to ${channel.webhookUrl}`);
  }

  /**
   * 发送钉钉通知
   */
  private async sendDingTalkNotification(
    channel: ProxyAlertChannel,
    alert: { title: string; message: string; level: string; timestamp: string },
  ): Promise<void> {
    if (!channel.dingtalkWebhookUrl) {
      throw new Error('DingTalk webhook URL not configured');
    }

    let url = channel.dingtalkWebhookUrl;

    // 如果配置了签名，生成签名
    if (channel.dingtalkSecret) {
      const timestamp = Date.now();
      const stringToSign = `${timestamp}\n${channel.dingtalkSecret}`;
      const sign = crypto
        .createHmac('sha256', channel.dingtalkSecret)
        .update(stringToSign)
        .digest('base64');
      url += `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
    }

    const levelEmoji = this.getLevelEmoji(alert.level);
    const payload = {
      msgtype: 'markdown',
      markdown: {
        title: `${levelEmoji} ${alert.title}`,
        text: `### ${levelEmoji} ${alert.title}\n\n` +
          `**告警级别**: ${alert.level.toUpperCase()}\n\n` +
          `**告警时间**: ${alert.timestamp}\n\n` +
          `**告警内容**: ${alert.message}\n\n` +
          `---\n` +
          `通道: ${channel.channelName}`,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DingTalk request failed: ${errorText}`);
    }

    const result = await response.json();
    if (result.errcode !== 0) {
      throw new Error(`DingTalk error: ${result.errmsg}`);
    }

    this.logger.log('DingTalk notification sent');
  }

  /**
   * 发送企业微信通知
   */
  private async sendWeChatNotification(
    channel: ProxyAlertChannel,
    alert: { title: string; message: string; level: string; timestamp: string },
  ): Promise<void> {
    if (!channel.wechatWebhookUrl) {
      throw new Error('WeChat webhook URL not configured');
    }

    const levelEmoji = this.getLevelEmoji(alert.level);
    const payload = {
      msgtype: 'markdown',
      markdown: {
        content: `### ${levelEmoji} ${alert.title}\n` +
          `> 告警级别: <font color="${this.getLevelHexColor(alert.level)}">${alert.level.toUpperCase()}</font>\n` +
          `> 告警时间: ${alert.timestamp}\n\n` +
          `${alert.message}\n\n` +
          `---\n` +
          `通道: ${channel.channelName}`,
      },
    };

    const response = await fetch(channel.wechatWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`WeChat request failed: ${response.status}`);
    }

    const result = await response.json();
    if (result.errcode !== 0) {
      throw new Error(`WeChat error: ${result.errmsg}`);
    }

    this.logger.log('WeChat notification sent');
  }

  /**
   * 发送 Slack 通知
   */
  private async sendSlackNotification(
    channel: ProxyAlertChannel,
    alert: { title: string; message: string; level: string; timestamp: string },
  ): Promise<void> {
    if (!channel.slackWebhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const levelEmoji = this.getLevelEmoji(alert.level);
    const payload = {
      channel: channel.slackChannel || undefined,
      attachments: [
        {
          color: this.getLevelHexColor(alert.level),
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${levelEmoji} ${alert.title}`,
                emoji: true,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: alert.message,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `*Level:* ${alert.level.toUpperCase()} | *Time:* ${alert.timestamp} | *Channel:* ${channel.channelName}`,
                },
              ],
            },
          ],
        },
      ],
    };

    const response = await fetch(channel.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack request failed: ${response.status}`);
    }

    this.logger.log('Slack notification sent');
  }

  /**
   * 批量发送告警到多个通道
   */
  async sendAlertToChannels(
    channelIds: string[],
    alert: {
      title: string;
      message: string;
      level: string;
      timestamp: string;
      details?: Record<string, any>;
    },
  ): Promise<{ channelId: string; success: boolean; error?: string }[]> {
    const results: { channelId: string; success: boolean; error?: string }[] = [];

    for (const channelId of channelIds) {
      try {
        const channel = await this.getChannel(channelId);

        if (!channel.isActive) {
          results.push({ channelId, success: false, error: 'Channel is inactive' });
          continue;
        }

        // 检查告警级别是否在通道配置的级别范围内
        if (!channel.alertLevels.includes(alert.level)) {
          results.push({ channelId, success: false, error: `Alert level ${alert.level} not in channel config` });
          continue;
        }

        await this.sendNotification(channel, alert);

        // 更新成功统计
        channel.totalSent += 1;
        channel.successfulSent += 1;
        channel.lastSentAt = new Date();
        channel.lastSuccessAt = new Date();
        await this.channelRepo.save(channel);

        results.push({ channelId, success: true });
      } catch (error) {
        // 更新失败统计
        try {
          const channel = await this.channelRepo.findOne({ where: { id: channelId } });
          if (channel) {
            channel.totalSent += 1;
            channel.failedSent += 1;
            channel.lastFailureAt = new Date();
            channel.lastErrorMessage = error.message;
            await this.channelRepo.save(channel);
          }
        } catch {
          // 忽略统计更新失败
        }

        results.push({ channelId, success: false, error: error.message });
      }
    }

    return results;
  }

  // ==================== 辅助方法 ====================

  /**
   * 获取级别对应的 emoji
   */
  private getLevelEmoji(level: string): string {
    const emojiMap: Record<string, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨',
    };
    return emojiMap[level.toLowerCase()] || 'ℹ️';
  }

  /**
   * 获取级别对应的颜色（用于邮件背景）
   */
  private getLevelColor(level: string): string {
    const colorMap: Record<string, string> = {
      info: '#2196F3',
      warning: '#FF9800',
      error: '#F44336',
      critical: '#9C27B0',
    };
    return colorMap[level.toLowerCase()] || '#2196F3';
  }

  /**
   * 获取级别对应的十六进制颜色
   */
  private getLevelHexColor(level: string): string {
    const colorMap: Record<string, string> = {
      info: '#2196F3',
      warning: '#ffa500',
      error: '#ff0000',
      critical: '#800080',
    };
    return colorMap[level.toLowerCase()] || '#2196F3';
  }

  // ==================== 告警规则管理 ====================

  /**
   * 创建告警规则
   */
  async createRule(params: {
    userId: string;
    deviceId?: string;
    ruleName: string;
    description?: string;
    ruleType: string;
    isEnabled?: boolean;
    priority?: number;
    monitorScope: string;
    monitorTargets?: string[];
    conditionType: string;
    metricName: string;
    operator: string;
    thresholdValue?: number;
    evaluationWindow?: number;
    alertLevel: string;
    notificationChannels: string[];
    autoActionEnabled?: boolean;
    autoActionType?: string;
    cooldownPeriod?: number;
  }): Promise<ProxyAlertRule> {
    const rule = this.ruleRepo.create({
      ...params,
      isEnabled: params.isEnabled ?? true,
      priority: params.priority ?? 5,
      evaluationWindow: params.evaluationWindow ?? 300,
      autoActionEnabled: params.autoActionEnabled ?? false,
      cooldownPeriod: params.cooldownPeriod ?? 600,
    });

    await this.ruleRepo.save(rule);

    this.logger.log(`Created alert rule: ${rule.ruleName} (${rule.ruleType})`);

    return rule;
  }

  /**
   * 获取用户的告警规则列表
   */
  async getUserRules(userId: string): Promise<ProxyAlertRule[]> {
    return this.ruleRepo.find({
      where: { userId },
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * 获取启用的告警规则
   */
  async getActiveRules(userId: string): Promise<ProxyAlertRule[]> {
    return this.ruleRepo.find({
      where: {
        userId,
        isEnabled: true,
      },
      order: { priority: 'DESC' },
    });
  }

  /**
   * 获取规则详情
   */
  async getRule(ruleId: string): Promise<ProxyAlertRule> {
    const rule = await this.ruleRepo.findOne({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException(`Alert rule ${ruleId} not found`);
    }

    return rule;
  }

  /**
   * 更新告警规则
   */
  async updateRule(
    ruleId: string,
    updates: Partial<ProxyAlertRule>,
  ): Promise<ProxyAlertRule> {
    const rule = await this.getRule(ruleId);

    Object.assign(rule, updates, { updatedAt: new Date() });

    await this.ruleRepo.save(rule);

    this.logger.log(`Updated alert rule: ${rule.ruleName}`);

    return rule;
  }

  /**
   * 删除告警规则
   */
  async deleteRule(ruleId: string): Promise<void> {
    const rule = await this.getRule(ruleId);

    await this.ruleRepo.remove(rule);

    this.logger.log(`Deleted alert rule: ${rule.ruleName}`);
  }

  // ==================== 告警历史管理 ====================

  /**
   * 创建告警历史记录
   */
  async createAlertHistory(params: {
    ruleId: string;
    userId: string;
    deviceId?: string;
    ruleName: string;
    ruleType: string;
    alertLevel: string;
    alertTitle: string;
    alertMessage: string;
    triggerMetric: string;
    triggerValue: number;
    thresholdValue: number;
    notificationChannels: string[];
  }): Promise<ProxyAlertHistory> {
    const alert = this.historyRepo.create({
      ...params,
      status: 'active',
      triggeredAt: new Date(),
    });

    await this.historyRepo.save(alert);

    // 发布代理告警事件
    await this.eventBusService.publishProxyEvent('alert_triggered', {
      alertId: alert.id,
      userId: alert.userId,
      deviceId: alert.deviceId,
      ruleId: alert.ruleId,
      ruleName: alert.ruleName,
      alertLevel: alert.alertLevel,
      alertTitle: alert.alertTitle,
      alertMessage: alert.alertMessage,
      triggerMetric: alert.triggerMetric,
      triggerValue: alert.triggerValue,
      thresholdValue: alert.thresholdValue,
    });

    this.logger.log(`Created alert history: ${alert.alertTitle}`);

    return alert;
  }

  /**
   * 获取告警历史列表
   */
  async getAlertHistory(params: {
    userId: string;
    deviceId?: string;
    ruleId?: string;
    status?: string[];
    alertLevel?: string[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ProxyAlertHistory[]> {
    const where: any = { userId: params.userId };

    if (params.deviceId) {
      where.deviceId = params.deviceId;
    }

    if (params.ruleId) {
      where.ruleId = params.ruleId;
    }

    if (params.status && params.status.length > 0) {
      where.status = In(params.status);
    }

    if (params.alertLevel && params.alertLevel.length > 0) {
      where.alertLevel = In(params.alertLevel);
    }

    if (params.startDate && params.endDate) {
      where.triggeredAt = Between(params.startDate, params.endDate);
    }

    return this.historyRepo.find({
      where,
      order: { triggeredAt: 'DESC' },
      take: params.limit || 100,
    });
  }

  /**
   * 确认告警
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string, note?: string): Promise<ProxyAlertHistory> {
    const alert = await this.historyRepo.findOne({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    alert.isAcknowledged = true;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgementNote = note || '';

    await this.historyRepo.save(alert);

    this.logger.log(`Alert acknowledged: ${alert.alertTitle}`);

    return alert;
  }

  /**
   * 解决告警
   */
  async resolveAlert(alertId: string, resolvedBy: string, resolutionNote: string): Promise<ProxyAlertHistory> {
    const alert = await this.historyRepo.findOne({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    const resolvedAt = new Date();
    const duration = Math.floor((resolvedAt.getTime() - alert.triggeredAt.getTime()) / 1000);

    alert.isResolved = true;
    alert.resolvedAt = resolvedAt;
    alert.resolvedBy = resolvedBy;
    alert.resolutionNote = resolutionNote;
    alert.resolutionDuration = duration;
    alert.status = 'resolved';

    await this.historyRepo.save(alert);

    // 发布告警解决事件
    await this.eventBusService.publishProxyEvent('alert_resolved', {
      alertId: alert.id,
      userId: alert.userId,
      alertTitle: alert.alertTitle,
      resolvedBy,
      resolutionDuration: duration,
    });

    this.logger.log(`Alert resolved: ${alert.alertTitle} (${duration}s)`);

    return alert;
  }

  /**
   * 获取告警统计
   */
  async getAlertStatistics(userId: string, days: number = 7): Promise<{
    totalAlerts: number;
    activeAlerts: number;
    acknowledgedAlerts: number;
    resolvedAlerts: number;
    levelDistribution: Record<string, number>;
    avgResolutionTime: number;
    recentTrend: Array<{ date: string; count: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const alerts = await this.historyRepo.find({
      where: {
        userId,
        triggeredAt: Between(startDate, new Date()),
      },
    });

    const activeAlerts = alerts.filter((a) => a.status === 'active').length;
    const acknowledgedAlerts = alerts.filter((a) => a.isAcknowledged).length;
    const resolvedAlerts = alerts.filter((a) => a.isResolved).length;

    // 级别分布
    const levelDistribution = alerts.reduce((acc, alert) => {
      acc[alert.alertLevel] = (acc[alert.alertLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 平均解决时间
    const resolvedWithDuration = alerts.filter((a) => a.resolutionDuration > 0);
    const avgResolutionTime = resolvedWithDuration.length > 0
      ? resolvedWithDuration.reduce((sum, a) => sum + a.resolutionDuration, 0) / resolvedWithDuration.length
      : 0;

    // 趋势分析
    const trendMap = new Map<string, number>();
    alerts.forEach((alert) => {
      const date = alert.triggeredAt.toISOString().split('T')[0];
      trendMap.set(date, (trendMap.get(date) || 0) + 1);
    });

    const recentTrend = Array.from(trendMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalAlerts: alerts.length,
      activeAlerts,
      acknowledgedAlerts,
      resolvedAlerts,
      levelDistribution,
      avgResolutionTime,
      recentTrend,
    };
  }
}
