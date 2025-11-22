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
  BILLING_REFUND_SUCCESS = 'billing.refund_success', // 退款成功
  BILLING_REFUND_FAILED = 'billing.refund_failed', // 退款失败

  // ========== 用户相关 ==========
  USER_REGISTERED = 'user.registered', // 用户注册成功
  USER_LOGIN = 'user.login', // 用户登录（可选）
  USER_PASSWORD_CHANGED = 'user.password_changed', // 密码修改
  USER_PROFILE_UPDATED = 'user.profile_updated', // 个人信息更新
  USER_2FA_ENABLED = 'user.2fa_enabled', // 双因素认证已启用
  USER_2FA_DISABLED = 'user.2fa_disabled', // 双因素认证已禁用
  USER_LOGIN_ANOMALY = 'user.login_anomaly', // 异常登录检测
  USER_PASSWORD_RESET = 'user.password_reset', // 密码重置请求

  // ========== 短信服务相关 ==========
  SMS_NUMBER_ASSIGNED = 'sms.number_assigned', // 号码分配成功
  SMS_NUMBER_RELEASED = 'sms.number_released', // 号码已释放
  SMS_NUMBER_EXPIRING = 'sms.number_expiring', // 号码即将过期
  SMS_VERIFICATION_RECEIVED = 'sms.verification_received', // 收到验证码短信
  SMS_QUOTA_LOW = 'sms.quota_low', // 短信配额不足
  SMS_QUOTA_EXHAUSTED = 'sms.quota_exhausted', // 短信配额用尽

  // ========== 代理服务相关 ==========
  PROXY_ASSIGNED = 'proxy.assigned', // 代理分配成功
  PROXY_RELEASED = 'proxy.released', // 代理已释放
  PROXY_QUOTA_LOW = 'proxy.quota_low', // 代理流量配额不足
  PROXY_QUOTA_EXHAUSTED = 'proxy.quota_exhausted', // 代理流量用尽
  PROXY_CONNECTION_FAILED = 'proxy.connection_failed', // 代理连接失败
  PROXY_IP_CHANGED = 'proxy.ip_changed', // 代理 IP 变更

  // ========== 工单相关 ==========
  TICKET_CREATED = 'ticket.created', // 工单创建成功
  TICKET_REPLIED = 'ticket.replied', // 工单有新回复
  TICKET_STATUS_CHANGED = 'ticket.status_changed', // 工单状态变更
  TICKET_RESOLVED = 'ticket.resolved', // 工单已解决
  TICKET_CLOSED = 'ticket.closed', // 工单已关闭

  // ========== 快照相关 ==========
  SNAPSHOT_CREATED = 'snapshot.created', // 快照创建成功
  SNAPSHOT_RESTORED = 'snapshot.restored', // 快照恢复成功
  SNAPSHOT_DELETED = 'snapshot.deleted', // 快照已删除
  SNAPSHOT_FAILED = 'snapshot.failed', // 快照操作失败
  SNAPSHOT_QUOTA_LOW = 'snapshot.quota_low', // 快照配额不足

  // ========== 优惠券/推荐奖励相关 ==========
  COUPON_RECEIVED = 'coupon.received', // 获得优惠券
  COUPON_EXPIRING = 'coupon.expiring', // 优惠券即将过期
  COUPON_USED = 'coupon.used', // 优惠券已使用
  REFERRAL_REWARD = 'referral.reward', // 推荐奖励到账
  REFERRAL_SIGNUP = 'referral.signup', // 被推荐用户注册成功

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
  SMS = 'sms',
  PROXY = 'proxy',
  TICKET = 'ticket',
  SNAPSHOT = 'snapshot',
  COUPON = 'coupon',
  REFERRAL = 'referral',
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
  } else if (typeStr.startsWith('sms.')) {
    return NotificationCategory.SMS;
  } else if (typeStr.startsWith('proxy.')) {
    return NotificationCategory.PROXY;
  } else if (typeStr.startsWith('ticket.')) {
    return NotificationCategory.TICKET;
  } else if (typeStr.startsWith('snapshot.')) {
    return NotificationCategory.SNAPSHOT;
  } else if (typeStr.startsWith('coupon.')) {
    return NotificationCategory.COUPON;
  } else if (typeStr.startsWith('referral.')) {
    return NotificationCategory.REFERRAL;
  } else {
    return NotificationCategory.ALERT;
  }
}
