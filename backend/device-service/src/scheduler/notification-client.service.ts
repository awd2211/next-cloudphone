import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpClientService, ServiceTokenService } from "@cloudphone/shared";

/**
 * 通知类型
 */
export enum NotificationType {
  ALLOCATION_SUCCESS = "allocation_success",
  ALLOCATION_FAILED = "allocation_failed",
  ALLOCATION_EXPIRED = "allocation_expired",
  ALLOCATION_EXPIRING_SOON = "allocation_expiring_soon",
  DEVICE_RELEASED = "device_released",
}

/**
 * 通知数据接口
 */
export interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels?: string[]; // 通知渠道: ["websocket", "email", "sms"]
}

/**
 * 分配成功通知数据
 */
export interface AllocationSuccessNotification {
  userId: string;
  deviceId: string;
  deviceName: string;
  allocationId: string;
  allocatedAt: string;
  expiresAt: string;
  durationMinutes: number;
  adbHost?: string;
  adbPort?: number;
}

/**
 * 分配失败通知数据
 */
export interface AllocationFailedNotification {
  userId: string;
  reason: string;
  timestamp: string;
}

/**
 * 分配过期通知数据
 */
export interface AllocationExpiredNotification {
  userId: string;
  deviceId: string;
  deviceName: string;
  allocationId: string;
  allocatedAt: string;
  expiredAt: string;
  durationSeconds: number;
}

/**
 * NotificationClient 服务
 *
 * 负责与 Notification Service 通信，发送各类通知
 */
