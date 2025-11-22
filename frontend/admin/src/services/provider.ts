/**
 * 提供商管理 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type { DeviceProvider, ProviderSpec, CloudSyncStatus } from '@/types/provider';

/**
 * 获取所有提供商规格
 */
export const getProviderSpecs = (): Promise<ProviderSpec[]> =>
  api.get<ProviderSpec[]>('/devices/providers/specs');

/**
 * 获取指定提供商的规格列表
 */
export const getProviderSpecsByType = (provider: DeviceProvider): Promise<ProviderSpec[]> =>
  api.get<ProviderSpec[]>(`/devices/providers/${provider}/specs`);

/**
 * 获取云设备同步状态
 */
export const getCloudSyncStatus = (params?: {
  provider?: DeviceProvider;
  page?: number;
  pageSize?: number;
}): Promise<{ data: CloudSyncStatus[]; total: number }> =>
  api.get<{ data: CloudSyncStatus[]; total: number }>('/devices/cloud/sync-status', {
    params,
  });

/**
 * 手动触发云设备同步
 */
export const triggerCloudSync = (provider?: DeviceProvider): Promise<void> =>
  api.post('/devices/cloud/sync', { provider });

/**
 * 获取提供商健康状态
 */
export const getProviderHealth = (): Promise<{
  provider: DeviceProvider;
  healthy: boolean;
  message?: string;
  lastCheck: string;
}[]> =>
  api.get<{
    provider: DeviceProvider;
    healthy: boolean;
    message?: string;
    lastCheck: string;
  }[]>('/devices/providers/health');

/**
 * 获取提供商配置
 */
export const getProviderConfig = (provider: DeviceProvider): Promise<any> =>
  api.get(`/admin/providers/${provider}/config`);

/**
 * 更新提供商配置
 */
export const updateProviderConfig = (provider: DeviceProvider, config: any): Promise<void> =>
  api.put(`/admin/providers/${provider}/config`, config);

/**
 * 测试提供商连接
 */
export const testProviderConnection = (provider: DeviceProvider): Promise<any> =>
  api.post(`/admin/providers/${provider}/test`);

/**
 * 获取云账单对账数据
 */
export const getCloudBilling = (params: {
  provider: DeviceProvider;
  startDate: string;
  endDate: string;
}): Promise<any> =>
  api.get('/admin/billing/cloud-reconciliation', { params });
