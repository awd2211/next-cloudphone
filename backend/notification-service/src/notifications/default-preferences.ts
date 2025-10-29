import {
  NotificationType,
  NotificationChannel,
} from '../entities/notification-preference.entity';

/**
 * 通知优先级分类
 */
export enum NotificationPriority {
  CRITICAL = 'critical', // 关键 - 默认全渠道
  HIGH = 'high', // 高 - WebSocket + Email
  MEDIUM = 'medium', // 中 - WebSocket + Email (可选)
  LOW = 'low', // 低 - 仅 WebSocket
}

/**
 * 默认通知偏好配置
 *
 * 当用户首次注册或新增通知类型时，使用此默认配置
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: Record<
  NotificationType,
  {
    enabled: boolean;
    channels: NotificationChannel[];
    priority: NotificationPriority;
    description: string;
  }
> = {
  // ========== 设备相关 - 核心功能 ==========
  [NotificationType.DEVICE_CREATED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET],
    priority: NotificationPriority.LOW,
    description: '设备创建成功',
  },
  [NotificationType.DEVICE_CREATION_FAILED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    description: '设备创建失败',
  },
  [NotificationType.DEVICE_STARTED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET],
    priority: NotificationPriority.LOW,
    description: '设备启动',
  },
  [NotificationType.DEVICE_STOPPED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET],
    priority: NotificationPriority.LOW,
    description: '设备停止',
  },
  [NotificationType.DEVICE_ERROR]: {
    enabled: true,
    channels: [
      NotificationChannel.WEBSOCKET,
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
    ],
    priority: NotificationPriority.CRITICAL,
    description: '设备故障（关键）',
  },
  [NotificationType.DEVICE_CONNECTION_LOST]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    description: '设备连接丢失',
  },
  [NotificationType.DEVICE_DELETED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET],
    priority: NotificationPriority.LOW,
    description: '设备删除',
  },
  [NotificationType.DEVICE_EXPIRING_SOON]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    description: '设备即将过期',
  },
  [NotificationType.DEVICE_EXPIRED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    description: '设备已过期',
  },

  // ========== 应用相关 ==========
  [NotificationType.APP_INSTALLED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET],
    priority: NotificationPriority.LOW,
    description: '应用安装成功',
  },
  [NotificationType.APP_UNINSTALLED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET],
    priority: NotificationPriority.LOW,
    description: '应用卸载成功',
  },
  [NotificationType.APP_INSTALL_FAILED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    description: '应用安装失败',
  },
  [NotificationType.APP_APPROVED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    description: '应用审核通过',
  },
  [NotificationType.APP_REJECTED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    description: '应用审核被拒',
  },

  // ========== 计费相关 - 非常重要 ==========
  [NotificationType.BILLING_LOW_BALANCE]: {
    enabled: true,
    channels: [
      NotificationChannel.WEBSOCKET,
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
    ],
    priority: NotificationPriority.CRITICAL,
    description: '余额不足预警',
  },
  [NotificationType.BILLING_PAYMENT_SUCCESS]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    description: '充值成功',
  },
  [NotificationType.BILLING_PAYMENT_FAILED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    description: '充值失败',
  },
  [NotificationType.BILLING_INVOICE_GENERATED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    description: '账单生成',
  },
  [NotificationType.BILLING_SUBSCRIPTION_EXPIRING]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    description: '套餐即将到期',
  },
  [NotificationType.BILLING_SUBSCRIPTION_EXPIRED]: {
    enabled: true,
    channels: [
      NotificationChannel.WEBSOCKET,
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
    ],
    priority: NotificationPriority.CRITICAL,
    description: '套餐已到期',
  },

  // ========== 用户相关 ==========
  [NotificationType.USER_REGISTERED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    description: '注册成功',
  },
  [NotificationType.USER_LOGIN]: {
    enabled: false, // 默认关闭，避免打扰
    channels: [NotificationChannel.WEBSOCKET],
    priority: NotificationPriority.LOW,
    description: '用户登录',
  },
  [NotificationType.USER_PASSWORD_CHANGED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    description: '密码修改',
  },
  [NotificationType.USER_PROFILE_UPDATED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET],
    priority: NotificationPriority.LOW,
    description: '个人信息更新',
  },

  // ========== 系统相关 ==========
  [NotificationType.SYSTEM_MAINTENANCE]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    description: '系统维护通知',
  },
  [NotificationType.SYSTEM_ANNOUNCEMENT]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET],
    priority: NotificationPriority.MEDIUM,
    description: '系统公告',
  },
  [NotificationType.SYSTEM_UPDATE]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET],
    priority: NotificationPriority.LOW,
    description: '系统更新',
  },
  [NotificationType.SYSTEM_SECURITY_ALERT]: {
    enabled: true,
    channels: [
      NotificationChannel.WEBSOCKET,
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
    ],
    priority: NotificationPriority.CRITICAL,
    description: '安全警报',
  },
};

/**
 * 获取所有可用的通知类型及其描述
 */
export function getAllNotificationTypes(): Array<{
  type: NotificationType;
  description: string;
  priority: NotificationPriority;
  defaultChannels: NotificationChannel[];
}> {
  return Object.entries(DEFAULT_NOTIFICATION_PREFERENCES).map(([type, config]) => ({
    type: type as NotificationType,
    description: config.description,
    priority: config.priority,
    defaultChannels: config.channels,
  }));
}

/**
 * 获取某个优先级的所有通知类型
 */
export function getNotificationTypesByPriority(
  priority: NotificationPriority,
): NotificationType[] {
  return Object.entries(DEFAULT_NOTIFICATION_PREFERENCES)
    .filter(([_, config]) => config.priority === priority)
    .map(([type, _]) => type as NotificationType);
}
