/**
 * 应用服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type { Application, PaginationParams, PaginatedResponse } from '@/types';

// 获取应用列表
export const getApps = (params?: PaginationParams & { category?: string; search?: string }) =>
  api.get<PaginatedResponse<Application>>('/apps', { params });

// 获取应用详情
export const getApp = (id: string) =>
  api.get<Application>(`/apps/${id}`);

// 安装应用到设备
export const installAppToDevice = (deviceId: string, appId: string): Promise<void> =>
  api.post<void>(`/apps/install`, { deviceId, appId });

// 获取应用列表（支持状态筛选）
export const getAppList = (params?: { status?: string; page?: number; pageSize?: number }) =>
  api.get<{ items: Application[]; total: number }>('/apps', { params });

// ========== 已安装应用管理相关 API ==========

/**
 * 已安装应用信息
 */
export interface InstalledAppInfo {
  packageName: string;
  name: string;
  version: string;
  versionCode: number;
  icon?: string;
  size: number;
  installTime: string;
  updateTime: string;
  isSystemApp: boolean;
  hasUpdate: boolean;
  latestVersion?: string;
}

/**
 * 获取设备已安装应用列表
 * 后端使用 /apps/devices/:deviceId/apps 而不是 /devices/:deviceId/installed-apps
 */
export const getInstalledApps = (deviceId: string) =>
  api.get<InstalledAppInfo[]>(`/apps/devices/${deviceId}/apps`);

/**
 * 卸载应用
 * 后端使用 POST /apps/uninstall 而不是 DELETE /devices/:deviceId/apps/:packageName
 * 需要通过 packageName 查找应用 ID，或者直接使用 uninstallByPackage
 */
export const uninstallApp = (deviceId: string, packageName: string): Promise<void> => {
  // 注意：后端 POST /apps/uninstall 需要 applicationId 而不是 packageName
  // 这里临时使用 packageName 作为 applicationId，实际应该先查询应用ID
  console.warn('uninstallApp: 后端需要 applicationId，当前传入的是 packageName');
  return api.post<void>('/apps/uninstall', {
    applicationId: packageName, // TODO: 应该先通过 packageName 查找真正的 applicationId
    deviceIds: [deviceId],
  });
};

/**
 * 批量卸载应用
 */
export interface BatchUninstallAppsDto {
  packageNames: string[];
}

export interface BatchUninstallResult {
  results: Array<{
    packageName: string;
    success: boolean;
    error?: string;
  }>;
}

export const batchUninstallApps = (
  _deviceId: string,
  _data: BatchUninstallAppsDto
) => {
  // 后端暂未实现批量卸载端点
  console.warn('batchUninstallApps: 后端暂未实现此端点');
  return Promise.resolve({
    results: [],
  } as BatchUninstallResult);
};

/**
 * 更新应用
 * 后端暂未实现单独的更新端点
 */
export const updateApp = (_deviceId: string, _packageName: string) => {
  // 后端暂未实现应用更新端点
  console.warn('updateApp: 后端暂未实现此端点');
  return Promise.reject(new Error('功能暂未实现'));
};
