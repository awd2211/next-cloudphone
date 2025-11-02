/**
 * 代理信息接口
 * 统一的代理对象结构，供所有供应商适配器使用
 */
export interface ProxyInfo {
  /** 代理唯一标识 */
  id: string;

  /** 代理主机地址 */
  host: string;

  /** 代理端口 */
  port: number;

  /** 用户名（如果需要认证） */
  username?: string;

  /** 密码（如果需要认证） */
  password?: string;

  /** 协议类型 */
  protocol: 'http' | 'https' | 'socks5';

  /** 供应商名称 */
  provider: string;

  /** 地理位置信息 */
  location: {
    /** 国家代码 (ISO 3166-1 alpha-2) */
    country: string;
    /** 城市名称 */
    city?: string;
    /** 州/省名称 */
    state?: string;
    /** 纬度 */
    latitude?: number;
    /** 经度 */
    longitude?: number;
  };

  /** 代理质量分数 (0-100) */
  quality: number;

  /** 平均延迟（毫秒） */
  latency: number;

  /** 最后使用时间 */
  lastUsed?: Date;

  /** 是否正在使用 */
  inUse: boolean;

  /** 失败次数 */
  failureCount?: number;

  /** 每GB成本（USD） */
  costPerGB: number;

  /** 会话ID（用于会话保持） */
  sessionId?: string;

  /** 代理元数据 */
  metadata?: Record<string, any>;

  /** 创建时间 */
  createdAt: Date;

  /** 过期时间 */
  expiresAt?: Date;
}

/**
 * 代理筛选条件
 */
export interface ProxyCriteria {
  /** 国家代码 */
  country?: string;

  /** 城市名称 */
  city?: string;

  /** 州/省名称 */
  state?: string;

  /** 协议类型 */
  protocol?: 'http' | 'https' | 'socks5';

  /** 最低质量分数 */
  minQuality?: number;

  /** 最大延迟（毫秒） */
  maxLatency?: number;

  /** 是否需要会话保持 */
  sessionSticky?: boolean;

  /** 指定供应商 */
  provider?: string;

  /** 最大每GB成本 */
  maxCostPerGB?: number;
}

/**
 * 代理获取选项
 */
export interface GetProxyOptions {
  /** 国家代码 */
  country?: string;

  /** 城市名称 */
  city?: string;

  /** 获取数量限制 */
  limit?: number;

  /** 协议类型 */
  protocol?: 'http' | 'https' | 'socks5';

  /** 会话类型 */
  session?: 'rotating' | 'sticky';

  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 代理使用统计
 */
export interface ProxyUsageStats {
  /** 总请求数 */
  totalRequests: number;

  /** 成功请求数 */
  successfulRequests: number;

  /** 失败请求数 */
  failedRequests: number;

  /** 成功率 (0-1) */
  successRate: number;

  /** 总带宽使用（MB） */
  totalBandwidthMB: number;

  /** 总成本（USD） */
  totalCost: number;

  /** 平均延迟（毫秒） */
  averageLatency: number;

  /** 平均每请求成本 */
  avgCostPerRequest: number;

  /** 平均每GB成本 */
  avgCostPerGB: number;

  /** 统计时间范围 */
  periodStart: Date;
  periodEnd: Date;
}

/**
 * 代理池统计信息
 */
export interface PoolStats {
  /** 代理池总大小 */
  total: number;

  /** 正在使用的代理数 */
  inUse: number;

  /** 可用代理数 */
  available: number;

  /** 不健康代理数 */
  unhealthy: number;

  /** 按供应商分组 */
  providerBreakdown: Record<string, number>;

  /** 按国家分组 */
  countryBreakdown: Record<string, number>;

  /** 平均质量分数 */
  averageQuality: number;

  /** 平均延迟 */
  averageLatency: number;

  /** 最后刷新时间 */
  lastRefresh: Date;
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  /** 代理ID */
  proxyId: string;

  /** 是否健康 */
  healthy: boolean;

  /** 响应时间（毫秒） */
  responseTime: number;

  /** 检查时间 */
  checkedAt: Date;

  /** 错误信息（如果不健康） */
  error?: string;

  /** HTTP状态码 */
  statusCode?: number;
}

/**
 * 故障转移策略
 */
export enum FailoverStrategy {
  /** 立即切换到备用供应商 */
  IMMEDIATE = 'immediate',

  /** 重试当前供应商后再切换 */
  RETRY_FIRST = 'retry_first',

  /** 循环尝试所有供应商 */
  ROUND_ROBIN = 'round_robin',

  /** 基于质量分数选择 */
  QUALITY_BASED = 'quality_based',
}

/**
 * 负载均衡策略
 */
export enum LoadBalancingStrategy {
  /** 轮询 */
  ROUND_ROBIN = 'round_robin',

  /** 最少连接 */
  LEAST_CONNECTIONS = 'least_connections',

  /** 基于质量分数 */
  QUALITY_BASED = 'quality_based',

  /** 基于成本优化 */
  COST_OPTIMIZED = 'cost_optimized',

  /** 随机选择 */
  RANDOM = 'random',
}
