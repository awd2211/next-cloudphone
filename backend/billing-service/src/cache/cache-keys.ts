/**
 * 缓存键生成器 (Billing Service)
 * 统一管理所有缓存键的命名规则
 */
export class CacheKeys {
  private static readonly PREFIX = 'billing-service';

  // ========== 余额相关 ==========

  /**
   * 用户余额缓存键
   * @param userId 用户 ID
   */
  static userBalance(userId: string): string {
    return `${this.PREFIX}:balance:${userId}`;
  }

  /**
   * 余额统计缓存键
   * @param userId 用户 ID
   */
  static balanceStats(userId: string): string {
    return `${this.PREFIX}:balance:stats:${userId}`;
  }

  /**
   * 用户交易列表缓存键
   * @param userId 用户 ID
   * @param page 页码
   * @param limit 每页数量
   */
  static balanceTransactions(userId: string, page: number = 1, limit: number = 10): string {
    return `${this.PREFIX}:balance:transactions:${userId}:${page}:${limit}`;
  }

  /**
   * 清除用户余额相关的所有缓存
   * @param userId 用户 ID
   */
  static userBalancePattern(userId: string): string {
    return `${this.PREFIX}:balance:${userId}*`;
  }

  // ========== 发票相关 ==========

  /**
   * 发票详情缓存键
   * @param invoiceId 发票 ID
   */
  static invoice(invoiceId: string): string {
    return `${this.PREFIX}:invoice:${invoiceId}`;
  }

  /**
   * 用户发票列表缓存键
   * @param userId 用户 ID
   * @param status 发票状态（可选）
   * @param page 页码
   * @param limit 每页数量
   */
  static invoiceList(
    userId: string,
    status?: string,
    page: number = 1,
    limit: number = 10
  ): string {
    const statusPart = status || 'all';
    return `${this.PREFIX}:invoice:list:${userId}:${statusPart}:${page}:${limit}`;
  }

  /**
   * 清除用户发票相关的所有缓存
   * @param userId 用户 ID
   */
  static userInvoicePattern(userId: string): string {
    return `${this.PREFIX}:invoice:*:${userId}:*`;
  }

  // ========== 支付相关 ==========

  /**
   * 支付订单详情缓存键
   * @param orderId 订单 ID
   */
  static paymentOrder(orderId: string): string {
    return `${this.PREFIX}:payment:order:${orderId}`;
  }

  /**
   * 用户支付记录列表缓存键
   * @param userId 用户 ID
   * @param page 页码
   * @param limit 每页数量
   */
  static paymentList(userId: string, page: number = 1, limit: number = 10): string {
    return `${this.PREFIX}:payment:list:${userId}:${page}:${limit}`;
  }

  /**
   * 支付统计缓存键
   * @param userId 用户 ID
   */
  static paymentStats(userId: string): string {
    return `${this.PREFIX}:payment:stats:${userId}`;
  }

  // ========== 计费规则相关 ==========

  /**
   * 计费规则详情缓存键
   * @param ruleId 规则 ID
   */
  static billingRule(ruleId: string): string {
    return `${this.PREFIX}:rule:${ruleId}`;
  }

  /**
   * 计费规则列表缓存键
   */
  static billingRuleList(): string {
    return `${this.PREFIX}:rule:list`;
  }

  // ========== 统计相关 ==========

  /**
   * 用户账单统计缓存键
   * @param userId 用户 ID
   * @param startDate 开始日期 (YYYY-MM-DD)
   * @param endDate 结束日期 (YYYY-MM-DD)
   */
  static userBillingStats(userId: string, startDate: string, endDate: string): string {
    return `${this.PREFIX}:stats:user:${userId}:${startDate}:${endDate}`;
  }

  /**
   * 全局统计缓存键
   * @param type 统计类型 (revenue, transactions, users)
   */
  static globalStats(type: string): string {
    return `${this.PREFIX}:stats:global:${type}`;
  }

  // ========== 用量计量相关 ==========

  /**
   * 用户用量记录缓存键
   * @param userId 用户 ID
   */
  static userMeteringData(userId: string): string {
    return `${this.PREFIX}:metering:${userId}`;
  }

  // ========== 快速列表相关 ==========

  /**
   * 套餐快速列表缓存键（用于下拉框等UI组件）
   */
  static readonly PLAN_QUICK_LIST = `${CacheKeys.PREFIX}:plan:quick-list`;

  /**
   * 订单快速列表缓存键
   */
  static readonly ORDER_QUICK_LIST = `${CacheKeys.PREFIX}:order:quick-list`;

  // ========== 仪表盘统计相关 (新增) ==========

  /**
   * 仪表盘综合统计缓存键
   */
  static readonly DASHBOARD_STATS = `${CacheKeys.PREFIX}:dashboard:stats`;

  /**
   * 用户使用量预测缓存键
   * @param userId 用户 ID
   * @param forecastDays 预测天数
   * @param historicalDays 历史天数
   */
  static usageForecast(userId: string, forecastDays: number, historicalDays: number): string {
    return `${this.PREFIX}:dashboard:forecast:${userId}:${forecastDays}:${historicalDays}`;
  }

  /**
   * 用户成本预警缓存键
   * @param userId 用户 ID
   */
  static costWarning(userId: string): string {
    return `${this.PREFIX}:dashboard:warning:${userId}`;
  }

