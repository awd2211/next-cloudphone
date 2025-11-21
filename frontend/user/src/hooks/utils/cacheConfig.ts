/**
 * React Query 缓存配置常量
 * 统一管理不同类型数据的缓存策略
 */

/**
 * 缓存时间配置（毫秒）
 */
export const CacheTime = {
  /** 5 秒 - 实时性要求高的数据 */
  SHORT: 5 * 1000,

  /** 30 秒 - 常规数据 */
  MEDIUM: 30 * 1000,

  /** 1 分钟 - 变化较慢的数据 */
  LONG: 60 * 1000,

  /** 5 分钟 - 变化很慢的数据 */
  VERY_LONG: 5 * 60 * 1000,

  /** 15 分钟 - 基本不变的数据 */
  STATIC: 15 * 60 * 1000,

  /** 永久缓存 */
  INFINITE: Infinity,
} as const;

/**
 * 不同数据类型的推荐缓存时间
 * 包含实体特定配置和通用时间常量
 */
export const StaleTimeConfig = {
  // ==================== 通用时间常量 ====================
  /** 5 秒 - 实时性要求高的数据 */
  SHORT: CacheTime.SHORT,

  /** 30 秒 - 常规数据 */
  MEDIUM: CacheTime.MEDIUM,

  /** 1 分钟 - 变化较慢的数据 */
  LONG: CacheTime.LONG,

  /** 5 分钟 - 变化很慢的数据 */
  VERY_LONG: CacheTime.VERY_LONG,

  /** 15 分钟 - 基本不变的数据 */
  STATIC: CacheTime.STATIC,

  // ==================== 实体特定配置 ====================
  /** 设备列表 - 30秒 */
  devices: CacheTime.MEDIUM,

  /** 设备详情 - 30秒 */
  deviceDetail: CacheTime.MEDIUM,

  /** 设备统计 - 1分钟 */
  deviceStats: CacheTime.LONG,

  /** 账单列表 - 30秒 */
  bills: CacheTime.MEDIUM,

  /** 账单详情 - 1分钟 */
  billDetail: CacheTime.LONG,

  /** 账户余额 - 5秒（高实时性） */
  balance: CacheTime.SHORT,

  /** 支付方法 - 5分钟 */
  paymentMethods: CacheTime.VERY_LONG,

  /** 代理列表 - 30秒 */
  proxies: CacheTime.MEDIUM,

  /** 代理统计 - 30秒 */
  proxyStats: CacheTime.MEDIUM,

  /** 短信列表 - 30秒 */
  sms: CacheTime.MEDIUM,

  /** 工单列表 - 30秒 */
  tickets: CacheTime.MEDIUM,

  /** 工单详情 - 30秒 */
  ticketDetail: CacheTime.MEDIUM,

  /** 订单列表 - 1分钟 */
  orders: CacheTime.LONG,

  /** 订单详情 - 1分钟 */
  orderDetail: CacheTime.LONG,

  /** API Keys - 5分钟 */
  apiKeys: CacheTime.VERY_LONG,

  /** 设备快照 - 1分钟 */
  snapshots: CacheTime.LONG,

  /** 设备模板 - 5分钟 */
  templates: CacheTime.VERY_LONG,

  /** 已安装应用 - 1分钟 */
  installedApps: CacheTime.LONG,

  /** 应用市场 - 5分钟 */
  appMarket: CacheTime.VERY_LONG,

  /** 用户信息 - 5分钟 */
  userProfile: CacheTime.VERY_LONG,

  /** 系统配置 - 15分钟 */
  systemConfig: CacheTime.STATIC,

  /** 价格信息 - 15分钟 */
  pricing: CacheTime.STATIC,

  /** 活动列表 - 30秒 */
  activities: CacheTime.MEDIUM,

  /** 通知列表 - 30秒 */
  notifications: CacheTime.MEDIUM,

  /** 统计数据 - 1分钟 */
  stats: CacheTime.LONG,

  /** 帮助文档 - 15分钟 */
  help: CacheTime.STATIC,

  /** 导出任务 - 30秒 */
  exports: CacheTime.MEDIUM,

  /** 套餐计划 - 5分钟 */
  plans: CacheTime.VERY_LONG,

  /** 推荐 - 30秒 */
  referrals: CacheTime.MEDIUM,
} as const;

/**
 * 垃圾回收时间（gcTime）
 * 数据在缓存中保留多久才会被清理
 */
export const GcTimeConfig = {
  /** 默认 - 5 分钟 */
  default: 5 * 60 * 1000,

  /** 短期数据 - 1 分钟 */
  short: 60 * 1000,

  /** 长期数据 - 30 分钟 */
  long: 30 * 60 * 1000,
} as const;

/**
 * 轮询间隔配置
 */
export const RefetchIntervalConfig = {
  /** 实时监控 - 5 秒 */
  realtime: 5 * 1000,

  /** 快速刷新 - 10 秒 */
  fast: 10 * 1000,

  /** 常规刷新 - 30 秒 */
  normal: 30 * 1000,

  /** 慢速刷新 - 60 秒 */
  slow: 60 * 1000,
} as const;

/**
 * 重试配置
 */
export const RetryConfig = {
  /** 默认重试次数 */
  maxRetries: 3,

  /** 重试延迟（毫秒）*/
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
} as const;
