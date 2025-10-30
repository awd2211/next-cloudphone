/**
 * 通知相关枚举类型
 * 
 * 统一的通知类型、状态和渠道定义
 * 用于跨服务共享
 */

/**
 * 通知渠道枚举
 */
export enum NotificationChannel {
  WEBSOCKET = 'websocket', // 网页实时通知（站内信）
  EMAIL = 'email', // 邮件通知
  SMS = 'sms', // 短信通知
  PUSH = 'push', // 推送通知 (预留)
}

/**
 * 通知状态枚举
 */
export enum NotificationStatus {
  PENDING = 'pending', // 待发送
  SENT = 'sent', // 已发送
  READ = 'read', // 已读
  FAILED = 'failed', // 发送失败
}

/**
 * 通知类型枚举
 * 
 * 涵盖系统中所有可能的通知场景
 */
export enum NotificationType {
  // ========== 设备相关 ==========
  DEVICE_CREATED = 'device.created', // 设备创建成功
  DEVICE_CREATION_FAILED = 'device.creation_failed', // 设备创建失败
  DEVICE_STARTED = 'device.started', // 设备启动
  DEVICE_STOPPED = 'device.stopped', // 设备停止
  DEVICE_ERROR = 'device.error', // 设备故障
  DEVICE_CONNECTION_LOST = 'device.connection_lost', // 设备连接丢失
  DEVICE_DELETED = 'device.deleted', // 设备删除
  DEVICE_EXPIRING_SOON = 'device.expiring_soon', // 设备即将过期（提前通知）
  DEVICE_EXPIRED = 'device.expired', // 设备已过期

  // ========== 应用相关 ==========
  APP_INSTALLED = 'app.installed', // 应用安装成功
  APP_UNINSTALLED = 'app.uninstalled', // 应用卸载成功
  APP_INSTALL_FAILED = 'app.install_failed', // 应用安装失败
  APP_APPROVED = 'app.approved', // 应用审核通过
  APP_REJECTED = 'app.rejected', // 应用审核被拒

  // ========== 计费相关 ==========
  BILLING_LOW_BALANCE = 'billing.low_balance', // 余额不足预警
  BILLING_PAYMENT_SUCCESS = 'billing.payment_success', // 充值成功
  BILLING_PAYMENT_FAILED = 'billing.payment_failed', // 充值失败
  BILLING_INVOICE_GENERATED = 'billing.invoice_generated', // 账单生成
  BILLING_SUBSCRIPTION_EXPIRING = 'billing.subscription_expiring', // 套餐即将到期
  BILLING_SUBSCRIPTION_EXPIRED = 'billing.subscription_expired', // 套餐已到期

  // ========== 用户相关 ==========
  USER_REGISTERED = 'user.registered', // 用户注册成功
  USER_LOGIN = 'user.login', // 用户登录（可选）
  USER_PASSWORD_CHANGED = 'user.password_changed', // 密码修改
  USER_PROFILE_UPDATED = 'user.profile_updated', // 个人信息更新

  // ========== 系统相关 ==========
  SYSTEM_MAINTENANCE = 'system.maintenance', // 系统维护通知
  SYSTEM_ANNOUNCEMENT = 'system.announcement', // 系统公告
  SYSTEM_UPDATE = 'system.update', // 系统更新
  SYSTEM_SECURITY_ALERT = 'system.security_alert', // 安全警报
}

/**
 * 通知类别（高层分类）
 * 用于简单分组
 */
export enum NotificationCategory {
  SYSTEM = 'system',
  DEVICE = 'device',
  APP = 'app',
  BILLING = 'billing',
  USER = 'user',
  ALERT = 'alert',
  MESSAGE = 'message',
}

/**
 * 从详细通知类型获取类别
 */
export function getNotificationCategory(type: NotificationType): NotificationCategory {
  const typeStr = type.toString();
  
  if (typeStr.startsWith('device.')) {
    return NotificationCategory.DEVICE;
  } else if (typeStr.startsWith('app.')) {
    return NotificationCategory.APP;
  } else if (typeStr.startsWith('billing.')) {
    return NotificationCategory.BILLING;
  } else if (typeStr.startsWith('user.')) {
    return NotificationCategory.USER;
  } else if (typeStr.startsWith('system.')) {
    return NotificationCategory.SYSTEM;
  } else {
    return NotificationCategory.ALERT;
  }
}
