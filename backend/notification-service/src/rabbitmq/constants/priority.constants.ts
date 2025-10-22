/**
 * 消息优先级常量
 * RabbitMQ 支持 0-255 的优先级,数字越大优先级越高
 */

export enum MessagePriority {
  /** P0 - 紧急 (安全告警、系统故障、支付异常) */
  URGENT = 10,

  /** P1 - 高 (设备故障、应用崩溃、余额不足) */
  HIGH = 7,

  /** P2 - 中 (设备状态变更、应用安装完成) */
  MEDIUM = 5,

  /** P3 - 低 (营销通知、日报、一般信息) */
  LOW = 2,
}

/**
 * 事件类型到优先级的映射
 */
export const EVENT_PRIORITY_MAP: Record<string, MessagePriority> = {
  // ============ P0 紧急 ============
  // 安全相关
  'user.login_failed': MessagePriority.URGENT,
  'user.password_reset_requested': MessagePriority.URGENT,

  // 系统故障
  'device.error': MessagePriority.URGENT,
  'device.connection_lost': MessagePriority.URGENT,

  // 支付异常
  'billing.payment_failed': MessagePriority.URGENT,
  'billing.invoice_overdue': MessagePriority.URGENT,

  // ============ P1 高优先级 ============
  // 设备问题
  'device.creation_failed': MessagePriority.HIGH,

  // 应用问题
  'app.install_failed': MessagePriority.HIGH,
  'app.crashed': MessagePriority.HIGH,

  // 余额告警
  'billing.low_balance': MessagePriority.HIGH,
  'billing.consumption_warning': MessagePriority.HIGH,

  // ============ P2 中优先级 ============
  // 设备状态变更
  'device.created': MessagePriority.MEDIUM,
  'device.started': MessagePriority.MEDIUM,
  'device.stopped': MessagePriority.MEDIUM,
  'device.deleted': MessagePriority.MEDIUM,

  // 应用状态变更
  'app.installed': MessagePriority.MEDIUM,
  'app.updated': MessagePriority.MEDIUM,
  'app.uninstalled': MessagePriority.MEDIUM,

  // 支付成功
  'billing.payment_success': MessagePriority.MEDIUM,
  'billing.invoice_generated': MessagePriority.MEDIUM,

  // 用户关键操作
  'user.password_changed': MessagePriority.MEDIUM,
  'user.two_factor_enabled': MessagePriority.MEDIUM,

  // ============ P3 低优先级 ============
  // 用户一般操作
  'user.registered': MessagePriority.LOW,
  'user.profile_updated': MessagePriority.LOW,

  // 定时任务
  'scheduler.task_completed': MessagePriority.LOW,
  'scheduler.task_failed': MessagePriority.LOW,

  // 媒体文件
  'media.file_uploaded': MessagePriority.LOW,
  'media.processing_completed': MessagePriority.LOW,

  // 系统通知
  'system.maintenance': MessagePriority.LOW,
  'system.update_available': MessagePriority.LOW,
};

/**
 * 获取事件的优先级
 * @param eventType 事件类型
 * @returns 优先级数值
 */
export function getEventPriority(eventType: string): MessagePriority {
  return EVENT_PRIORITY_MAP[eventType] ?? MessagePriority.MEDIUM;
}

/**
 * 判断是否为紧急事件
 * @param eventType 事件类型
 * @returns 是否紧急
 */
export function isUrgentEvent(eventType: string): boolean {
  return getEventPriority(eventType) === MessagePriority.URGENT;
}

/**
 * 获取优先级对应的通道名称
 * @param priority 优先级
 * @returns 通道名称
 */
export function getChannelForPriority(priority: MessagePriority): string {
  if (priority === MessagePriority.URGENT) {
    return 'urgent';
  }
  return 'default';
}