  /**
   * 用户预警配置缓存键
   * @param userId 用户 ID
   */
  static warningConfig(userId: string): string {
    return `${this.PREFIX}:dashboard:config:${userId}`;
  }

  // ========== Stats统计相关 (新增) ==========

  /**
   * 在线设备数缓存键
   */
  static readonly ONLINE_DEVICES_COUNT = `${CacheKeys.PREFIX}:stats:devices:online`;

  /**
   * 设备状态分布缓存键
   */
  static readonly DEVICE_STATUS_DISTRIBUTION = `${CacheKeys.PREFIX}:stats:devices:distribution`;

  /**
   * 总用户数缓存键
   */
  static readonly TOTAL_USERS_COUNT = `${CacheKeys.PREFIX}:stats:users:total`;

  /**
   * 今日新增用户缓存键
   */
  static readonly TODAY_NEW_USERS = `${CacheKeys.PREFIX}:stats:users:today`;

  /**
   * 用户活跃度统计缓存键
   * @param days 天数
   */
  static userActivity(days: number): string {
    return `${this.PREFIX}:stats:users:activity:${days}`;
  }

  /**
   * 用户增长统计缓存键
   * @param days 天数
   */
  static userGrowth(days: number): string {
    return `${this.PREFIX}:stats:users:growth:${days}`;
  }

  /**
   * 今日收入缓存键
   */
  static readonly TODAY_REVENUE = `${CacheKeys.PREFIX}:stats:revenue:today`;

  /**
   * 本月收入缓存键
   */
  static readonly MONTH_REVENUE = `${CacheKeys.PREFIX}:stats:revenue:month`;

  /**
   * 收入趋势缓存键
   * @param days 天数
   */
  static revenueTrend(days: number): string {
    return `${this.PREFIX}:stats:revenue:trend:${days}`;
  }

  /**
   * 套餐分布统计缓存键
   */
  static readonly PLAN_DISTRIBUTION = `${CacheKeys.PREFIX}:stats:plans:distribution`;

  /**
   * 全局统计概览缓存键
   */
  static readonly STATS_OVERVIEW = `${CacheKeys.PREFIX}:stats:overview`;

  /**
   * 性能统计缓存键
   */
  static readonly STATS_PERFORMANCE = `${CacheKeys.PREFIX}:stats:performance`;
}

/**
 * 缓存 TTL 配置（秒）
 */
export const CacheTTL = {
  // 余额相关 - 短时间缓存（频繁变动）
  USER_BALANCE: 30, // 用户余额: 30 秒
  BALANCE_STATS: 60, // 余额统计: 1 分钟
  BALANCE_TRANSACTIONS: 120, // 交易记录: 2 分钟

  // 发票相关 - 中等时间缓存（已生成的发票不变）
  INVOICE: 600, // 发票详情: 10 分钟
  INVOICE_LIST: 300, // 发票列表: 5 分钟

  // 支付相关 - 短时间缓存
  PAYMENT_ORDER: 180, // 支付订单: 3 分钟
  PAYMENT_LIST: 300, // 支付列表: 5 分钟
  PAYMENT_STATS: 300, // 支付统计: 5 分钟

  // 计费规则 - 长时间缓存（很少变动）
  BILLING_RULE: 1800, // 计费规则: 30 分钟
  BILLING_RULE_LIST: 1800, // 规则列表: 30 分钟

  // 统计数据 - 中等时间缓存
  USER_STATS: 300, // 用户统计: 5 分钟
  GLOBAL_STATS: 600, // 全局统计: 10 分钟

  // 用量计量 - 短时间缓存
  METERING_DATA: 60, // 用量数据: 1 分钟

  // 快速列表 - 短时间缓存（用于下拉框等UI组件）
  QUICK_LIST: 60, // 快速列表: 1 分钟

  // ========== Dashboard 相关 (新增) ==========
  DASHBOARD_STATS: 60, // 仪表盘统计: 1 分钟
  USAGE_FORECAST: 300, // 使用量预测: 5 分钟（计算密集）
  COST_WARNING: 180, // 成本预警: 3 分钟
  WARNING_CONFIG: 600, // 预警配置: 10 分钟（很少变动）

  // ========== Stats 相关 (新增) ==========
  ONLINE_DEVICES: 30, // 在线设备数: 30 秒（高频变化）
  DEVICE_DISTRIBUTION: 60, // 设备状态分布: 1 分钟
  TOTAL_USERS: 120, // 总用户数: 2 分钟
  TODAY_NEW_USERS: 60, // 今日新增用户: 1 分钟
  USER_ACTIVITY: 300, // 用户活跃度: 5 分钟
  USER_GROWTH: 600, // 用户增长: 10 分钟（趋势数据）
  TODAY_REVENUE: 60, // 今日收入: 1 分钟
  MONTH_REVENUE: 180, // 本月收入: 3 分钟
  REVENUE_TREND: 600, // 收入趋势: 10 分钟
  PLAN_DISTRIBUTION: 300, // 套餐分布: 5 分钟
  STATS_OVERVIEW: 60, // 统计概览: 1 分钟（仪表盘核心数据）
  STATS_PERFORMANCE: 30, // 性能统计: 30 秒（实时性要求高）
} as const;
