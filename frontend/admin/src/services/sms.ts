/**
 * SMS 短信服务 API
 * 使用 api 包装器自动解包响应
 * 提供短信接收、号码池管理、供应商配置等功能
 */
import { api } from '@/utils/api';
import request from '@/utils/request';

// ==================== 类型定义 ====================

export interface SMSRecord {
  id: string;
  phone: string;
  content: string;
  sender?: string;
  provider: string;
  status: 'pending' | 'received' | 'failed' | 'expired';
  deviceId?: string;
  userId?: string;
  verificationCode?: string;
  codeType?: 'login' | 'register' | 'payment' | 'bind' | 'reset' | 'other';
  receivedAt?: string;
  expiredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SMSStats {
  today: number;
  thisMonth: number;
  successRate: number;
  total: number;
}

export interface SMSListParams {
  page?: number;
  limit?: number;
  status?: string;
  provider?: string;
  phone?: string;
  deviceId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  codeType?: string;
}

export interface SMSListResponse {
  data: SMSRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface SMSNumber {
  id: string;
  phone: string;
  provider: string;
  country: string;
  status: 'available' | 'in_use' | 'cooldown' | 'unavailable';
  quality: number; // 0-100
  usageCount: number;
  lastUsedTime?: string;
  cooldownUntil?: string;
  createdAt: string;
  updatedAt: string;
  // Extended properties for UI display
  phoneNumber?: string;  // Alias or formatted display
  cost?: number;
  countryName?: string;
  countryCode?: string;
  serviceName?: string;
  deviceId?: string;
  userId?: string;
}

export interface SMSNumberListParams {
  page?: number;
  limit?: number;
  status?: string;
  provider?: string;
  country?: string;
  phone?: string;  // Filter by phone number
  minQuality?: number;
}

export interface SMSNumberListResponse {
  data: SMSNumber[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface SMSProvider {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, any>;
  priority: number;
  stats: {
    totalNumbers: number;
    availableNumbers: number;
    avgQuality: number;
    avgReceiveTime: number;
    successRate: number;
  };
  createdAt: string;
  updatedAt: string;
  // Extended properties for UI display
  displayName?: string;
  provider?: string;
  balance?: number;
  balanceThreshold?: number;
  totalRequests?: number;
  totalSuccess?: number;
  totalFailures?: number;
  successRate?: number;
}

export interface SMSProviderComparison {
  provider: string;
  totalNumbers: number;
  availableNumbers: number;
  avgQuality: number;
  avgReceiveTime: number;
  successRate: number;
  totalReceived: number;
  costPerSMS: number;
}

export interface SMSRealtimeStats {
  currentActive: number;
  receivingRate: number; // per minute
  avgReceiveTime: number; // seconds
  successRate: number;
  pendingCount: number;
  recentActivity: Array<{
    timestamp: string;
    count: number;
  }>;
}

export interface SMSStatistics {
  period: string;
  totalReceived: number;
  totalFailed: number;
  successRate: number;
  avgReceiveTime: number;
  byProvider: Array<{
    provider: string;
    count: number;
    successRate: number;
  }>;
  byCodeType: Array<{
    type: string;
    count: number;
  }>;
  trend: Array<{
    date: string;
    received: number;
    failed: number;
  }>;
}

export interface SendSMSDto {
  phone: string;
  content: string;
  provider?: string;
  priority?: 'low' | 'normal' | 'high';
  expireAfter?: number; // seconds
}

export interface CreateSMSProviderDto {
  name: string;
  type: string;
  config: Record<string, any>;
  priority?: number;
  enabled?: boolean;
}

// ==================== 短信记录管理 ====================

/**
 * 获取短信列表
 */
export const getSMSList = (params?: SMSListParams): Promise<SMSListResponse> =>
  api.get<SMSListResponse>('/sms', { params });

/**
 * 获取短信详情
 */
export const getSMSDetail = (id: string): Promise<SMSRecord> =>
  api.get<SMSRecord>(`/sms/${id}`);

/**
 * 发送短信
 */
export const sendSMS = (data: SendSMSDto): Promise<any> =>
  api.post('/sms/send', data);

/**
 * 批量发送短信
 */
export const batchSendSMS = (data: { messages: SendSMSDto[] }): Promise<any> =>
  api.post('/sms/batch/send', data);

/**
 * 删除短信记录
 */
export const deleteSMS = (id: string): Promise<void> =>
  api.delete(`/sms/${id}`);

/**
 * 批量删除短信记录
 */
export const batchDeleteSMS = (ids: string[]): Promise<void> =>
  api.post('/sms/batch/delete', { ids });

/**
 * 重新发送短信
 */
export const resendSMS = (id: string): Promise<any> =>
  api.post(`/sms/${id}/resend`);

// ==================== 号码池管理 ====================

/**
 * 获取号码列表
 */
export const getSMSNumbers = (params?: SMSNumberListParams): Promise<SMSNumberListResponse> =>
  api.get<SMSNumberListResponse>('/sms/numbers', { params });

/**
 * 获取号码详情
 */
export const getSMSNumber = (id: string): Promise<SMSNumber> =>
  api.get<SMSNumber>(`/sms/numbers/${id}`);

/**
 * 添加号码到池
 */
export const addSMSNumber = (data: {
  phone: string;
  provider: string;
  country?: string;
}): Promise<SMSNumber> =>
  api.post('/sms/numbers', data);

/**
 * 批量添加号码
 */
export const batchAddSMSNumbers = (data: {
  numbers: Array<{
    phone: string;
    provider: string;
    country?: string;
  }>;
}): Promise<any> =>
  api.post('/sms/numbers/batch', data);

/**
 * 删除号码
 */
export const deleteSMSNumber = (id: string): Promise<void> =>
  api.delete(`/sms/numbers/${id}`);

/**
 * 批量删除号码
 */
export const batchDeleteSMSNumbers = (ids: string[]): Promise<void> =>
  api.post('/sms/numbers/batch/delete', { ids });

/**
 * 释放号码（结束冷却）
 */
export const releaseSMSNumber = (id: string): Promise<void> =>
  api.post(`/sms/numbers/${id}/release`);

/**
 * 测试号码
 */
export const testSMSNumber = (id: string): Promise<any> =>
  api.post(`/sms/numbers/${id}/test`);

/**
 * 刷新号码池
 */
export const refreshSMSNumbers = (): Promise<void> =>
  api.post('/sms/numbers/refresh');

/**
 * 获取号码使用历史
 */
export const getSMSNumberHistory = (numberId: string, params?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<any> =>
  api.get(`/sms/numbers/${numberId}/history`, { params });

// ==================== 供应商管理 ====================

/**
 * 获取短信供应商列表
 */
export const getSMSProviders = (): Promise<SMSProvider[]> =>
  api.get<SMSProvider[]>('/sms/providers');

/**
 * 获取供应商详情
 */
export const getSMSProvider = (providerId: string): Promise<SMSProvider> =>
  api.get<SMSProvider>(`/sms/providers/${providerId}`);

/**
 * 创建短信供应商
 */
export const createSMSProvider = (data: CreateSMSProviderDto): Promise<SMSProvider> =>
  api.post<SMSProvider>('/sms/providers', data);

/**
 * 更新供应商配置
 */
export const updateSMSProvider = (
  providerId: string,
  data: Partial<CreateSMSProviderDto>
): Promise<SMSProvider> =>
  api.put<SMSProvider>(`/sms/providers/${providerId}`, data);

/**
 * 删除供应商
 */
export const deleteSMSProvider = (providerId: string): Promise<void> =>
  api.delete(`/sms/providers/${providerId}`);

/**
 * 启用/禁用供应商
 */
export const toggleSMSProvider = (providerId: string, enabled: boolean): Promise<void> =>
  api.patch(`/sms/providers/${providerId}/toggle`, { enabled });

/**
 * 测试供应商连接
 */
export const testSMSProvider = (providerId: string): Promise<any> =>
  api.post(`/sms/providers/${providerId}/test`);

/**
 * 刷新供应商余额
 */
export const refreshProviderBalance = (providerId: string): Promise<void> =>
  api.post(`/sms/providers/${providerId}/refresh-balance`);

// ==================== 统计数据 ====================

/**
 * 获取短信统计（简化版）
 */
export const getSMSStats = (): Promise<SMSStats> =>
  api.get<SMSStats>('/sms/stats');

/**
 * 获取详细统计数据
 */
export const getSMSStatistics = (params: {
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
  provider?: string;
}): Promise<SMSStatistics> =>
  api.get<SMSStatistics>('/sms/statistics', { params });

/**
 * 获取实时统计
 */
export const getSMSRealtimeStats = (): Promise<SMSRealtimeStats> =>
  api.get<SMSRealtimeStats>('/sms/statistics/realtime');

/**
 * 获取供应商对比统计
 */
export const getSMSProviderComparison = (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<SMSProviderComparison[]> =>
  api.get<SMSProviderComparison[]>('/sms/statistics/providers/comparison', { params });

/**
 * 导出统计报表 (使用 raw request 因为需要 blob)
 */
export const exportSMSStatistics = (params: {
  startDate: string;
  endDate: string;
  format?: 'csv' | 'excel';
}): Promise<Blob> =>
  request.get('/sms/statistics/export', {
    params,
    responseType: 'blob',
  });

// ==================== 验证码管理 ====================

/**
 * 获取验证码记录
 */
export const getVerificationCodes = (params?: {
  page?: number;
  limit?: number;
  codeType?: string;
  status?: string;
  phone?: string;
  startDate?: string;
  endDate?: string;
}): Promise<any> =>
  api.get('/sms/verification-codes', { params });

/**
 * 获取验证码详情
 */
export const getVerificationCode = (id: string): Promise<any> =>
  api.get(`/sms/verification-codes/${id}`);

/**
 * 提取验证码（自动识别）
 */
export const extractVerificationCode = (smsId: string): Promise<any> =>
  api.post(`/sms/${smsId}/extract-code`);

/**
 * 批量提取验证码
 */
export const batchExtractVerificationCodes = (smsIds: string[]): Promise<any> =>
  api.post('/sms/batch/extract-codes', { smsIds });

/**
 * 获取设备的最新验证码
 */
export const getDeviceLatestCode = (deviceId: string, params?: {
  codeType?: string;
  provider?: string;
}): Promise<any> =>
  api.get(`/sms/device/${deviceId}/latest-code`, { params });

/**
 * 获取用户的验证码历史
 */
export const getUserVerificationCodes = (userId: string, params?: {
  codeType?: string;
  limit?: number;
}): Promise<any> =>
  api.get(`/sms/user/${userId}/codes`, { params });

// ==================== 设备绑定 ====================

/**
 * 为设备分配号码
 */
export const allocateSMSNumberForDevice = (deviceId: string, params?: {
  country?: string;
  provider?: string;
}): Promise<any> =>
  api.post(`/sms/device/${deviceId}/allocate`, params);

/**
 * 释放设备的号码
 */
export const releaseDeviceSMSNumber = (deviceId: string): Promise<void> =>
  api.post(`/sms/device/${deviceId}/release`);

/**
 * 获取设备绑定的号码
 */
export const getDeviceSMSNumber = (deviceId: string): Promise<SMSNumber> =>
  api.get(`/sms/device/${deviceId}/number`);

/**
 * 获取设备接收的短信
 */
export const getDeviceSMS = (deviceId: string, params?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<SMSRecord[]> =>
  api.get(`/sms/device/${deviceId}/messages`, { params });

// ==================== 告警管理 ====================

/**
 * 获取短信告警
 */
export const getSMSAlerts = (params?: {
  page?: number;
  limit?: number;
  status?: 'active' | 'resolved';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  type?: string;
}): Promise<any> =>
  api.get('/sms/alerts', { params });

/**
 * 确认告警
 */
export const acknowledgeSMSAlert = (alertId: string): Promise<void> =>
  api.post(`/sms/alerts/${alertId}/acknowledge`);

/**
 * 解决告警
 */
export const resolveSMSAlert = (alertId: string, note?: string): Promise<void> =>
  api.post(`/sms/alerts/${alertId}/resolve`, { note });

// ==================== 审计日志 ====================

/**
 * 获取短信操作日志
 */
export const getSMSAuditLogs = (params?: {
  page?: number;
  limit?: number;
  action?: string;
  userId?: string;
  phone?: string;
  startDate?: string;
  endDate?: string;
}): Promise<any> =>
  api.get('/sms/audit-logs', { params });

/**
 * 导出审计日志 (使用 raw request 因为需要 blob)
 */
export const exportSMSAuditLogs = (params?: {
  startDate?: string;
  endDate?: string;
  format?: 'csv' | 'excel';
}): Promise<Blob> =>
  request.get('/sms/audit-logs/export', {
    params,
    responseType: 'blob',
  });

// ==================== 高级功能 ====================

/**
 * 获取号码质量分析
 */
export const getSMSNumberQualityAnalysis = (numberId: string): Promise<any> =>
  api.get(`/sms/numbers/${numberId}/quality-analysis`);

/**
 * 获取供应商性能对比
 */
export const getSMSProviderPerformance = (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<any> =>
  api.get('/sms/providers/performance', { params });

/**
 * 获取验证码识别统计
 */
export const getCodeRecognitionStats = (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<any> =>
  api.get('/sms/code-recognition/stats', { params });

/**
 * 获取号码地理分布
 */
export const getSMSNumberGeoDistribution = (): Promise<any> =>
  api.get('/sms/numbers/geo/distribution');

/**
 * 获取最优号码池配置建议
 */
export const getOptimalNumberPoolConfig = (): Promise<any> =>
  api.get('/sms/intelligence/optimal-config');
