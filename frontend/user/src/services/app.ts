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
