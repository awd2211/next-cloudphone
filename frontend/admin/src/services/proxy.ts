import request from '@/utils/request';

/**
 * 代理服务 API
 * 提供代理池管理、供应商配置、成本监控等功能
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
  status: 'available' | 'in_use' | 'unavailable' | 'testing';
  quality: number; // 0-100
  latency?: number; // ms
  bandwidth?: number; // Mbps
  lastTestTime?: string;
  lastUsedTime?: string;
  usageCount: number;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
  // Extended statistics for UI display
  totalRequests?: number;
  successfulRequests?: number;
  failedRequests?: number;
  totalBandwidth?: number; // Total bandwidth used in MB
  costPerGB?: number; // Cost per GB in USD
}

export interface ProxyStats {
  total: number;
  available: number;
  inUse: number;
  unavailable: number;
  avgQuality: number;
  avgLatency: number;
  totalBandwidth: number;
  totalCost: number;
}

export interface ProxyListParams {
  page?: number;
  limit?: number;
  status?: string;
  protocol?: string;
  provider?: string;
  country?: string;
  minQuality?: number;
  maxLatency?: number;
}

export interface ProxyListResponse {
  data: ProxyRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ProxyProvider {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config?: Record<string, any>;
  priority: number;
  costPerGB: number;
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  successRate: number;
  avgLatencyMs: number;
  hasConfig: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProxyProviderRanking {
  provider: string;
  score: number;
  rank: number;
  qualityScore: number;
  latencyScore: number;
  costScore: number;
  availabilityScore: number;
  totalProxies: number;
  availableProxies: number;
  avgQuality: number;
  avgLatency: number;
  avgCostPerGB: number;
  successRate: number;
}

export interface ProxyUsageReport {
  date: string;
  totalUsage: number;
  uniqueDevices: number;
  avgDuration: number;
  totalCost: number;
  byProvider: Array<{
    provider: string;
    usage: number;
    cost: number;
  }>;
  byCountry: Array<{
    country: string;
    usage: number;
  }>;
}

export interface ProxyCostReport {
  period: string;
  totalCost: number;
  avgCostPerProxy: number;
  avgCostPerDevice: number;
  byProvider: Array<{
    provider: string;
    cost: number;
    proxyCount: number;
    avgCostPerProxy: number;
  }>;
  trend: Array<{
    date: string;
    cost: number;
  }>;
}

export interface CreateProxyProviderDto {
  name: string;
  type: string;
  config: Record<string, any>;
  priority?: number;
  enabled?: boolean;
}

// ==================== 代理池管理 ====================

/**
 * 获取代理列表
 */
export const getProxyList = (params?: ProxyListParams) => {
  return request.get<ProxyListResponse>('/proxy/list', { params });
};

/**
 * 获取代理池统计
 */
export const getProxyStats = () => {
  return request.get<ProxyStats>('/proxy/stats/pool');
};

/**
 * 释放代理
 */
export const releaseProxy = (proxyId: string) => {
  return request.post(`/proxy/release/${proxyId}`);
};

/**
 * 测试代理
 */
export const testProxy = (proxyId: string) => {
  return request.post(`/proxy/test/${proxyId}`);
};

/**
 * 刷新代理池 (管理员)
 */
export const refreshProxyPool = () => {
  return request.post('/proxy/admin/refresh-pool');
};

/**
 * 批量释放代理
 */
export const batchReleaseProxies = (proxyIds: string[]) => {
  return request.post('/proxy/batch/release', { proxyIds });
};

/**
 * 批量测试代理
 */
export const batchTestProxies = (proxyIds: string[]) => {
  return request.post('/proxy/batch/test', { proxyIds });
};

// ==================== 供应商管理 ====================

/**
 * 获取代理供应商列表
 */
export const getProxyProviders = () => {
  return request.get<ProxyProvider[]>('/proxy/providers');
};

/**
 * 获取供应商详情
 */
export const getProxyProvider = (providerId: string) => {
  return request.get<ProxyProvider>(`/proxy/providers/${providerId}`);
};

/**
 * 创建代理供应商
 */
export const createProxyProvider = (data: CreateProxyProviderDto) => {
  return request.post<ProxyProvider>('/proxy/providers', data);
};

/**
 * 更新代理供应商配置
 */
export const updateProxyProvider = (providerId: string, data: Partial<CreateProxyProviderDto>) => {
  return request.put<ProxyProvider>(`/proxy/providers/${providerId}`, data);
};

/**
 * 删除代理供应商
 */
export const deleteProxyProvider = (providerId: string) => {
  return request.delete(`/proxy/providers/${providerId}`);
};

/**
 * 启用/禁用供应商
 */
export const toggleProxyProvider = (providerId: string, enabled: boolean) => {
  return request.patch(`/proxy/providers/${providerId}/toggle`, { enabled });
};

/**
 * 测试供应商连接
 */
