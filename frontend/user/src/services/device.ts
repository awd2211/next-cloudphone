import request from '@/utils/request';
import type { Device, PaginationParams, PaginatedResponse } from '@/types';

// 获取我的设备列表
export const getMyDevices = (params?: PaginationParams) => {
  return request.get<PaginatedResponse<Device>>('/devices/my', { params });
};

// 获取设备详情
export const getDevice = (id: string) => {
  return request.get<Device>(`/devices/${id}`);
};

// 启动设备
export const startDevice = (id: string) => {
  return request.post(`/devices/${id}/start`);
};

// 停止设备
export const stopDevice = (id: string) => {
  return request.post(`/devices/${id}/stop`);
};

// 重启设备
export const rebootDevice = (id: string) => {
  return request.post(`/devices/${id}/reboot`);
};

// 获取设备统计
export const getMyDeviceStats = () => {
  return request.get('/devices/my/stats');
};

// 获取单个设备的资源统计
export const getDeviceStats = (id: string) => {
  return request.get(`/devices/${id}/stats`);
};

// 创建设备
export interface CreateDeviceDto {
  name: string;
  description?: string;
  type?: 'phone' | 'tablet';
  providerType?: 'redroid' | 'huawei_cph' | 'alibaba_ecp' | 'physical';
  cpuCores?: number;
  memoryMB?: number;
  storageMB?: number;
  resolution?: string;
  dpi?: number;
  androidVersion?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  providerSpecificConfig?: Record<string, any>;
}

export const createDevice = (data: CreateDeviceDto) => {
  return request.post<{
    success: boolean;
    data: {
      sagaId: string;
      device: any;
    };
    message: string;
  }>('/devices', data);
};

// 查询设备创建进度（Saga 状态）
export const getDeviceCreationStatus = (sagaId: string) => {
  return request.get<{
    sagaId: string;
    status: 'pending' | 'completed' | 'failed';
    currentStep: string;
    device?: any;
    error?: string;
  }>(`/devices/saga/${sagaId}`);
};

// ========== 批量操作相关 API ==========

/**
 * 批量启动设备
 */
export interface BatchDevicesDto {
  deviceIds: string[];
}

export interface BatchOperationResponse {
  results: Array<{
    deviceId: string;
    success: boolean;
    error?: string;
  }>;
}

export const batchStartDevices = (data: BatchDevicesDto) => {
  // 后端期望 { ids } 而不是 { deviceIds }
  return request.post<BatchOperationResponse>('/devices/batch/start', { ids: data.deviceIds });
};

/**
 * 批量停止设备
 */
export const batchStopDevices = (data: BatchDevicesDto) => {
  // 后端期望 { ids } 而不是 { deviceIds }
  return request.post<BatchOperationResponse>('/devices/batch/stop', { ids: data.deviceIds });
};

/**
 * 批量重启设备
 */
export const batchRestartDevices = (data: BatchDevicesDto) => {
  // 后端使用 /devices/batch/reboot 而不是 restart，且期望 { ids }
  return request.post<BatchOperationResponse>('/devices/batch/reboot', { ids: data.deviceIds });
};

/**
 * 批量删除设备
 */
export const batchDeleteDevices = (data: BatchDevicesDto) => {
  // 后端使用 POST /devices/batch/delete 而不是 DELETE /devices/batch，且期望 { ids }
  return request.post<BatchOperationResponse>('/devices/batch/delete', { ids: data.deviceIds });
};

/**
 * 批量安装应用
 */
export interface BatchInstallAppDto {
  appId: string;
  deviceIds: string[];
}

export const batchInstallApp = (data: BatchInstallAppDto) => {
  // 注意：设备批量安装应用应该通过 apps 服务的 install 端点
  // POST /apps/install 支持传入 deviceIds 数组
  return request.post<BatchOperationResponse>('/apps/install', {
    applicationId: data.appId,
    deviceIds: data.deviceIds,
  });
};
