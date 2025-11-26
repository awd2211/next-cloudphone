/**
 * 代理服务 API
 * 使用 api 包装器自动解包响应
 * 提供代理池管理、供应商配置、成本监控等功能
 */
import { api } from '@/utils/api';
import request from '@/utils/request';

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
  // 真实出口 IP 信息
  exitIp?: string;
  exitCountry?: string;
  exitCountryName?: string;
  exitCity?: string;
  exitIsp?: string;
  ipCheckedAt?: string;
  // 代理类型信息
  ispType?: 'residential' | 'datacenter' | 'mobile' | 'isp' | 'unknown';
  proxyTypeDisplay?: string; // 代理类型显示名称（如 "住宅代理"）
  metadata?: Record<string, any>;
}

export interface ProxyStats {
  total: number;
  available: number;
  inUse: number;
  unavailable?: number;  // 兼容旧字段
  unhealthy?: number;    // 后端实际返回字段
  avgQuality?: number;   // 可能不存在
  avgLatency?: number;   // 可能不存在
  averageQuality?: number;  // 后端实际字段名
  averageLatency?: number;  // 后端实际字段名
  totalBandwidth?: number;
  totalCost?: number;
  providerBreakdown?: Record<string, number>;  // 后端返回的供应商分布
  countryBreakdown?: Record<string, number>;   // 后端返回的国家分布
  lastRefresh?: string;  // 最后刷新时间
}

export interface ProxyListParams {
  page?: number;
  limit?: number;
  status?: string;
  protocol?: string;
  provider?: string;
  country?: string;
  state?: string;      // 州/省 (如: california)
  city?: string;       // 城市
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
 * 注意：后端使用 offset 而不是 page，这里进行转换
 */
export const getProxyList = (params?: ProxyListParams): Promise<ProxyListResponse> => {
  // 将 page 转换为 offset (后端期望 offset 而不是 page)
  const { page, limit = 20, ...rest } = params || {};
  const offset = page ? (page - 1) * limit : undefined;

  return api.get<ProxyListResponse>('/proxy/list', {
    params: { ...rest, limit, offset }
  });
};

/**
 * 获取代理池统计
 */
export const getProxyStats = (): Promise<ProxyStats> =>
  api.get<ProxyStats>('/proxy/stats/pool');

/**
 * 释放代理
 */
export const releaseProxy = (proxyId: string): Promise<void> =>
  api.post<void>(`/proxy/release/${proxyId}`);

/**
 * 测试代理
 */
export const testProxy = (proxyId: string): Promise<any> =>
  api.post(`/proxy/test/${proxyId}`);

/**
 * 刷新代理池 (管理员)
 */
export const refreshProxyPool = (): Promise<void> =>
  api.post<void>('/proxy/admin/refresh-pool');

/**
 * 批量释放代理
 */
export const batchReleaseProxies = (proxyIds: string[]): Promise<void> =>
  api.post<void>('/proxy/batch/release', { proxyIds });

/**
 * 批量测试代理
 */
export const batchTestProxies = (proxyIds: string[]): Promise<any> =>
  api.post('/proxy/batch/test', { proxyIds });

// ==================== 供应商管理 ====================

/**
 * 获取代理供应商列表
 */
export const getProxyProviders = (): Promise<ProxyProvider[]> =>
  api.get<ProxyProvider[]>('/proxy/providers');

/**
 * 获取供应商详情
 */
export const getProxyProvider = (providerId: string): Promise<ProxyProvider> =>
  api.get<ProxyProvider>(`/proxy/providers/${providerId}`);

/**
 * 获取供应商的解密配置（用于编辑）
 */
export const getProxyProviderConfig = (providerId: string): Promise<Record<string, any>> =>
  api.get<Record<string, any>>(`/proxy/providers/${providerId}/config`);

/**
 * 创建代理供应商
 */
export const createProxyProvider = (data: CreateProxyProviderDto): Promise<ProxyProvider> =>
  api.post<ProxyProvider>('/proxy/providers', data);

/**
 * 更新代理供应商配置
 */
export const updateProxyProvider = (
  providerId: string,
  data: Partial<CreateProxyProviderDto>
): Promise<ProxyProvider> =>
  api.put<ProxyProvider>(`/proxy/providers/${providerId}`, data);

/**
 * 删除代理供应商
 */
export const deleteProxyProvider = (providerId: string): Promise<void> =>
  api.delete<void>(`/proxy/providers/${providerId}`);

/**
 * 启用/禁用供应商
 */
export const toggleProxyProvider = (providerId: string, enabled: boolean): Promise<any> =>
  api.patch(`/proxy/providers/${providerId}/toggle`, { enabled });

/**
 * 测试供应商连接
 */
export const testProxyProvider = (providerId: string): Promise<any> =>
  api.post(`/proxy/providers/${providerId}/test`);

/**
 * 获取供应商排名
 */
export const getProxyProviderRanking = (): Promise<ProxyProviderRanking[]> =>
  api.get<ProxyProviderRanking[]>('/proxy/providers/ranking');

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
}): Promise<ProxyUsageReport> =>
  api.get<ProxyUsageReport>('/proxy/reports/usage', { params });

/**
 * 导出使用报表 (使用 raw request 因为需要 blob)
 */
