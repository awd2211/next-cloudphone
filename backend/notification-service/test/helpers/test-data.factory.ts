import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationCategory,
} from '@cloudphone/shared';
import { CreateNotificationDto } from '../../src/notifications/notification.interface';
import { CreateTemplateDto } from '../../src/templates/dto/create-template.dto';
import { randomUUID } from 'crypto';

/**
 * 测试数据工厂 - 用于生成测试数据
 */
export class TestDataFactory {
  /**
   * 创建测试通知 DTO
   */
  static createNotificationDto(overrides?: Partial<CreateNotificationDto>): CreateNotificationDto {
    return {
      userId: randomUUID(), // 使用 Node.js 内置的 UUID 生成
      type: NotificationCategory.DEVICE, // 使用 Category 而不是 Type
      title: 'Test Notification',
      message: 'This is a test notification message', // 使用 message 而不是 body
      channels: [NotificationChannel.WEBSOCKET],
      data: { deviceId: 'device-123', deviceName: 'Test Device' },
      ...overrides,
    };
  }

  /**
   * 创建测试模板 DTO
   */
  static createTemplateDto(overrides?: Partial<CreateTemplateDto>): CreateTemplateDto {
    return {
      code: `test-template-${Date.now()}`,
      name: 'Test Template',
      type: NotificationType.DEVICE_CREATED,
      title: 'Device Created: {{deviceName}}',
      body: 'Your device {{deviceName}} has been created successfully.',
      channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
      emailTemplate: '<h1>Device Created</h1><p>Device: {{deviceName}}</p>',
      language: 'zh-CN',
      isActive: true,
      ...overrides,
    };
  }

  /**
   * 创建设备创建事件
   */
  static createDeviceCreatedEvent(overrides?: any) {
    return {
      version: '1.0',
      source: 'device-service',
      eventId: `event-${Date.now()}`,
      eventType: 'device.created',
      timestamp: new Date().toISOString(),
      payload: {
        deviceId: 'device-123',
        deviceName: 'Test Device',
        deviceType: 'phone',
        providerType: 'aliyun_ecp',
        userId: randomUUID(), // ✅ Use real UUID by default
        userEmail: 'user@example.com',
        userRole: 'user',
        tenantId: 'tenant-123',
        deviceConfig: {
          cpuCores: 4,
          memoryMB: 8192,
          storageGB: 64,
        },
        createdAt: new Date().toISOString(),
        ...overrides?.payload, // ✅ Spread nested payload overrides
      },
    };
  }

  /**
   * 创建用户注册事件
   */
  static createUserRegisteredEvent(overrides?: any) {
    return {
      version: '1.0',
      source: 'user-service',
      eventId: `event-${Date.now()}`,
      eventType: 'user.registered',
      timestamp: new Date().toISOString(),
      payload: {
        userId: randomUUID(), // ✅ Use real UUID by default
        username: 'testuser',
        email: 'user@example.com',
        userRole: 'user',
        registerTime: new Date().toISOString(),
        ...overrides?.payload, // ✅ Spread nested payload overrides
      },
    };
  }

  /**
   * 创建计费低余额事件
   */
  static createLowBalanceEvent(overrides?: any) {
    return {
      version: '1.0',
      source: 'billing-service',
      eventId: `event-${Date.now()}`,
      eventType: 'billing.low_balance',
      timestamp: new Date().toISOString(),
      payload: {
        userId: randomUUID(), // ✅ Use real UUID by default
        userRole: 'user',
        username: 'testuser',
        email: 'user@example.com',
        currentBalance: 50.0,
        threshold: 100.0,
        daysRemaining: 5,
        detectedAt: new Date().toISOString(),
        ...overrides?.payload, // ✅ Spread nested payload overrides
      },
    };
  }

  /**
   * 批量创建测试通知
   */
  static createMultipleNotifications(count: number, baseDto?: Partial<CreateNotificationDto>) {
    return Array.from({ length: count }, (_, i) =>
      this.createNotificationDto({
        ...baseDto,
        title: `Test Notification ${i + 1}`,
        data: { ...baseDto?.data, index: i },
      }),
    );
  }

  /**
   * 创建随机用户ID (UUID格式)
   */
  static randomUserId(): string {
    return randomUUID();
  }

  /**
   * 创建随机设备ID
   */
  static randomDeviceId(): string {
    return `device-${Math.random().toString(36).substr(2, 9)}`;
  }
}
