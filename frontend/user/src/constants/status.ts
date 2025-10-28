/**
 * 状态相关常量
 */

// 设备状态
export const DEVICE_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  STOPPED: 'stopped',
  ERROR: 'error',
} as const;

export const DEVICE_STATUS_TEXT = {
  [DEVICE_STATUS.IDLE]: '空闲',
  [DEVICE_STATUS.RUNNING]: '运行中',
  [DEVICE_STATUS.STOPPED]: '已停止',
  [DEVICE_STATUS.ERROR]: '错误',
} as const;

export const DEVICE_STATUS_COLOR = {
  [DEVICE_STATUS.IDLE]: 'default',
  [DEVICE_STATUS.RUNNING]: 'success',
  [DEVICE_STATUS.STOPPED]: 'warning',
  [DEVICE_STATUS.ERROR]: 'error',
} as const;

// 用户状态
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BANNED: 'banned',
} as const;

export const USER_STATUS_TEXT = {
  [USER_STATUS.ACTIVE]: '正常',
  [USER_STATUS.INACTIVE]: '未激活',
  [USER_STATUS.BANNED]: '已封禁',
} as const;

export const USER_STATUS_COLOR = {
  [USER_STATUS.ACTIVE]: 'success',
  [USER_STATUS.INACTIVE]: 'default',
  [USER_STATUS.BANNED]: 'error',
} as const;

// 订单状态
export const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  EXPIRED: 'expired',
} as const;

export const ORDER_STATUS_TEXT = {
  [ORDER_STATUS.PENDING]: '待支付',
  [ORDER_STATUS.PAID]: '已支付',
  [ORDER_STATUS.CANCELLED]: '已取消',
  [ORDER_STATUS.REFUNDED]: '已退款',
  [ORDER_STATUS.EXPIRED]: '已过期',
} as const;

export const ORDER_STATUS_COLOR = {
  [ORDER_STATUS.PENDING]: 'warning',
  [ORDER_STATUS.PAID]: 'success',
  [ORDER_STATUS.CANCELLED]: 'default',
  [ORDER_STATUS.REFUNDED]: 'error',
  [ORDER_STATUS.EXPIRED]: 'default',
} as const;

// 支付状态
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
  REFUNDING: 'refunding',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
} as const;

export const PAYMENT_STATUS_TEXT = {
  [PAYMENT_STATUS.PENDING]: '待支付',
  [PAYMENT_STATUS.PROCESSING]: '处理中',
  [PAYMENT_STATUS.SUCCESS]: '成功',
  [PAYMENT_STATUS.FAILED]: '失败',
  [PAYMENT_STATUS.REFUNDING]: '退款中',
  [PAYMENT_STATUS.REFUNDED]: '已退款',
  [PAYMENT_STATUS.CANCELLED]: '已取消',
} as const;

export const PAYMENT_STATUS_COLOR = {
  [PAYMENT_STATUS.PENDING]: 'warning',
  [PAYMENT_STATUS.PROCESSING]: 'processing',
  [PAYMENT_STATUS.SUCCESS]: 'success',
  [PAYMENT_STATUS.FAILED]: 'error',
  [PAYMENT_STATUS.REFUNDING]: 'warning',
  [PAYMENT_STATUS.REFUNDED]: 'default',
  [PAYMENT_STATUS.CANCELLED]: 'default',
} as const;