export const testProxyProvider = (providerId: string) => {
  return request.post(`/proxy/providers/${providerId}/test`);
};

/**
 * 获取供应商排名
 */
export const getProxyProviderRanking = () => {
  return request.get<ProxyProviderRanking[]>('/proxy/providers/ranking');
};

// ==================== 使用报表 ====================

/**
 * 获取代理使用报表
 */
export const getProxyUsageReport = (params: {
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
  provider?: string;
  country?: string;
}) => {
  return request.get<ProxyUsageReport>('/proxy/reports/usage', { params });
};

/**
 * 导出使用报表
 */
export const exportProxyUsageReport = (params: {
  startDate: string;
  endDate: string;
  format?: 'csv' | 'excel';
}) => {
  return request.get('/proxy/reports/usage/export', {
    params,
    responseType: 'blob',
  });
};

// ==================== 成本监控 ====================

/**
 * 获取成本报表
 */
export const getProxyCostReport = (params: {
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
  provider?: string;
}) => {
  return request.get<ProxyCostReport>('/proxy/cost/report', { params });
};

/**
 * 导出成本报表
 */
export const exportProxyCostReport = (params: {
  startDate: string;
  endDate: string;
  format?: 'csv' | 'excel';
}) => {
  return request.get('/proxy/cost/export', {
    params,
    responseType: 'blob',
  });
};

/**
 * 获取成本统计
 */
export const getProxyCostStats = (params?: {
  period?: 'today' | 'week' | 'month' | 'year';
}) => {
  return request.get('/proxy/cost/stats', { params });
};

/**
 * 获取成本趋势
 */
export const getProxyCostTrend = (params: {
  startDate: string;
  endDate: string;
  granularity?: 'hour' | 'day' | 'week';
}) => {
  return request.get('/proxy/cost/trend', { params });
};

// ==================== 高级功能 ====================

/**
 * 获取代理地理位置分布
 */
export const getProxyGeoDistribution = () => {
  return request.get('/proxy/geo/distribution');
};

/**
 * 获取代理质量分布
 */
export const getProxyQualityDistribution = () => {
  return request.get('/proxy/quality/distribution');
};

/**
 * 获取代理使用历史
 */
export const getProxyUsageHistory = (proxyId: string, params?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}) => {
  return request.get(`/proxy/${proxyId}/history`, { params });
};

/**
 * 获取设备使用的代理
 */
export const getDeviceProxies = (deviceId: string) => {
  return request.get(`/proxy/device/${deviceId}/proxies`);
};

/**
 * 为设备分配代理
 */
export const allocateProxyForDevice = (deviceId: string, params?: {
  country?: string;
  protocol?: string;
  minQuality?: number;
}) => {
  return request.post(`/proxy/device/${deviceId}/allocate`, params);
};

/**
 * 释放设备的代理
 */
export const releaseDeviceProxy = (deviceId: string) => {
  return request.post(`/proxy/device/${deviceId}/release`);
};

/**
 * 获取代理告警
 */
export const getProxyAlerts = (params?: {
  page?: number;
  limit?: number;
  status?: 'active' | 'resolved';
  severity?: 'low' | 'medium' | 'high' | 'critical';
}) => {
  return request.get('/proxy/alerts', { params });
};

/**
 * 确认告警
 */
export const acknowledgeProxyAlert = (alertId: string) => {
  return request.post(`/proxy/alerts/${alertId}/acknowledge`);
};

/**
 * 解决告警
 */
export const resolveProxyAlert = (alertId: string, note?: string) => {
  return request.post(`/proxy/alerts/${alertId}/resolve`, { note });
};

// ==================== 智能调度 ====================

/**
 * 获取智能调度建议
 */
export const getProxySchedulingSuggestion = (params: {
  deviceId?: string;
  country?: string;
  targetUrl?: string;
}) => {
  return request.post('/proxy/intelligence/suggest', params);
};

/**
 * 获取代理性能预测
 */
export const getProxyPerformancePrediction = (proxyId: string, params?: {
  targetUrl?: string;
  timeWindow?: number;
}) => {
  return request.get(`/proxy/${proxyId}/prediction`, { params });
};

/**
 * 获取最优代理池配置建议
 */
export const getOptimalPoolConfig = () => {
  return request.get('/proxy/intelligence/optimal-config');
};

// ==================== 审计日志 ====================

/**
 * 获取代理操作日志
 */
export const getProxyAuditLogs = (params?: {
  page?: number;
  limit?: number;
  action?: string;
  userId?: string;
  proxyId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  return request.get('/proxy/audit-logs', { params });
};

/**
 * 导出审计日志
 */
export const exportProxyAuditLogs = (params?: {
  startDate?: string;
  endDate?: string;
  format?: 'csv' | 'excel';
}) => {
  return request.get('/proxy/audit-logs/export', {
    params,
    responseType: 'blob',
  });
};
