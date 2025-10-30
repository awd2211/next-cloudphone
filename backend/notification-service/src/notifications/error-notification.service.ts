import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationCategory, NotificationChannel } from '../entities/notification.entity';

/**
 * 错误严重程度
 */
export enum ErrorSeverity {
  LOW = 'low',           // 低 - 一般错误，不影响核心功能
  MEDIUM = 'medium',     // 中 - 影响部分功能
  HIGH = 'high',         // 高 - 影响核心功能
  CRITICAL = 'critical', // 严重 - 系统级故障
}

/**
 * 错误通知配置
 */
export interface ErrorNotificationConfig {
  errorCode: string;              // 错误代码
  severity: ErrorSeverity;        // 严重程度
  threshold: number;              // 触发阈值（次数）
  windowMinutes: number;          // 时间窗口（分钟）
  notifyChannels: NotificationChannel[]; // 通知渠道
  aggregateKey?: string;          // 聚合键（用于去重）
}

/**
 * 错误事件
 */
export interface ErrorEvent {
  errorCode: string;              // 错误代码
  errorMessage: string;           // 错误消息
  userMessage?: string;           // 用户友好消息
  serviceName: string;            // 服务名称
  requestId?: string;             // Request ID
  userId?: string;                // 用户ID（如果有）
  stackTrace?: string;            // 堆栈跟踪
  metadata?: Record<string, any>; // 额外元数据
  timestamp: Date;                // 发生时间
}

/**
 * 聚合的错误统计
 */
interface ErrorAggregate {
  errorCode: string;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  affectedUsers: Set<string>;
  requestIds: string[];
  serviceName: string;
}

/**
 * 错误通知服务
 *
 * 功能：
 * 1. 监听系统错误事件
 * 2. 根据错误严重程度决定是否通知管理员
 * 3. 错误聚合：在时间窗口内相同错误只通知一次
 * 4. 阈值控制：只有达到一定次数才通知
 * 5. 定时清理过期的错误统计数据
 */
@Injectable()
export class ErrorNotificationService {
  private readonly logger = new Logger(ErrorNotificationService.name);

  // 错误聚合缓存（内存）
  private errorAggregates = new Map<string, ErrorAggregate>();

  // 已发送通知的错误键（避免重复通知）
  private notifiedErrors = new Set<string>();

