/**
 * SLA 预警服务
 *
 * 功能:
 * - 定时检测 SLA 指标
 * - 触发告警
 * - 发送通知
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService } from '@cloudphone/shared';
import { SlaRule, SlaMetricType, SlaSeverity, SlaActionType } from '../entities/sla-rule.entity';
import { SlaAlert, SlaAlertStatus } from '../entities/sla-alert.entity';
import { Conversation, ConversationStatus } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    @InjectRepository(SlaRule)
    private ruleRepo: Repository<SlaRule>,
    @InjectRepository(SlaAlert)
    private alertRepo: Repository<SlaAlert>,
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    private eventEmitter: EventEmitter2,
    private eventBus: EventBusService,
  ) {}

  // ========== 规则管理 ==========

  async createRule(data: Partial<SlaRule>, tenantId: string): Promise<SlaRule> {
    const rule = this.ruleRepo.create({
      ...data,
      tenantId,
    });
    return this.ruleRepo.save(rule);
  }

  async updateRule(id: string, data: Partial<SlaRule>, tenantId: string): Promise<SlaRule> {
    const rule = await this.ruleRepo.findOne({ where: { id, tenantId } });
    if (!rule) {
      throw new NotFoundException(`SLA 规则 ${id} 不存在`);
    }
    Object.assign(rule, data);
    return this.ruleRepo.save(rule);
  }

  async deleteRule(id: string, tenantId: string): Promise<void> {
    await this.ruleRepo.delete({ id, tenantId });
  }

  async getRules(tenantId: string, isActive?: boolean): Promise<SlaRule[]> {
    const where: any = { tenantId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    return this.ruleRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async getRule(id: string, tenantId: string): Promise<SlaRule> {
    const rule = await this.ruleRepo.findOne({ where: { id, tenantId } });
    if (!rule) {
      throw new NotFoundException(`SLA 规则 ${id} 不存在`);
    }
    return rule;
  }

  // ========== 告警管理 ==========

  async getAlerts(
    tenantId: string,
    params?: {
      status?: SlaAlertStatus;
      severity?: SlaSeverity;
      conversationId?: string;
      limit?: number;
    },
  ): Promise<SlaAlert[]> {
    const where: any = { tenantId };
    if (params?.status) where.status = params.status;
    if (params?.severity) where.severity = params.severity;
    if (params?.conversationId) where.conversationId = params.conversationId;

    return this.alertRepo.find({
      where,
      relations: ['rule'],
      order: { createdAt: 'DESC' },
      take: params?.limit || 100,
    });
  }

  async getActiveAlerts(tenantId: string): Promise<SlaAlert[]> {
    return this.getAlerts(tenantId, { status: SlaAlertStatus.ACTIVE });
  }

  async acknowledgeAlert(id: string, userId: string, tenantId: string): Promise<SlaAlert> {
    const alert = await this.alertRepo.findOne({ where: { id, tenantId } });
    if (!alert) {
      throw new NotFoundException(`告警 ${id} 不存在`);
    }
    alert.status = SlaAlertStatus.ACKNOWLEDGED;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();
    return this.alertRepo.save(alert);
  }

  async resolveAlert(id: string, tenantId: string): Promise<SlaAlert> {
    const alert = await this.alertRepo.findOne({ where: { id, tenantId } });
    if (!alert) {
      throw new NotFoundException(`告警 ${id} 不存在`);
    }
    alert.status = SlaAlertStatus.RESOLVED;
    alert.resolvedAt = new Date();
    return this.alertRepo.save(alert);
  }

  // ========== SLA 检测（定时任务） ==========

  @Cron(CronExpression.EVERY_MINUTE)
  async checkSlaMetrics(): Promise<void> {
    this.logger.debug('Starting SLA metrics check...');

    // 获取所有租户的活跃规则
    const rules = await this.ruleRepo.find({ where: { isActive: true } });

    // 按租户分组
    const rulesByTenant = rules.reduce((acc, rule) => {
      if (!acc[rule.tenantId]) acc[rule.tenantId] = [];
      acc[rule.tenantId].push(rule);
      return acc;
    }, {} as Record<string, SlaRule[]>);

    // 检查每个租户的规则
    for (const [tenantId, tenantRules] of Object.entries(rulesByTenant)) {
      await this.checkTenantSla(tenantId, tenantRules);
    }

    this.logger.debug('SLA metrics check completed');
  }

  private async checkTenantSla(tenantId: string, rules: SlaRule[]): Promise<void> {
    for (const rule of rules) {
      try {
        const metric = await this.calculateMetric(tenantId, rule.metricType);

        // 检查是否违反阈值
        const isViolated = this.isThresholdViolated(metric, rule);

        if (isViolated) {
          // 检查是否已有活跃告警
          const existingAlert = await this.alertRepo.findOne({
            where: {
              ruleId: rule.id,
              tenantId,
              status: SlaAlertStatus.ACTIVE,
            },
          });

          if (!existingAlert) {
            // 创建新告警
            await this.createAlert(tenantId, rule, metric);
          }
        } else {
          // 自动解决之前的告警
          await this.autoResolveAlerts(tenantId, rule.id);
        }
      } catch (error) {
        this.logger.error(`Error checking SLA rule ${rule.id}: ${error.message}`);
      }
    }
  }

  private async calculateMetric(tenantId: string, metricType: SlaMetricType): Promise<number> {
    switch (metricType) {
      case SlaMetricType.WAIT_TIME:
        return this.calculateAverageWaitTime(tenantId);
      case SlaMetricType.QUEUE_LENGTH:
        return this.calculateQueueLength(tenantId);
      case SlaMetricType.FIRST_RESPONSE_TIME:
        return this.calculateAverageFirstResponseTime(tenantId);
      case SlaMetricType.AVERAGE_RESPONSE_TIME:
        return this.calculateAverageResponseTime(tenantId);
      case SlaMetricType.RESOLUTION_TIME:
        return this.calculateAverageResolutionTime(tenantId);
      case SlaMetricType.SATISFACTION_RATE:
        return this.calculateSatisfactionRate(tenantId);
      case SlaMetricType.RESOLUTION_RATE:
        return this.calculateResolutionRate(tenantId);
      default:
        return 0;
    }
  }

  private async calculateAverageWaitTime(tenantId: string): Promise<number> {
    const waitingConversations = await this.conversationRepo.find({
      where: { tenantId, status: ConversationStatus.WAITING },
    });

    if (waitingConversations.length === 0) return 0;

    const now = Date.now();
    const totalWaitTime = waitingConversations.reduce((sum, conv) => {
      return sum + (now - new Date(conv.createdAt).getTime());
    }, 0);

    return totalWaitTime / waitingConversations.length / 1000; // 返回秒
  }

  private async calculateQueueLength(tenantId: string): Promise<number> {
    return this.conversationRepo.count({
      where: { tenantId, status: ConversationStatus.WAITING },
    });
  }

  private async calculateAverageFirstResponseTime(tenantId: string): Promise<number> {
    const result = await this.conversationRepo
      .createQueryBuilder('c')
      .select('AVG(EXTRACT(EPOCH FROM (c.first_response_at - c.created_at)))', 'avg_time')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.first_response_at IS NOT NULL')
      .andWhere('c.created_at > :since', { since: new Date(Date.now() - 24 * 60 * 60 * 1000) })
      .getRawOne();

    return result?.avg_time || 0;
  }

  private async calculateAverageResponseTime(tenantId: string): Promise<number> {
    // 简化计算：基于今天的会话
    return this.calculateAverageFirstResponseTime(tenantId);
  }

  private async calculateAverageResolutionTime(tenantId: string): Promise<number> {
    const result = await this.conversationRepo
      .createQueryBuilder('c')
      .select('AVG(EXTRACT(EPOCH FROM (c.resolved_at - c.created_at)))', 'avg_time')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.resolved_at IS NOT NULL')
      .andWhere('c.created_at > :since', { since: new Date(Date.now() - 24 * 60 * 60 * 1000) })
      .getRawOne();

    return result?.avg_time || 0;
  }

  private async calculateSatisfactionRate(tenantId: string): Promise<number> {
    const result = await this.conversationRepo
      .createQueryBuilder('c')
      .select('AVG(c.rating)', 'avg_rating')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.rating IS NOT NULL')
      .andWhere('c.created_at > :since', { since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) })
      .getRawOne();

    return result?.avg_rating ? (result.avg_rating / 5) * 100 : 0; // 转换为百分比
  }

  private async calculateResolutionRate(tenantId: string): Promise<number> {
    const total = await this.conversationRepo.count({
      where: {
        tenantId,
        status: In([ConversationStatus.RESOLVED, ConversationStatus.CLOSED]),
        createdAt: LessThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      },
    });

    const resolved = await this.conversationRepo.count({
      where: {
        tenantId,
        status: ConversationStatus.RESOLVED,
        createdAt: LessThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      },
    });

    return total > 0 ? (resolved / total) * 100 : 100;
  }

  private isThresholdViolated(value: number, rule: SlaRule): boolean {
    // 对于满意度和解决率，低于阈值是违规
    if (
      rule.metricType === SlaMetricType.SATISFACTION_RATE ||
      rule.metricType === SlaMetricType.RESOLUTION_RATE
    ) {
      return value < Number(rule.threshold);
    }

    // 其他指标，超过阈值是违规
    return value > Number(rule.threshold);
  }

  private async createAlert(tenantId: string, rule: SlaRule, currentValue: number): Promise<SlaAlert> {
    const alert = this.alertRepo.create({
      tenantId,
      ruleId: rule.id,
      metricType: rule.metricType,
      severity: rule.severity,
      currentValue,
      thresholdValue: Number(rule.threshold),
      message: this.generateAlertMessage(rule, currentValue),
      status: SlaAlertStatus.ACTIVE,
    });

    const saved = await this.alertRepo.save(alert);

    // 发送事件
    this.eventEmitter.emit('sla.alert_created', {
      alert: saved,
      rule,
    });

    // 执行告警动作
    await this.executeAlertActions(rule, saved);

    // 发送 RabbitMQ 事件
    await this.eventBus.publish('cloudphone.events', 'livechat.sla_violated', {
      alertId: saved.id,
      ruleId: rule.id,
      metricType: rule.metricType,
      severity: rule.severity,
      currentValue,
      threshold: rule.threshold,
      tenantId,
      createdAt: saved.createdAt,
    });

    this.logger.warn(
      `SLA Alert: ${rule.name} - ${rule.metricType} = ${currentValue} (threshold: ${rule.threshold})`,
    );

    return saved;
  }

  private async autoResolveAlerts(tenantId: string, ruleId: string): Promise<void> {
    await this.alertRepo.update(
      {
        tenantId,
        ruleId,
        status: SlaAlertStatus.ACTIVE,
      },
      {
        status: SlaAlertStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    );
  }

  private generateAlertMessage(rule: SlaRule, currentValue: number): string {
    const metricNames: Record<SlaMetricType, string> = {
      [SlaMetricType.FIRST_RESPONSE_TIME]: '首次响应时间',
      [SlaMetricType.AVERAGE_RESPONSE_TIME]: '平均响应时间',
      [SlaMetricType.RESOLUTION_TIME]: '解决时间',
      [SlaMetricType.WAIT_TIME]: '等待时间',
      [SlaMetricType.QUEUE_LENGTH]: '排队数量',
      [SlaMetricType.SATISFACTION_RATE]: '满意度',
      [SlaMetricType.RESOLUTION_RATE]: '解决率',
    };

    const metricName = metricNames[rule.metricType] || rule.metricType;
    const formattedValue = this.formatMetricValue(currentValue, rule);
    const formattedThreshold = this.formatMetricValue(Number(rule.threshold), rule);

    return `${rule.name}: ${metricName}为 ${formattedValue}，${
      rule.severity === SlaSeverity.CRITICAL ? '严重超过' : '超过'
    }阈值 ${formattedThreshold}`;
  }

  private formatMetricValue(value: number, rule: SlaRule): string {
    switch (rule.thresholdUnit) {
      case 'seconds':
        return `${Math.round(value)}秒`;
      case 'minutes':
        return `${Math.round(value / 60)}分钟`;
      case 'percent':
        return `${value.toFixed(1)}%`;
      case 'count':
        return `${Math.round(value)}个`;
      default:
        return `${value}`;
    }
  }

  private async executeAlertActions(rule: SlaRule, alert: SlaAlert): Promise<void> {
    if (!rule.actions || rule.actions.length === 0) return;

    for (const action of rule.actions) {
      switch (action) {
        case SlaActionType.NOTIFICATION:
          this.eventEmitter.emit('sla.send_notification', {
            alert,
            rule,
            recipients: rule.actionConfig?.notifyRoles || ['supervisor', 'admin'],
          });
          break;
        case SlaActionType.EMAIL:
          this.eventEmitter.emit('sla.send_email', {
            alert,
            rule,
            recipients: rule.actionConfig?.emailRecipients || [],
          });
          break;
        case SlaActionType.ESCALATE:
          this.eventEmitter.emit('sla.escalate', {
            alert,
            rule,
            escalateTo: rule.actionConfig?.escalateTo,
          });
          break;
        default:
          break;
      }
    }
  }

  // ========== 统计方法 ==========

  async getSlaStats(tenantId: string): Promise<{
    activeAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    resolvedToday: number;
    metrics: Record<SlaMetricType, number>;
  }> {
    const [activeAlerts, criticalAlerts, warningAlerts, resolvedToday] = await Promise.all([
      this.alertRepo.count({ where: { tenantId, status: SlaAlertStatus.ACTIVE } }),
      this.alertRepo.count({
        where: { tenantId, status: SlaAlertStatus.ACTIVE, severity: SlaSeverity.CRITICAL },
      }),
      this.alertRepo.count({
        where: { tenantId, status: SlaAlertStatus.ACTIVE, severity: SlaSeverity.WARNING },
      }),
      this.alertRepo.count({
        where: {
          tenantId,
          status: SlaAlertStatus.RESOLVED,
          resolvedAt: LessThan(new Date(Date.now() + 24 * 60 * 60 * 1000)),
        },
      }),
    ]);

    // 获取当前所有指标值
    const metrics: Record<string, number> = {};
    for (const metricType of Object.values(SlaMetricType)) {
      metrics[metricType] = await this.calculateMetric(tenantId, metricType);
    }

    return {
      activeAlerts,
      criticalAlerts,
      warningAlerts,
      resolvedToday,
      metrics: metrics as Record<SlaMetricType, number>,
    };
  }
}
