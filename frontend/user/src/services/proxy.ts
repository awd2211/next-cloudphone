import request from '@/utils/request';

/**
 * 代理服务 API (用户端)
 * 提供用户代理获取、查看、释放等功能
 */

// ==================== 类型定义 ====================

export interface ProxyRecord {
  id: string;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks5';
  provider: string;
  country?: string;
  city?: string;
  status: 'available' | 'in_use' | 'unavailable';
  quality: number; // 0-100
  latency?: number; // ms
  bandwidth?: number; // Mbps
  acquiredAt?: string;
  expiresAt?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProxyStats {
  total: number;
  active: number;
  expired: number;
  totalBandwidthUsed: number;
  totalCost: number;
}

export interface ProxyListParams {
  page?: number;
  limit?: number;
  status?: string;
  protocol?: string;
  country?: string;
}

export interface ProxyListResponse {
  data: ProxyRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface AcquireProxyDto {
  country?: string;
  protocol?: 'http' | 'https' | 'socks5';
  duration?: number; // minutes
  minQuality?: number;
}

export interface ProxyUsageHistory {
  id: string;
  proxyId: string;
  startTime: string;
  endTime?: string;
  bandwidthUsed: number; // MB
  cost: number;
  status: 'active' | 'completed' | 'expired';
}

// ==================== 代理管理 ====================

/**
 * 获取我的代理列表
 * 后端端点: GET /proxy/list
 */
export const getMyProxies = (params?: ProxyListParams) => {
  return request.get<ProxyListResponse>('/proxy/list', { params });
};

/**
 * 获取我的代理统计
 * 后端端点: GET /proxy/stats/pool
 */
export const getMyProxyStats = () => {
  return request.get<ProxyStats>('/proxy/stats/pool');
};

/**
 * 获取单个代理详情
 */
export const getProxyDetail = (proxyId: string) => {
  return request.get<ProxyRecord>(`/proxy/${proxyId}`);
};

/**
 * 获取代理 (分配新代理)
 */
export const acquireProxy = (data?: AcquireProxyDto) => {
  return request.post<ProxyRecord>('/proxy/acquire', data);
};

/**
 * 释放代理
 */
export const releaseProxy = (proxyId: string) => {
  return request.post(`/proxy/release/${proxyId}`);
};

/**
 * 测试代理连接
 */
export const testProxy = (proxyId: string) => {
  return request.post<{
    success: boolean;
    latency?: number;
    error?: string;
  }>(`/proxy/test/${proxyId}`);
};

/**
 * 续期代理
 */
export const renewProxy = (proxyId: string, duration: number) => {
  return request.post(`/proxy/${proxyId}/renew`, { duration });
};

// ==================== 使用记录 ====================

/**
 * 获取代理使用历史
 */
export const getProxyUsageHistory = (params?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}) => {
  return request.get<{
    data: ProxyUsageHistory[];
    meta: {
      total: number;
      page: number;
      limit: number;
    };
  }>('/proxy/usage-history', { params });
};

/**
 * 获取特定代理的使用记录
 */
export const getProxyUsageDetail = (proxyId: string) => {
  return request.get<ProxyUsageHistory[]>(`/proxy/${proxyId}/usage`);
};

// ==================== 代理列表查询 ====================

/**
 * 获取可用代理列表 (浏览购买)
 */
export const getAvailableProxies = (params?: {
  country?: string;
  protocol?: string;
  minQuality?: number;
  sortBy?: 'price' | 'quality' | 'latency';
  limit?: number;
}) => {
  return request.get<ProxyRecord[]>('/proxy/available', { params });
};

/**
 * 获取代理价格信息
 */
export const getProxyPricing = (params?: {
  country?: string;
  protocol?: string;
  duration?: number;
}) => {
  return request.get<{
    basePrice: number;
    pricePerHour: number;
    currency: string;
    discounts?: Array<{
      duration: number;
      discount: number;
    }>;
  }>('/proxy/pricing', { params });
};

// ==================== 批量操作 ====================

/**
 * 批量释放代理
 */
export const batchReleaseProxies = (proxyIds: string[]) => {
  return request.post<{
    results: Array<{
      proxyId: string;
      success: boolean;
      error?: string;
    }>;
  }>('/proxy/batch/release', { proxyIds });
};

/**
 * 批量测试代理
 */
export const batchTestProxies = (proxyIds: string[]) => {
  return request.post<{
    results: Array<{
      proxyId: string;
      success: boolean;
      latency?: number;
      error?: string;
    }>;
  }>('/proxy/batch/test', { proxyIds });
};

// ==================== 问题反馈 ====================

/**
 * 报告代理问题
 */
export const reportProxyIssue = (
  proxyId: string,
  issue: string,
  description?: string
) => {
  return request.post(`/proxy/${proxyId}/report-issue`, { issue, description });
};

// ==================== 类型别名 ====================

/**
 * 代理使用记录（别名）
 */
export type ProxyUsageRecord = ProxyUsageHistory;