  // 错误通知配置（可从配置文件或数据库加载）
  private errorConfigs: Map<string, ErrorNotificationConfig> = new Map([
    // 严重错误 - 立即通知
    ['INTERNAL_SERVER_ERROR', {
      errorCode: 'INTERNAL_SERVER_ERROR',
      severity: ErrorSeverity.CRITICAL,
      threshold: 1,
      windowMinutes: 5,
      notifyChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    }],
    ['DATABASE_CONNECTION_FAILED', {
      errorCode: 'DATABASE_CONNECTION_FAILED',
      severity: ErrorSeverity.CRITICAL,
      threshold: 1,
      windowMinutes: 5,
      notifyChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    }],
    ['REDIS_CONNECTION_FAILED', {
      errorCode: 'REDIS_CONNECTION_FAILED',
      severity: ErrorSeverity.CRITICAL,
      threshold: 1,
      windowMinutes: 5,
      notifyChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    }],
    ['RABBITMQ_CONNECTION_FAILED', {
      errorCode: 'RABBITMQ_CONNECTION_FAILED',
      severity: ErrorSeverity.CRITICAL,
      threshold: 1,
      windowMinutes: 5,
      notifyChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    }],

    // 高优先级错误 - 3次后通知
    ['DEVICE_START_FAILED', {
      errorCode: 'DEVICE_START_FAILED',
      severity: ErrorSeverity.HIGH,
      threshold: 3,
      windowMinutes: 10,
      notifyChannels: [NotificationChannel.WEBSOCKET],
      aggregateKey: 'errorCode', // 按错误代码聚合
    }],
    ['DEVICE_STOP_FAILED', {
      errorCode: 'DEVICE_STOP_FAILED',
      severity: ErrorSeverity.HIGH,
      threshold: 3,
      windowMinutes: 10,
      notifyChannels: [NotificationChannel.WEBSOCKET],
      aggregateKey: 'errorCode',
    }],
    ['PAYMENT_FAILED', {
      errorCode: 'PAYMENT_FAILED',
      severity: ErrorSeverity.HIGH,
      threshold: 5,
      windowMinutes: 15,
      notifyChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
      aggregateKey: 'errorCode',
    }],

    // 高优先级错误 - 3-5次后通知（设备服务）
    ['DEVICE_START_FAILED', {
      errorCode: 'DEVICE_START_FAILED',
      severity: ErrorSeverity.HIGH,
      threshold: 3,
      windowMinutes: 15,
      notifyChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
      aggregateKey: 'errorCode',
    }],
    ['DEVICE_STOP_FAILED', {
      errorCode: 'DEVICE_STOP_FAILED',
      severity: ErrorSeverity.HIGH,
      threshold: 3,
      windowMinutes: 15,
      notifyChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
      aggregateKey: 'errorCode',
    }],
    ['DOCKER_CONNECTION_FAILED', {
      errorCode: 'DOCKER_CONNECTION_FAILED',
      severity: ErrorSeverity.HIGH,
      threshold: 5,
      windowMinutes: 15,
      notifyChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
      aggregateKey: 'errorCode',
    }],
    ['PAYMENT_INITIATION_FAILED', {
      errorCode: 'PAYMENT_INITIATION_FAILED',
      severity: ErrorSeverity.HIGH,
      threshold: 5,
      windowMinutes: 15,
      notifyChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
      aggregateKey: 'errorCode',
    }],
    ['PAYMENT_GATEWAY_UNAVAILABLE', {
      errorCode: 'PAYMENT_GATEWAY_UNAVAILABLE',
      severity: ErrorSeverity.HIGH,
      threshold: 3,
      windowMinutes: 10,
      notifyChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
      aggregateKey: 'errorCode',
    }],

    // 中等优先级错误 - 10次后通知
    ['APK_UPLOAD_FAILED', {
      errorCode: 'APK_UPLOAD_FAILED',
      severity: ErrorSeverity.MEDIUM,
      threshold: 10,
      windowMinutes: 30,
      notifyChannels: [NotificationChannel.WEBSOCKET],
      aggregateKey: 'errorCode',
    }],
    ['MINIO_CONNECTION_FAILED', {
      errorCode: 'MINIO_CONNECTION_FAILED',
      severity: ErrorSeverity.HIGH,
      threshold: 5,
      windowMinutes: 15,
      notifyChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
      aggregateKey: 'errorCode',
    }],
    ['REDIS_CONNECTION_FAILED', {
      errorCode: 'REDIS_CONNECTION_FAILED',
      severity: ErrorSeverity.HIGH,
      threshold: 5,
      windowMinutes: 15,
      notifyChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
      aggregateKey: 'errorCode',
    }],
    ['RABBITMQ_CONNECTION_FAILED', {
      errorCode: 'RABBITMQ_CONNECTION_FAILED',
      severity: ErrorSeverity.CRITICAL,
      threshold: 3,
      windowMinutes: 10,
      notifyChannels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
      aggregateKey: 'errorCode',
    }],
    ['ACCOUNT_LOCKED', {
      errorCode: 'ACCOUNT_LOCKED',
      severity: ErrorSeverity.MEDIUM,
      threshold: 10,
      windowMinutes: 30,
      notifyChannels: [NotificationChannel.WEBSOCKET],
      aggregateKey: 'errorCode',
    }],
    ['QUOTA_EXCEEDED', {
      errorCode: 'QUOTA_EXCEEDED',
      severity: ErrorSeverity.MEDIUM,
      threshold: 10,
      windowMinutes: 30,
      notifyChannels: [NotificationChannel.WEBSOCKET],
      aggregateKey: 'errorCode',
    }],
    ['INSUFFICIENT_BALANCE', {
      errorCode: 'INSUFFICIENT_BALANCE',
      severity: ErrorSeverity.MEDIUM,
      threshold: 10,
      windowMinutes: 30,
      notifyChannels: [NotificationChannel.WEBSOCKET],
      aggregateKey: 'errorCode',
    }],

    // 低优先级错误 - 50次后通知
    ['VALIDATION_ERROR', {
      errorCode: 'VALIDATION_ERROR',
      severity: ErrorSeverity.LOW,
      threshold: 50,
      windowMinutes: 60,
      notifyChannels: [NotificationChannel.WEBSOCKET],
      aggregateKey: 'errorCode',
    }],
  ]);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * 处理错误事件
   */
  async handleErrorEvent(event: ErrorEvent): Promise<void> {
    this.logger.debug(`处理错误事件: ${event.errorCode} - ${event.serviceName}`);

    // 获取错误配置
    const config = this.errorConfigs.get(event.errorCode);
    if (!config) {
      // 未配置的错误代码，使用默认配置
      this.logger.debug(`错误代码未配置: ${event.errorCode}，跳过通知`);
      return;
    }

    // 聚合错误
    const aggregateKey = this.buildAggregateKey(event, config);
    const aggregate = this.getOrCreateAggregate(aggregateKey, event);

    // 更新聚合数据
    aggregate.count++;
    aggregate.lastOccurrence = event.timestamp;
    if (event.userId) {
      aggregate.affectedUsers.add(event.userId);
    }
    if (event.requestId) {
      aggregate.requestIds.push(event.requestId);
    }

    this.logger.debug(
      `错误聚合更新: ${aggregateKey}, 计数: ${aggregate.count}/${config.threshold}`
    );

    // 检查是否达到通知阈值
    if (aggregate.count >= config.threshold) {
      // 检查是否已经通知过（避免重复通知）
      const notifyKey = `${aggregateKey}:${this.getTimeWindow(config.windowMinutes)}`;
      if (!this.notifiedErrors.has(notifyKey)) {
        await this.sendErrorNotification(event, aggregate, config);
        this.notifiedErrors.add(notifyKey);

        // 重置计数（已通知）
        aggregate.count = 0;
        aggregate.affectedUsers.clear();
        aggregate.requestIds = [];
      }
    }
  }

