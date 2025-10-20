import request from '@/utils/request';
import type {
  Application,
  DeviceApplication,
  InstallAppDto,
  PaginationParams,
  PaginatedResponse,
} from '@/types';

// 应用列表
export const getApps = (params?: PaginationParams) => {
  return request.get<PaginatedResponse<Application>>('/apps', { params });
};

// 获取应用详情
export const getApp = (id: string) => {
  return request.get<Application>(`/apps/${id}`);
};

// 上传应用
export const uploadApp = (file: File, onProgress?: (percent: number) => void) => {
  const formData = new FormData();
  formData.append('file', file);

  return request.post<Application>('/apps', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
};

// 删除应用
export const deleteApp = (id: string) => {
  return request.delete(`/apps/${id}`);
};

// 安装应用到设备
export const installAppToDevice = (data: InstallAppDto) => {
  return request.post<DeviceApplication>('/apps/install', data);
};

// 卸载设备应用
export const uninstallAppFromDevice = (deviceId: string, applicationId: string) => {
  return request.post(`/apps/uninstall`, { deviceId, applicationId });
};

// 获取设备已安装应用
export const getDeviceApps = (deviceId: string) => {
  return request.get<DeviceApplication[]>(`/apps/device/${deviceId}`);
};

// 应用统计
export const getAppStats = () => {
  return request.get<{
    total: number;
    categories: Record<string, number>;
  }>('/apps/stats');
};
