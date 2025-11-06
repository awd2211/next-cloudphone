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
} as const;
