import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ConsumeMessage } from 'amqplib';
import {
  ProxyCostAlertEvent,
  ProxyUsageStoppedEvent,
  ProxyAlertTriggeredEvent,
  ProxyAlertResolvedEvent,
  NotificationEventTypes,
} from '../../types/events';
import { NotificationsService } from '../../notifications/notifications.service';
import { EmailService } from '../../email/email.service';
import { NotificationGateway } from '../../gateway/notification.gateway';
import { runInTraceContext } from '@cloudphone/shared';

/**
 * Proxy Service 事件消费者
 * 监听代理服务发布的所有事件并发送相应通知
 *
 * ✅ 2025-11-26: 新建 - 之前代理服务事件完全没有消费者
 *   - 处理费用告警事件
 *   - 处理使用停止事件
 *   - 处理告警触发/解除事件
 *   - 集成 WebSocket 实时推送
 */
@Injectable()
export class ProxyEventsConsumer {
  private readonly logger = new Logger(ProxyEventsConsumer.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly gateway: NotificationGateway
  ) {}

  /**
   * 处理代理费用告警事件
   * 当用户代理使用费用接近或超过预算时触发
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.PROXY_COST_ALERT,
    queue: 'notification-service.proxy.cost_alert',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.notifications.dlx',
    },
  })
  async handleProxyCostAlert(event: ProxyCostAlertEvent, msg: ConsumeMessage) {
    return runInTraceContext(event, async () => {
      const { payload } = event;
      this.logger.warn(
        `代理费用告警: 用户 ${payload.userId}, 供应商 ${payload.providerName}, ` +
          `类型 ${payload.alertType}, 当前费用 ¥${payload.currentCost}`
      );

      try {
        // 确定告警严重程度
        const severity = this.getCostAlertSeverity(payload.alertType);
        const alertTitle = this.getCostAlertTitle(payload.alertType);

        // 创建站内通知
        if (payload.userId) {
          await this.notificationsService.createRoleBasedNotification(
            payload.userId,
            payload.userRole || 'user',
            'proxy.cost_alert' as any,
            {
              username: payload.username || '用户',
              providerName: payload.providerName,
              alertType: payload.alertType,
              alertTitle,
              currentCost: payload.currentCost,
              threshold: payload.threshold,
              period: payload.period,
              detectedAt: payload.detectedAt,
            },
            {
              userEmail: payload.userEmail,
            }
          );

          // WebSocket 实时推送给用户
          this.gateway.sendToUser(payload.userId, {
            type: 'proxy.cost_alert',
            severity,
            data: {
              alertTitle,
              providerName: payload.providerName,
              alertType: payload.alertType,
              currentCost: payload.currentCost,
              threshold: payload.threshold,
              period: payload.period,
              detectedAt: payload.detectedAt,
            },
          });
        }

        // 推送给管理员房间
        const adminRoomCount = await this.gateway.getRoomClientsCount('admin');
        if (adminRoomCount > 0) {
          this.gateway.sendNotificationToRoom('admin', {
            type: severity === 'critical' ? 'error' : 'warning',
            title: alertTitle,
            message: `用户 ${payload.username || payload.userId} 的代理费用告警: ${payload.providerName} 当前费用 ¥${payload.currentCost}`,
            data: payload,
            timestamp: payload.detectedAt,
          });
        }

        this.logger.log(`代理费用告警通知已发送: ${payload.userId}`);
      } catch (error) {
        this.logger.error(`处理代理费用告警事件失败: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * 处理代理使用停止事件
   * 当用户代理服务因各种原因被停止时触发
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.PROXY_USAGE_STOPPED,
    queue: 'notification-service.proxy.usage_stopped',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.notifications.dlx',
    },
  })
  async handleProxyUsageStopped(event: ProxyUsageStoppedEvent, msg: ConsumeMessage) {
    return runInTraceContext(event, async () => {
      const { payload } = event;
      this.logger.warn(
        `代理使用已停止: 用户 ${payload.userId}, 供应商 ${payload.providerName}, 原因 ${payload.reason}`
      );

      try {
        const reasonText = this.getStopReasonText(payload.reason);

        // 创建站内通知
        if (payload.userId) {
          await this.notificationsService.createRoleBasedNotification(
            payload.userId,
            payload.userRole || 'user',
            'proxy.usage_stopped' as any,
            {
              username: payload.username || '用户',
              providerName: payload.providerName,
              reason: payload.reason,
              reasonText,
              stoppedAt: payload.stoppedAt,
            },
            {
              userEmail: payload.userEmail,
            }
          );

          // WebSocket 实时推送 - 紧急通知
          this.gateway.sendToUser(payload.userId, {
            type: 'proxy.usage_stopped',
            severity: 'critical',
            data: {
              providerName: payload.providerName,
              reason: payload.reason,
              reasonText,
              stoppedAt: payload.stoppedAt,
            },
          });
        }

        // 推送给管理员房间
        const adminRoomCount = await this.gateway.getRoomClientsCount('admin');
        if (adminRoomCount > 0) {
          this.gateway.sendNotificationToRoom('admin', {
            type: 'error',
            title: '代理服务已停止',
            message: `用户 ${payload.username || payload.userId} 的代理服务已停止: ${reasonText}`,
            data: payload,
            timestamp: payload.stoppedAt,
          });
        }

        this.logger.log(`代理使用停止通知已发送: ${payload.userId}`);
      } catch (error) {
        this.logger.error(`处理代理使用停止事件失败: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * 处理代理告警触发事件
   * 系统级别的代理告警（如供应商故障、性能下降等）
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.PROXY_ALERT_TRIGGERED,
    queue: 'notification-service.proxy.alert_triggered',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.notifications.dlx',
    },
  })
  async handleProxyAlertTriggered(event: ProxyAlertTriggeredEvent, msg: ConsumeMessage) {
    return runInTraceContext(event, async () => {
      const { payload } = event;
      this.logger.warn(
        `代理告警触发: ${payload.alertName} [${payload.severity}] - ${payload.message}`
      );

      try {
        // 推送给管理员房间 - 系统级别告警
        const adminRoomCount = await this.gateway.getRoomClientsCount('admin');
        if (adminRoomCount > 0) {
          const notificationType = this.mapSeverityToNotificationType(payload.severity);

          this.gateway.sendNotificationToRoom('admin', {
            type: notificationType,
            title: `代理告警: ${payload.alertName}`,
            message: payload.message,
            data: {
              alertId: payload.alertId,
              alertType: payload.alertType,
              severity: payload.severity,
              providerName: payload.providerName,
              threshold: payload.threshold,
              currentValue: payload.currentValue,
            },
            timestamp: payload.triggeredAt,
          });
        }

        // 严重告警需要发送邮件通知给管理员
        if (payload.severity === 'critical' || payload.severity === 'high') {
          await this.sendAlertEmailToAdmins(payload);
        }

        this.logger.log(`代理告警通知已发送: ${payload.alertId}`);
      } catch (error) {
        this.logger.error(`处理代理告警触发事件失败: ${error.message}`);
        throw error;
      }
    });
  }

  /**
   * 处理代理告警解除事件
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: NotificationEventTypes.PROXY_ALERT_RESOLVED,
    queue: 'notification-service.proxy.alert_resolved',
    queueOptions: {
      durable: true,
      deadLetterExchange: 'cloudphone.notifications.dlx',
    },
  })
  async handleProxyAlertResolved(event: ProxyAlertResolvedEvent, msg: ConsumeMessage) {
    return runInTraceContext(event, async () => {
      const { payload } = event;
      this.logger.log(`代理告警已解除: ${payload.alertName}`);

      try {
        // 推送给管理员房间
        const adminRoomCount = await this.gateway.getRoomClientsCount('admin');
        if (adminRoomCount > 0) {
          this.gateway.sendNotificationToRoom('admin', {
            type: 'success',
            title: `告警已解除: ${payload.alertName}`,
            message: payload.resolution || '告警条件已恢复正常',
            data: {
              alertId: payload.alertId,
              alertType: payload.alertType,
              providerName: payload.providerName,
            },
            timestamp: payload.resolvedAt,
          });
        }

        this.logger.log(`代理告警解除通知已发送: ${payload.alertId}`);
      } catch (error) {
        this.logger.error(`处理代理告警解除事件失败: ${error.message}`);
        throw error;
      }
    });
  }

  // ========== 辅助方法 ==========

  private getCostAlertSeverity(
    alertType: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (alertType) {
      case 'budget_exceeded':
        return 'critical';
      case 'monthly_limit':
        return 'high';
      case 'daily_limit':
        return 'medium';
      case 'budget_warning':
      default:
        return 'low';
    }
  }

  private getCostAlertTitle(alertType: string): string {
    switch (alertType) {
      case 'budget_exceeded':
        return '代理预算已超支';
      case 'monthly_limit':
        return '代理月度限额告警';
      case 'daily_limit':
        return '代理日限额告警';
      case 'budget_warning':
      default:
        return '代理费用预警';
    }
  }

  private getStopReasonText(reason: string): string {
    switch (reason) {
      case 'budget_exceeded':
        return '预算已用尽';
      case 'quota_exhausted':
        return '配额已耗尽';
      case 'account_suspended':
        return '账户已暂停';
      default:
        return reason;
    }
  }

  private mapSeverityToNotificationType(
    severity: string
  ): 'info' | 'warning' | 'error' | 'success' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
      default:
        return 'info';
    }
  }

  private async sendAlertEmailToAdmins(payload: ProxyAlertTriggeredEvent['payload']) {
    try {
      // 发送给系统管理员的告警邮件
      // TODO: 从配置或数据库获取管理员邮箱列表
      const adminEmails = process.env.ADMIN_ALERT_EMAILS?.split(',') || [];

      for (const email of adminEmails) {
        if (email.trim()) {
          await this.emailService.sendEmail({
            to: email.trim(),
            subject: `[${payload.severity.toUpperCase()}] 代理告警: ${payload.alertName}`,
            html: `
              <h2>代理系统告警</h2>
              <p><strong>告警名称:</strong> ${payload.alertName}</p>
              <p><strong>严重程度:</strong> ${payload.severity}</p>
              <p><strong>告警类型:</strong> ${payload.alertType}</p>
              <p><strong>供应商:</strong> ${payload.providerName || 'N/A'}</p>
              <p><strong>消息:</strong> ${payload.message}</p>
              <p><strong>阈值:</strong> ${payload.threshold ?? 'N/A'}</p>
              <p><strong>当前值:</strong> ${payload.currentValue ?? 'N/A'}</p>
              <p><strong>触发时间:</strong> ${payload.triggeredAt}</p>
            `,
          });
        }
      }
    } catch (error) {
      this.logger.error(`发送告警邮件失败: ${error.message}`);
    }
  }
}
