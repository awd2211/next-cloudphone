/**
 * 设备服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type { Device, PaginationParams, PaginatedResponse } from '@/types';

// ========== 设备查询 ==========

/** 获取我的设备列表 */
export const getMyDevices = (params?: PaginationParams) =>
  api.get<PaginatedResponse<Device>>('/devices/my', { params });

/** 获取设备详情 */
export const getDevice = (id: string) =>
  api.get<Device>(`/devices/${id}`);

/** 获取设备统计 */
export const getMyDeviceStats = () =>
  api.get<{ total: number; idle: number; running: number; stopped: number; error: number }>('/devices/my/stats');

/** 获取单个设备的资源统计 */
export const getDeviceStats = (id: string) =>
  api.get<{ cpu: number; memory: number; storage: number }>(`/devices/${id}/stats`);

// ========== 设备操作 ==========

/** 启动设备 */
export const startDevice = (id: string) =>
  api.post<void>(`/devices/${id}/start`);

/** 停止设备 */
export const stopDevice = (id: string) =>
  api.post<void>(`/devices/${id}/stop`);

/** 重启设备 */
export const rebootDevice = (id: string) =>
  api.post<void>(`/devices/${id}/reboot`);

// ========== 设备创建 ==========

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
  metadata?: Record<string, unknown>;
  providerSpecificConfig?: Record<string, unknown>;
}

interface CreateDeviceResponse {
  sagaId: string;
  device: Device;
}

/** 创建设备（Saga 模式） */
export const createDevice = (data: CreateDeviceDto) =>
  api.post<CreateDeviceResponse>('/devices', data);

interface DeviceCreationStatus {
  sagaId: string;
  status: 'pending' | 'completed' | 'failed';
  currentStep: string;
  device?: Device;
  error?: string;
}

/** 查询设备创建进度 */
export const getDeviceCreationStatus = (sagaId: string) =>
  api.get<DeviceCreationStatus>(`/devices/saga/${sagaId}`);

// ========== 批量操作 ==========

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

/** 批量启动设备 */
export const batchStartDevices = (data: BatchDevicesDto) =>
  api.post<BatchOperationResponse>('/devices/batch/start', { ids: data.deviceIds });

/** 批量停止设备 */
export const batchStopDevices = (data: BatchDevicesDto) =>
  api.post<BatchOperationResponse>('/devices/batch/stop', { ids: data.deviceIds });

/** 批量重启设备 */
export const batchRestartDevices = (data: BatchDevicesDto) =>
  api.post<BatchOperationResponse>('/devices/batch/reboot', { ids: data.deviceIds });

/** 批量删除设备 */
export const batchDeleteDevices = (data: BatchDevicesDto) =>
  api.post<BatchOperationResponse>('/devices/batch/delete', { ids: data.deviceIds });

// ========== 应用安装 ==========

export interface BatchInstallAppDto {
  appId: string;
  deviceIds: string[];
}

/** 批量安装应用 */
export const batchInstallApp = (data: BatchInstallAppDto) =>
  api.post<BatchOperationResponse>('/apps/install', {
    applicationId: data.appId,
    deviceIds: data.deviceIds,
  });
