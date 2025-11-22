import { NotificationType, NotificationChannel } from '../entities/notification-preference.entity';

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
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL, NotificationChannel.SMS],
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
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL, NotificationChannel.SMS],
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
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL, NotificationChannel.SMS],
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
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL, NotificationChannel.SMS],
    priority: NotificationPriority.CRITICAL,
    description: '安全警报',
  },

  // ========== 计费相关（补充） ==========
  [NotificationType.BILLING_REFUND_SUCCESS]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    description: '退款成功',
  },
  [NotificationType.BILLING_REFUND_FAILED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    description: '退款失败',
  },

  // ========== 用户安全相关 ==========
  [NotificationType.USER_2FA_ENABLED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL, NotificationChannel.SMS],
    priority: NotificationPriority.HIGH,
    description: '双因素认证已启用',
  },
  [NotificationType.USER_2FA_DISABLED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL, NotificationChannel.SMS],
    priority: NotificationPriority.CRITICAL,
    description: '双因素认证已禁用',
  },
  [NotificationType.USER_LOGIN_ANOMALY]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL, NotificationChannel.SMS],
    priority: NotificationPriority.CRITICAL,
    description: '异常登录检测',
  },
  [NotificationType.USER_PASSWORD_RESET]: {
    enabled: true,
    channels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
    priority: NotificationPriority.CRITICAL,
    description: '密码重置请求',
  },

  // ========== 短信服务相关 ==========
  [NotificationType.SMS_NUMBER_ASSIGNED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    description: '号码分配成功',
  },
  [NotificationType.SMS_NUMBER_RELEASED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    description: '号码已释放',
  },
  [NotificationType.SMS_NUMBER_EXPIRING]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL, NotificationChannel.SMS],
    priority: NotificationPriority.HIGH,
    description: '号码即将过期',
  },
  [NotificationType.SMS_VERIFICATION_RECEIVED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET],
    priority: NotificationPriority.CRITICAL,
    description: '收到验证码短信',
  },
  [NotificationType.SMS_QUOTA_LOW]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    description: '短信配额不足',
  },
  [NotificationType.SMS_QUOTA_EXHAUSTED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL, NotificationChannel.SMS],
    priority: NotificationPriority.CRITICAL,
    description: '短信配额用尽',
  },

  // ========== 代理服务相关 ==========
  [NotificationType.PROXY_ASSIGNED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    description: '代理分配成功',
  },
  [NotificationType.PROXY_RELEASED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    description: '代理已释放',
  },
  [NotificationType.PROXY_QUOTA_LOW]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    description: '代理流量配额不足',
  },
  [NotificationType.PROXY_QUOTA_EXHAUSTED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL, NotificationChannel.SMS],
    priority: NotificationPriority.CRITICAL,
    description: '代理流量用尽',
  },
  [NotificationType.PROXY_CONNECTION_FAILED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    description: '代理连接失败',
  },
  [NotificationType.PROXY_IP_CHANGED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    description: '代理 IP 变更',
  },

  // ========== 工单相关 ==========
  [NotificationType.TICKET_CREATED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    description: '工单创建成功',
  },
  [NotificationType.TICKET_REPLIED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL, NotificationChannel.SMS],
    priority: NotificationPriority.HIGH,
    description: '工单有新回复',
  },
  [NotificationType.TICKET_STATUS_CHANGED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    description: '工单状态变更',
  },
  [NotificationType.TICKET_RESOLVED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    description: '工单已解决',
  },
  [NotificationType.TICKET_CLOSED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.LOW,
    description: '工单已关闭',
  },

  // ========== 快照相关 ==========
  [NotificationType.SNAPSHOT_CREATED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    description: '快照创建成功',
  },
  [NotificationType.SNAPSHOT_RESTORED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    description: '快照恢复成功',
  },
  [NotificationType.SNAPSHOT_DELETED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET],
    priority: NotificationPriority.LOW,
    description: '快照已删除',
  },
  [NotificationType.SNAPSHOT_FAILED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    description: '快照操作失败',
  },
  [NotificationType.SNAPSHOT_QUOTA_LOW]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.HIGH,
    description: '快照配额不足',
  },

  // ========== 优惠券相关 ==========
  [NotificationType.COUPON_RECEIVED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL, NotificationChannel.SMS],
    priority: NotificationPriority.HIGH,
    description: '获得优惠券',
  },
  [NotificationType.COUPON_EXPIRING]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL, NotificationChannel.SMS],
    priority: NotificationPriority.HIGH,
    description: '优惠券即将过期',
  },
  [NotificationType.COUPON_USED]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    description: '优惠券已使用',
  },

  // ========== 推荐奖励相关 ==========
  [NotificationType.REFERRAL_REWARD]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL, NotificationChannel.SMS],
    priority: NotificationPriority.HIGH,
    description: '推荐奖励到账',
  },
  [NotificationType.REFERRAL_SIGNUP]: {
    enabled: true,
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    priority: NotificationPriority.MEDIUM,
    description: '被邀请用户注册成功',
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
export function getNotificationTypesByPriority(priority: NotificationPriority): NotificationType[] {
  return Object.entries(DEFAULT_NOTIFICATION_PREFERENCES)
    .filter(([_, config]) => config.priority === priority)
    .map(([type, _]) => type as NotificationType);
}
