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
