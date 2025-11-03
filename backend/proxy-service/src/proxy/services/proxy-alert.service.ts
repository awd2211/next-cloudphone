import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import {
  ProxyAlertChannel,
  ProxyAlertRule,
  ProxyAlertHistory,
} from '../entities';

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

  constructor(
    @InjectRepository(ProxyAlertChannel)
    private channelRepo: Repository<ProxyAlertChannel>,
    @InjectRepository(ProxyAlertRule)
    private ruleRepo: Repository<ProxyAlertRule>,
    @InjectRepository(ProxyAlertHistory)
    private historyRepo: Repository<ProxyAlertHistory>,
  ) {}

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
      // TODO: 实现实际的通知发送逻辑
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