  /**
   * 构建聚合键
   */
  private buildAggregateKey(event: ErrorEvent, config: ErrorNotificationConfig): string {
    if (config.aggregateKey === 'errorCode') {
      return `${event.serviceName}:${event.errorCode}`;
    }
    // 默认按错误代码聚合
    return `${event.serviceName}:${event.errorCode}`;
  }

  /**
   * 获取或创建聚合数据
   */
  private getOrCreateAggregate(key: string, event: ErrorEvent): ErrorAggregate {
    if (!this.errorAggregates.has(key)) {
      this.errorAggregates.set(key, {
        errorCode: event.errorCode,
        count: 0,
        firstOccurrence: event.timestamp,
        lastOccurrence: event.timestamp,
        affectedUsers: new Set<string>(),
        requestIds: [],
        serviceName: event.serviceName,
      });
    }
    return this.errorAggregates.get(key)!;
  }

  /**
   * 获取时间窗口标识（用于去重）
   */
  private getTimeWindow(windowMinutes: number): string {
    const now = new Date();
    const windowStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      Math.floor(now.getMinutes() / windowMinutes) * windowMinutes,
      0,
      0
    );
    return windowStart.toISOString();
  }

  /**
   * 发送错误通知给管理员
   */
  private async sendErrorNotification(
    event: ErrorEvent,
    aggregate: ErrorAggregate,
    config: ErrorNotificationConfig
  ): Promise<void> {
    this.logger.warn(
      `发送错误通知: ${event.errorCode} (${config.severity}) - 服务: ${event.serviceName}, 计数: ${aggregate.count}`
    );

    // 获取所有管理员用户ID（这里需要从user-service获取）
    const adminUserIds = await this.getAdminUserIds();

    if (adminUserIds.length === 0) {
      this.logger.warn('未找到管理员用户，无法发送错误通知');
      return;
    }

    // 构建通知标题和消息
    const { title, message } = this.buildNotificationContent(event, aggregate, config);

    // 构建通知数据（包含详细信息）
    const notificationData = {
      errorCode: event.errorCode,
      severity: config.severity,
      serviceName: event.serviceName,
      count: aggregate.count,
      affectedUsersCount: aggregate.affectedUsers.size,
      firstOccurrence: aggregate.firstOccurrence.toISOString(),
      lastOccurrence: aggregate.lastOccurrence.toISOString(),
      requestIds: aggregate.requestIds.slice(0, 5), // 只显示前5个Request ID
      errorMessage: event.errorMessage,
      userMessage: event.userMessage,
      stackTrace: event.stackTrace,
      metadata: event.metadata,
      actionUrl: `/admin/system/errors/${event.errorCode}`, // 跳转到错误详情页面
    };

    // 发送通知给所有管理员
    for (const adminUserId of adminUserIds) {
      try {
        await this.notificationsService.createAndSend({
          userId: adminUserId,
          type: NotificationCategory.ALERT,
          title,
          message,
          data: notificationData,
          channels: config.notifyChannels,
        });
      } catch (error) {
        this.logger.error(`发送错误通知失败 (管理员: ${adminUserId}):`, error.stack);
      }
    }

    this.logger.log(`错误通知已发送给 ${adminUserIds.length} 位管理员`);
  }

  /**
   * 构建通知内容
   */
  private buildNotificationContent(
    event: ErrorEvent,
    aggregate: ErrorAggregate,
    config: ErrorNotificationConfig
  ): { title: string; message: string } {
    // 严重程度图标
    const severityIcon = {
      [ErrorSeverity.LOW]: '🟢',
      [ErrorSeverity.MEDIUM]: '🟡',
      [ErrorSeverity.HIGH]: '🟠',
      [ErrorSeverity.CRITICAL]: '🔴',
    }[config.severity];

    // 标题
    const title = `${severityIcon} 系统错误告警: ${event.errorCode}`;

    // 消息
    const parts: string[] = [];
    parts.push(`**服务**: ${event.serviceName}`);
    parts.push(`**错误代码**: ${event.errorCode}`);
    parts.push(`**严重程度**: ${config.severity.toUpperCase()}`);
    parts.push(`**发生次数**: ${aggregate.count} 次`);

    if (aggregate.affectedUsers.size > 0) {
      parts.push(`**影响用户数**: ${aggregate.affectedUsers.size}`);
    }

    parts.push(`**首次发生**: ${this.formatDate(aggregate.firstOccurrence)}`);
    parts.push(`**最近发生**: ${this.formatDate(aggregate.lastOccurrence)}`);

    if (event.userMessage) {
      parts.push(`\n**用户消息**: ${event.userMessage}`);
    }

    parts.push(`\n**技术消息**: ${event.errorMessage}`);

    if (event.requestId) {
      parts.push(`\n**Request ID**: ${event.requestId}`);
    }

    const message = parts.join('\n');

    return { title, message };
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date): string {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  /**
   * 获取管理员用户ID列表
   *
   * TODO: 从user-service获取具有admin角色的用户
   * 目前返回硬编码的管理员ID
   */
  private async getAdminUserIds(): Promise<string[]> {
    // TODO: 调用user-service API获取管理员列表
    // const response = await this.httpClient.get('/users?role=admin');
    // return response.data.map(user => user.id);

    // 临时方案：从环境变量读取管理员ID
    const adminIds = process.env.ADMIN_USER_IDS || '';
    if (adminIds) {
      return adminIds.split(',').map(id => id.trim()).filter(Boolean);
    }

    this.logger.warn('未配置管理员用户ID (ADMIN_USER_IDS)');
    return [];
  }

  /**
   * 定时清理过期的错误聚合数据
   * 每小时执行一次
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredAggregates(): Promise<void> {
    this.logger.debug('开始清理过期的错误聚合数据');

    const now = new Date();
    const maxWindowMinutes = Math.max(
      ...Array.from(this.errorConfigs.values()).map(c => c.windowMinutes)
    );
    const expiryTime = new Date(now.getTime() - maxWindowMinutes * 60 * 1000);

    let cleanedCount = 0;

    // 清理过期的聚合数据
    for (const [key, aggregate] of this.errorAggregates.entries()) {
      if (aggregate.lastOccurrence < expiryTime) {
        this.errorAggregates.delete(key);
        cleanedCount++;
      }
    }

    // 清理过期的通知键
    const notifyKeysToDelete: string[] = [];
    for (const key of this.notifiedErrors) {
      // 通知键格式: aggregateKey:timeWindow
      const [, timeWindowStr] = key.split(':');
      const timeWindow = new Date(timeWindowStr);
      if (timeWindow < expiryTime) {
        notifyKeysToDelete.push(key);
      }
    }
    notifyKeysToDelete.forEach(key => this.notifiedErrors.delete(key));

    this.logger.log(
      `清理完成: 删除 ${cleanedCount} 个过期聚合, ${notifyKeysToDelete.length} 个过期通知键`
    );
  }

  /**
   * 获取错误统计信息（用于监控面板）
   */
  getErrorStatistics(): {
    totalAggregates: number;
    totalNotified: number;
    aggregatesByService: Record<string, number>;
    aggregatesBySeverity: Record<string, number>;
  } {
    const aggregatesByService: Record<string, number> = {};
    const aggregatesBySeverity: Record<string, number> = {};

    for (const aggregate of this.errorAggregates.values()) {
      // 按服务统计
      aggregatesByService[aggregate.serviceName] =
        (aggregatesByService[aggregate.serviceName] || 0) + 1;

      // 按严重程度统计
      const config = this.errorConfigs.get(aggregate.errorCode);
      if (config) {
        aggregatesBySeverity[config.severity] =
          (aggregatesBySeverity[config.severity] || 0) + 1;
      }
    }

    return {
      totalAggregates: this.errorAggregates.size,
      totalNotified: this.notifiedErrors.size,
      aggregatesByService,
      aggregatesBySeverity,
    };
  }

  /**
   * 手动触发错误通知（用于测试）
   */
  async triggerTestNotification(adminUserId: string): Promise<void> {
    const testEvent: ErrorEvent = {
      errorCode: 'TEST_ERROR',
      errorMessage: '这是一个测试错误通知',
      userMessage: '测试错误通知（用户友好消息）',
      serviceName: 'notification-service',
      requestId: `test_${Date.now()}`,
      timestamp: new Date(),
      metadata: {
        test: true,
        note: '这是一个手动触发的测试通知',
      },
    };

    await this.notificationsService.createAndSend({
      userId: adminUserId,
      type: NotificationCategory.ALERT,
      title: '🧪 测试错误通知',
      message: '如果您看到这条消息，说明错误通知系统工作正常。',
      data: {
        errorCode: testEvent.errorCode,
        serviceName: testEvent.serviceName,
        requestId: testEvent.requestId,
        severity: ErrorSeverity.LOW,
      },
      channels: [NotificationChannel.WEBSOCKET],
    });

    this.logger.log(`已发送测试通知给管理员: ${adminUserId}`);
  }
}
