/**
 * 代理相关接口定义
 *
 * 这些接口用于微服务与 proxy-service 之间的通信
 */

/**
 * 代理协议类型
 */
export enum ProxyProtocol {
  HTTP = 'http',
  HTTPS = 'https',
  SOCKS5 = 'socks5',
}

/**
 * 代理位置信息
 */
export interface ProxyLocation {
  country: string;
  countryCode: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * 代理信息
 */
export interface ProxyInfo {
  /** 代理唯一标识 */
  id: string;
  /** 代理主机 */
  host: string;
  /** 代理端口 */
  port: number;
  /** 协议类型 */
  protocol: ProxyProtocol;
  /** 用户名（如需认证） */
  username?: string;
  /** 密码（如需认证） */
  password?: string;
  /** 代理提供商名称 */
  provider: string;
  /** 位置信息 */
  location: ProxyLocation;
  /** 质量分数 (0-100) */
  quality: number;
  /** 延迟 (ms) */
  latency: number;
  /** 每GB成本 (USD) */
  costPerGB: number;
  /** 是否正在使用 */
  inUse: boolean;
  /** 失败次数 */
  failureCount?: number;
  /** 最后使用时间 */
  lastUsed?: Date;
  /** 过期时间 */
  expiresAt?: Date;
}

/**
 * 代理筛选条件
 */
export interface ProxyCriteria {
  /** 国家代码 (如: US, CN, JP) */
  country?: string;
  /** 城市 */
  city?: string;
  /** 协议类型 */
  protocol?: ProxyProtocol;
  /** 最小质量分数 (0-100) */
  minQuality?: number;
  /** 最大延迟 (ms) */
  maxLatency?: number;
  /** 最大每GB成本 (USD) */
  maxCostPerGB?: number;
  /** 指定供应商 */
  provider?: string;
}

/**
 * 代理使用会话信息
 */
export interface ProxySession {
  /** 会话ID */
  sessionId: string;
  /** 代理信息 */
  proxy: ProxyInfo;
  /** 获取时间 */
  acquiredAt: Date;
}

/**
 * 代理池统计信息
 */
export interface PoolStats {
  /** 总代理数 */
  total: number;
  /** 使用中的代理数 */
  inUse: number;
  /** 可用代理数 */
  available: number;
  /** 不健康代理数 */
  unhealthy: number;
  /** 按供应商分组统计 */
  providerBreakdown: Record<string, number>;
  /** 按国家分组统计 */
  countryBreakdown: Record<string, number>;
  /** 平均质量分数 */
  averageQuality: number;
  /** 平均延迟 */
  averageLatency: number;
  /** 最后刷新时间 */
  lastRefresh: Date;
}

/**
 * 代理使用统计
 */
export interface ProxyUsageStats {
  /** 总使用次数 */
  totalUsage: number;
  /** 成功次数 */
  successCount: number;
  /** 失败次数 */
  failureCount: number;
  /** 总带宽使用 (MB) */
  totalBandwidthMB: number;
  /** 总成本 (USD) */
  totalCost: number;
  /** 按供应商统计 */
  byProvider: Record<
    string,
    {
      usage: number;
      success: number;
      failed: number;
      bandwidthMB: number;
      cost: number;
    }
  >;
  /** 按国家统计 */
  byCountry: Record<
    string,
    {
      usage: number;
      success: number;
      failed: number;
    }
  >;
}

/**
 * 获取代理的选项
 */
export interface AcquireProxyOptions {
  /** 筛选条件 */
  criteria?: ProxyCriteria;
  /** 超时时间 (ms) */
  timeout?: number;
  /** 是否验证代理可用性 */
  validate?: boolean;
}

/**
 * 代理操作结果
 */
export interface ProxyOperationResult<T = void> {
  /** 是否成功 */
  success: boolean;
  /** 数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 错误代码 */
  errorCode?: string;
}
