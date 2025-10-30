import request from '@/utils/request';
import type {
  Quota,
  QuotaStatus,
  CreateQuotaDto,
  UpdateQuotaDto,
  CheckQuotaRequest,
  DeductQuotaRequest,
  RestoreQuotaRequest,
  QuotaStatistics,
  QuotaAlert,
} from '@/types';

/**
 * 创建用户配额
 */
export const createQuota = (data: CreateQuotaDto) => {
  return request.post<{
    success: boolean;
    message: string;
    data: Quota;
  }>('/quotas', data);
};

/**
 * 获取用户配额
 */
export const getUserQuota = (userId: string) => {
  return request.get<{
    success: boolean;
    data: Quota;
  }>(`/quotas/user/${userId}`);
};

/**
 * 检查配额是否充足
 */
export const checkQuota = (data: CheckQuotaRequest) => {
  return request.post<{
    success: boolean;
    data: {
      allowed: boolean;
      reason?: string;
      current: number;
      limit: number;
      remaining: number;
    };
  }>('/quotas/check', data);
};

/**
 * 扣减配额
 */
export const deductQuota = (data: DeductQuotaRequest) => {
  return request.post<{
    success: boolean;
    message: string;
    data: Quota;
  }>('/quotas/deduct', data);
};

/**
 * 恢复配额
 */
export const restoreQuota = (data: RestoreQuotaRequest) => {
  return request.post<{
    success: boolean;
    message: string;
    data: Quota;
  }>('/quotas/restore', data);
};

/**
 * 更新配额
 */
export const updateQuota = (id: string, data: UpdateQuotaDto) => {
  return request.put<{
    success: boolean;
    message: string;
    data: Quota;
  }>(`/quotas/${id}`, data);
};

/**
 * 上报设备用量
 */
export const reportDeviceUsage = (
  userId: string,
  usageReport: {
    deviceId: string;
    cpuCores: number;
    memoryGB: number;
    storageGB: number;
    operation: 'increment' | 'decrement';
  }
) => {
  return request.post<{
    success: boolean;
    message: string;
    data: Quota;
  }>(`/quotas/user/${userId}/usage`, usageReport);
};

/**
 * 获取用户使用统计
 */
export const getUsageStats = (userId: string) => {
  return request.get<{
    success: boolean;
    data: QuotaStatistics;
  }>(`/quotas/usage-stats/${userId}`);
};

/**
 * 批量检查配额
 */
export const batchCheckQuota = (requests: CheckQuotaRequest[]) => {
  return request.post<{
    success: boolean;
    data: {
      total: number;
      allowed: number;
      denied: number;
      results: Array<{
        userId: string;
        quotaType: string;
        allowed: boolean;
        reason?: string;
        current: number;
        limit: number;
      }>;
    };
  }>('/quotas/check/batch', requests);
};

/**
 * 获取配额告警列表
 */
export const getQuotaAlerts = (threshold: number = 80) => {
  return request.get<{
    success: boolean;
    data: QuotaAlert[];
    total: number;
  }>('/quotas/alerts', { params: { threshold } });
};
