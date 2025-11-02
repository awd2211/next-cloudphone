import request from '@/utils/request';
import type { Application, PaginationParams, PaginatedResponse } from '@/types';

// 获取应用列表
export const getApps = (params?: PaginationParams & { category?: string; search?: string }) => {
  return request.get<PaginatedResponse<Application>>('/apps', { params });
};

// 获取应用详情
export const getApp = (id: string) => {
  return request.get<Application>(`/apps/${id}`);
};

// 安装应用到设备
export const installAppToDevice = (deviceId: string, appId: string) => {
  return request.post(`/apps/install`, { deviceId, appId });
};

// 获取应用列表（支持状态筛选）
export const getAppList = (params?: { status?: string; page?: number; pageSize?: number }) => {
  return request.get<{ items: Application[]; total: number }>('/apps', { params });
};

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
 */
export const getInstalledApps = (deviceId: string) => {
  return request.get<InstalledAppInfo[]>(`/devices/${deviceId}/installed-apps`);
};

/**
 * 卸载应用
 */
export const uninstallApp = (deviceId: string, packageName: string) => {
  return request.delete(`/devices/${deviceId}/apps/${packageName}`);
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
  deviceId: string,
  data: BatchUninstallAppsDto
) => {
  return request.post<BatchUninstallResult>(
    `/devices/${deviceId}/apps/batch-uninstall`,
    data
  );
};

/**
 * 更新应用
 */
export const updateApp = (deviceId: string, packageName: string) => {
  return request.post(`/devices/${deviceId}/apps/${packageName}/update`);
};