@Injectable()
export class NotificationClientService {
  private readonly logger = new Logger(NotificationClientService.name);
  private readonly notificationServiceUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
    private readonly serviceTokenService: ServiceTokenService,
  ) {
    this.notificationServiceUrl =
      this.configService.get<string>("NOTIFICATION_SERVICE_URL") ||
      "http://localhost:30006";
  }

  /**
   * 生成服务间认证 headers
   */
  private async getServiceHeaders(): Promise<Record<string, string>> {
    const token = await this.serviceTokenService.generateToken("device-service");
    return {
      "X-Service-Token": token,
    };
  }

  /**
   * 发送通用通知
   */
  private async sendNotification(data: NotificationData): Promise<void> {
    try {
      const headers = await this.getServiceHeaders();

      await this.httpClient.post(
        `${this.notificationServiceUrl}/api/internal/notifications/send`,
        {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data || {},
          channels: data.channels || ["websocket"], // 默认只发 WebSocket
          priority: "normal",
        },
        { headers },
        {
          timeout: 5000,
          retries: 2,
          circuitBreaker: true,
        }
      );

      this.logger.log(
        `📨 Notification sent: ${data.type} to user ${data.userId}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to send notification: ${data.type} to user ${data.userId}`,
        error.stack
      );
      // 通知发送失败不应阻塞主流程
    }
  }

  /**
   * 发送设备分配成功通知
   */
  async notifyAllocationSuccess(
    data: AllocationSuccessNotification
  ): Promise<void> {
    const message = data.adbHost
      ? `设备 ${data.deviceName} 已成功分配！连接信息：${data.adbHost}:${data.adbPort}，使用时长 ${data.durationMinutes} 分钟。`
      : `设备 ${data.deviceName} 已成功分配！使用时长 ${data.durationMinutes} 分钟。`;

    await this.sendNotification({
      userId: data.userId,
      type: NotificationType.ALLOCATION_SUCCESS,
      title: "✅ 设备分配成功",
      message,
      data: {
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        allocationId: data.allocationId,
        allocatedAt: data.allocatedAt,
        expiresAt: data.expiresAt,
        durationMinutes: data.durationMinutes,
        adbHost: data.adbHost,
        adbPort: data.adbPort,
      },
      channels: ["websocket", "email"], // 成功通知发送 WebSocket + Email
    });
  }

  /**
   * 发送设备分配失败通知
   */
  async notifyAllocationFailed(
    data: AllocationFailedNotification
  ): Promise<void> {
    const message = `设备分配失败：${data.reason}。请稍后重试或联系客服。`;

    await this.sendNotification({
      userId: data.userId,
      type: NotificationType.ALLOCATION_FAILED,
      title: "❌ 设备分配失败",
      message,
      data: {
        reason: data.reason,
        timestamp: data.timestamp,
      },
      channels: ["websocket"], // 失败通知只发 WebSocket
    });
  }

  /**
   * 发送设备分配过期通知
   */
  async notifyAllocationExpired(
    data: AllocationExpiredNotification
  ): Promise<void> {
    const durationFormatted = this.formatDuration(data.durationSeconds);
    const message = `设备 ${data.deviceName} 使用时间已到期（使用时长：${durationFormatted}）。如需继续使用，请重新分配设备。`;

    await this.sendNotification({
      userId: data.userId,
      type: NotificationType.ALLOCATION_EXPIRED,
      title: "⏰ 设备使用已过期",
      message,
      data: {
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        allocationId: data.allocationId,
        allocatedAt: data.allocatedAt,
        expiredAt: data.expiredAt,
        durationSeconds: data.durationSeconds,
      },
      channels: ["websocket", "email"], // 过期通知发送 WebSocket + Email
    });
  }

  /**
   * 发送设备即将过期提醒
   */
  async notifyAllocationExpiringSoon(
    data: AllocationExpiredNotification & { remainingMinutes: number }
  ): Promise<void> {
    const message = `提醒：设备 ${data.deviceName} 将在 ${data.remainingMinutes} 分钟后到期。请及时保存数据或延长使用时间。`;

    await this.sendNotification({
      userId: data.userId,
      type: NotificationType.ALLOCATION_EXPIRING_SOON,
      title: "⚠️ 设备即将到期",
      message,
      data: {
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        allocationId: data.allocationId,
        expiresAt: data.expiresAt,
        remainingMinutes: data.remainingMinutes,
      },
      channels: ["websocket"], // 提醒通知只发 WebSocket
    });
  }

  /**
   * 发送设备主动释放通知
   */
  async notifyDeviceReleased(data: {
    userId: string;
    deviceId: string;
    deviceName: string;
    allocationId: string;
    durationSeconds: number;
  }): Promise<void> {
    const durationFormatted = this.formatDuration(data.durationSeconds);
    const message = `设备 ${data.deviceName} 已释放。本次使用时长：${durationFormatted}。`;

    await this.sendNotification({
      userId: data.userId,
      type: NotificationType.DEVICE_RELEASED,
      title: "📴 设备已释放",
      message,
      data: {
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        allocationId: data.allocationId,
        durationSeconds: data.durationSeconds,
      },
      channels: ["websocket"], // 释放通知只发 WebSocket
    });
  }

  /**
   * 批量发送通知
   */
  async sendBatchNotifications(
    notifications: NotificationData[]
  ): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const notification of notifications) {
      try {
        await this.sendNotification(notification);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `${notification.userId}/${notification.type}: ${error.message}`
        );
      }
    }

    this.logger.log(
      `Batch notifications sent: ${results.success} success, ${results.failed} failed`
    );

    return results;
  }

  /**
   * 格式化时长（秒 → 可读格式）
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours} 小时 ${minutes} 分钟`;
    } else if (minutes > 0) {
      return `${minutes} 分钟 ${secs} 秒`;
    } else {
      return `${secs} 秒`;
    }
  }

  /**
   * 检查 Notification Service 健康状态
   */
  async checkHealth(): Promise<boolean> {
    try {
      await this.httpClient.get(
        `${this.notificationServiceUrl}/health`,
        {},
        { timeout: 3000, retries: 1, circuitBreaker: false }
      );
      return true;
    } catch (error) {
      this.logger.warn("Notification service health check failed");
      return false;
    }
  }
}
