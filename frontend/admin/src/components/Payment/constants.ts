/**
 * Payment 模块常量定义
 */

// 默认分页配置
export const DEFAULT_PAGE_SIZE = 10;
export const DEFAULT_PAGE = 1;

// 表格配置
export const TABLE_SCROLL_X = 1800;

// 支付方式映射
export const PAYMENT_METHOD_MAP = {
  wechat: { color: 'green' as const, text: '微信支付' },
  alipay: { color: 'blue' as const, text: '支付宝' },
  balance: { color: 'orange' as const, text: '余额支付' },
  stripe: { color: 'purple' as const, text: 'Stripe' },
  paypal: { color: 'blue' as const, text: 'PayPal' },
  paddle: { color: 'cyan' as const, text: 'Paddle' },
} as const;

// 支付状态映射
export const PAYMENT_STATUS_MAP = {
  pending: { color: 'default' as const, text: '待支付' },
  processing: { color: 'orange' as const, text: '支付中' },
  success: { color: 'green' as const, text: '支付成功' },
  failed: { color: 'red' as const, text: '支付失败' },
  refunding: { color: 'orange' as const, text: '退款中' },
  refunded: { color: 'purple' as const, text: '已退款' },
  cancelled: { color: 'default' as const, text: '已取消' },
} as const;
