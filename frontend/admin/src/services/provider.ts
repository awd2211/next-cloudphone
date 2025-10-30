/**
 * 提供商管理 API
 */
import request from '@/utils/request';
import type { DeviceProvider, ProviderSpec, CloudSyncStatus } from '@/types/provider';

/**
 * 获取所有提供商规格
 */
export async function getProviderSpecs() {
  return request<{ data: ProviderSpec[] }>('/devices/providers/specs');
}

/**
 * 获取指定提供商的规格列表
 */
export async function getProviderSpecsByType(provider: DeviceProvider) {
  return request<{ data: ProviderSpec[] }>(`/devices/providers/${provider}/specs`);
}

/**
 * 获取云设备同步状态
 */
export async function getCloudSyncStatus(params?: {
  provider?: DeviceProvider;
  page?: number;
  pageSize?: number;
}) {
  return request<{ data: CloudSyncStatus[]; total: number }>('/devices/cloud/sync-status', {
    params,
  });
}

/**
 * 手动触发云设备同步
 */
export async function triggerCloudSync(provider?: DeviceProvider) {
  return request('/devices/cloud/sync', {
    method: 'POST',
    data: { provider },
  });
}

/**
 * 获取提供商健康状态
 */
export async function getProviderHealth() {
  return request<{
    data: {
      provider: DeviceProvider;
      healthy: boolean;
      message?: string;
      lastCheck: string;
    }[];
  }>('/devices/providers/health');
}

/**
 * 获取提供商配置
 */
export async function getProviderConfig(provider: DeviceProvider) {
  return request(`/admin/providers/${provider}/config`);
}

/**
 * 更新提供商配置
 */
export async function updateProviderConfig(provider: DeviceProvider, config: any) {
  return request(`/admin/providers/${provider}/config`, {
    method: 'PUT',
    data: config,
  });
}

/**
 * 测试提供商连接
 */
export async function testProviderConnection(provider: DeviceProvider) {
  return request(`/admin/providers/${provider}/test`, {
    method: 'POST',
  });
}

/**
 * 获取云账单对账数据
 */
export async function getCloudBilling(params: {
  provider: DeviceProvider;
  startDate: string;
  endDate: string;
}) {
  return request('/admin/billing/cloud-reconciliation', {
    params,
  });
}
