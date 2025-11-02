import {
  ProxyInfo,
  GetProxyOptions,
  ProxyUsageStats,
  HealthCheckResult,
} from './proxy.interface';

/**
 * 供应商配置接口
 */
export interface ProviderConfig {
  /** 供应商名称 */
  name: string;

  /** API URL */
  apiUrl: string;

  /** 用户名 */
  username?: string;

  /** 密码 */
  password?: string;

  /** API密钥 */
  apiKey?: string;

  /** 认证令牌 */
  token?: string;

  /** 超时时间（毫秒） */
  timeout?: number;

  /** 最大重试次数 */
  maxRetries?: number;

  /** 每GB成本（USD） */
  costPerGB: number;

  /** 是否启用 */
  enabled?: boolean;

  /** 优先级（数字越大优先级越高） */
  priority?: number;

  /** 额外配置 */
  extra?: Record<string, any>;
}

/**
 * 供应商接口
 * 所有代理供应商适配器必须实现此接口
 */
export interface IProxyProvider {
  /**
   * 初始化供应商
   * @param config 供应商配置
   */
  initialize(config: ProviderConfig): Promise<void>;

  /**
   * 获取供应商名称
   */
  getName(): string;

  /**
   * 获取代理列表
   * @param options 获取选项
   * @returns 代理信息数组
   */
  getProxyList(options?: GetProxyOptions): Promise<ProxyInfo[]>;

  /**
   * 验证代理是否可用
   * @param proxy 代理信息
   * @returns 是否可用
   */
  validateProxy(proxy: ProxyInfo): Promise<boolean>;

  /**
   * 检查代理健康状态
   * @param proxy 代理信息
   * @returns 健康检查结果
   */
  checkHealth(proxy: ProxyInfo): Promise<HealthCheckResult>;

  /**
   * 获取使用统计
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 使用统计信息
   */
  getUsageStats(startDate?: Date, endDate?: Date): Promise<ProxyUsageStats>;

  /**
   * 刷新代理池
   * 从供应商获取最新的代理列表并更新本地池
   * @param minSize 最小池大小
   * @returns 新增代理数量
   */
  refreshPool(minSize?: number): Promise<number>;

  /**
   * 测试供应商API连接
   * @returns 是否连接成功
   */
  testConnection(): Promise<boolean>;

  /**
   * 获取可用地区列表
   * @returns 地区列表
   */
  getAvailableRegions(): Promise<Region[]>;

  /**
   * 估算成本
   * @param bandwidthMB 预计带宽使用（MB）
   * @returns 预计成本（USD）
   */
  estimateCost(bandwidthMB: number): Promise<number>;

  /**
   * 释放代理（如果供应商需要）
   * @param proxyId 代理ID
   */
  releaseProxy(proxyId: string): Promise<void>;
}

/**
 * 地区信息
 */
export interface Region {
  /** 国家代码 */
  country: string;

  /** 国家名称 */
  countryName: string;

  /** 城市列表 */
  cities?: string[];

  /** 州/省列表 */
  states?: string[];

  /** 可用代理数量 */
  availableProxies?: number;

  /** 该地区成本 */
  costPerGB?: number;
}

/**
 * 供应商状态
 */
export interface ProviderStatus {
  /** 供应商名称 */
  name: string;

  /** 是否在线 */
  online: boolean;

  /** 是否健康 */
  healthy: boolean;

  /** 最后检查时间 */
  lastCheck: Date;

  /** 可用代理数 */
  availableProxies: number;

  /** 正在使用的代理数 */
  inUseProxies: number;

  /** 今日请求数 */
  todayRequests: number;

  /** 今日成本 */
  todayCost: number;

  /** 成功率 */
  successRate: number;

  /** 平均响应时间 */
  avgResponseTime: number;

  /** 错误信息（如果不健康） */
  error?: string;
}

/**
 * 供应商统计信息
 */
export interface ProviderStatistics {
  /** 供应商名称 */
  provider: string;

  /** 时间段 */
  period: {
    start: Date;
    end: Date;
  };

  /** 请求统计 */
  requests: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };

  /** 带宽统计 */
  bandwidth: {
    totalMB: number;
    avgPerRequest: number;
  };

  /** 成本统计 */
  cost: {
    total: number;
    avgPerRequest: number;
    avgPerGB: number;
  };

  /** 性能统计 */
  performance: {
    avgLatency: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
  };

  /** 代理统计 */
  proxies: {
    total: number;
    active: number;
    failed: number;
    avgQuality: number;
  };
}

/**
 * API响应接口
 */
export interface ProviderAPIResponse<T = any> {
  /** 是否成功 */
  success: boolean;

  /** 响应数据 */
  data?: T;

  /** 错误信息 */
  error?: string;

  /** 错误代码 */
  errorCode?: string;

  /** 响应时间（毫秒） */
  responseTime: number;

  /** 剩余配额 */
  remainingQuota?: number;

  /** 速率限制信息 */
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: Date;
  };
}