export const exportProxyUsageReport = (params: {
  startDate: string;
  endDate: string;
  format?: 'csv' | 'excel';
}): Promise<Blob> =>
  request.get('/proxy/reports/usage/export', {
    params,
    responseType: 'blob',
  });

// ==================== 成本监控 ====================

/**
 * 获取成本报表
 */
export const getProxyCostReport = (params: {
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
  provider?: string;
}): Promise<ProxyCostReport> =>
  api.get<ProxyCostReport>('/proxy/cost/report', { params });

/**
 * 导出成本报表 (使用 raw request 因为需要 blob)
 */
export const exportProxyCostReport = (params: {
  startDate: string;
  endDate: string;
  format?: 'csv' | 'excel';
}): Promise<Blob> =>
  request.get('/proxy/cost/export', {
    params,
    responseType: 'blob',
  });

/**
 * 获取成本统计
 */
export const getProxyCostStats = (params?: {
  period?: 'today' | 'week' | 'month' | 'year';
}): Promise<any> =>
  api.get('/proxy/cost/stats', { params });

/**
 * 获取成本趋势
 */
export const getProxyCostTrend = (params: {
  startDate: string;
  endDate: string;
  granularity?: 'hour' | 'day' | 'week';
}): Promise<any> =>
  api.get('/proxy/cost/trend', { params });

// ==================== 高级功能 ====================

/**
 * 获取代理地理位置分布
 */
export const getProxyGeoDistribution = (): Promise<any> =>
  api.get('/proxy/geo/distribution');

/**
 * 获取代理质量分布
 */
export const getProxyQualityDistribution = (): Promise<any> =>
  api.get('/proxy/quality/distribution');

/**
 * 获取代理使用历史
 */
export const getProxyUsageHistory = (proxyId: string, params?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<any> =>
  api.get(`/proxy/${proxyId}/history`, { params });

/**
 * 获取设备使用的代理
 */
export const getDeviceProxies = (deviceId: string): Promise<any> =>
  api.get(`/proxy/device/${deviceId}/proxies`);

/**
 * 为设备分配代理
 */
export const allocateProxyForDevice = (deviceId: string, params?: {
  country?: string;
  protocol?: string;
  minQuality?: number;
}): Promise<any> =>
  api.post(`/proxy/device/${deviceId}/allocate`, params);

/**
 * 释放设备的代理
 */
export const releaseDeviceProxy = (deviceId: string): Promise<void> =>
  api.post<void>(`/proxy/device/${deviceId}/release`);

/**
 * 获取代理告警
 */
export const getProxyAlerts = (params?: {
  page?: number;
  limit?: number;
  status?: 'active' | 'resolved';
  severity?: 'low' | 'medium' | 'high' | 'critical';
}): Promise<any> =>
  api.get('/proxy/alerts', { params });

/**
 * 确认告警
 */
export const acknowledgeProxyAlert = (alertId: string): Promise<void> =>
  api.post<void>(`/proxy/alerts/${alertId}/acknowledge`);

/**
 * 解决告警
 */
export const resolveProxyAlert = (alertId: string, note?: string): Promise<void> =>
  api.post<void>(`/proxy/alerts/${alertId}/resolve`, { note });

// ==================== 智能调度 ====================

/**
 * 获取智能调度建议
 */
export const getProxySchedulingSuggestion = (params: {
  deviceId?: string;
  country?: string;
  targetUrl?: string;
}): Promise<any> =>
  api.post('/proxy/intelligence/suggest', params);

/**
 * 获取代理性能预测
 */
export const getProxyPerformancePrediction = (proxyId: string, params?: {
  targetUrl?: string;
  timeWindow?: number;
}): Promise<any> =>
  api.get(`/proxy/${proxyId}/prediction`, { params });

/**
 * 获取最优代理池配置建议
 */
export const getOptimalPoolConfig = (): Promise<any> =>
  api.get('/proxy/intelligence/optimal-config');

// ==================== 代理信息解析 ====================

/**
 * 代理信息解析结果
 */
export interface ProxyParsedInfo {
  proxyType: 'residential' | 'datacenter' | 'mobile' | 'isp' | 'unknown';
  country?: string;
  countryName?: string;
  city?: string;
  state?: string;
  provider: string;
  sessionType?: 'rotating' | 'sticky';
  source: 'url' | 'config' | 'metadata';
}

/**
 * 解析单个代理信息（从 URL/配置解析，不进行网络检测）
 */
export const parseProxyInfo = (proxyId: string): Promise<{
  proxyId: string;
  parsedInfo: ProxyParsedInfo;
}> =>
  api.get(`/proxy/parse-info/${proxyId}`);

/**
 * 批量解析所有代理信息（即时解析，不进行网络检测）
 */
export const parseAllProxyInfo = (): Promise<{
  total: number;
  parsed: number;
  byType: Record<string, number>;
  byCountry: Record<string, number>;
  byProvider: Record<string, number>;
}> =>
  api.post('/proxy/admin/parse-all-info');

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
}): Promise<any> =>
  api.get('/proxy/audit-logs', { params });

/**
 * 导出审计日志 (使用 raw request 因为需要 blob)
 */
export const exportProxyAuditLogs = (params?: {
  startDate?: string;
  endDate?: string;
  format?: 'csv' | 'excel';
}): Promise<Blob> =>
  request.get('/proxy/audit-logs/export', {
    params,
    responseType: 'blob',
  });
