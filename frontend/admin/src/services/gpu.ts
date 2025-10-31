import request from '@/utils/request';
import type {
  GPUDevice,
  GPUAllocation,
  GPUStats,
  GPUUsageTrend,
  PaginationParams,
  PaginatedResponse,
} from '@/types';

// ========== GPU 设备管理 ==========

// 获取 GPU 设备列表
export const getGPUDevices = (params?: PaginationParams & { status?: string; nodeId?: string }) => {
  return request.get<PaginatedResponse<GPUDevice>>('/resources/gpu', { params });
};

// 获取 GPU 设备详情
export const getGPUDevice = (id: string) => {
  return request.get<GPUDevice>(`/resources/gpu/${id}`);
};

// 获取 GPU 实时状态
export const getGPUStatus = (id: string) => {
  return request.get(`/resources/gpu/${id}/status`);
};

// ========== GPU 分配管理 ==========

// 分配 GPU 到设备
export const allocateGPU = (
  gpuId: string,
  deviceId: string,
  mode: 'exclusive' | 'shared' = 'exclusive'
) => {
  return request.post<GPUAllocation>(`/resources/gpu/${gpuId}/allocate`, { deviceId, mode });
};

// 释放 GPU 分配
export const deallocateGPU = (gpuId: string, deviceId?: string) => {
  return request.delete(`/resources/gpu/${gpuId}/deallocate`, { data: { deviceId } });
};

// 获取分配记录
export const getGPUAllocations = (
  params?: PaginationParams & { gpuId?: string; deviceId?: string; status?: string }
) => {
  return request.get<PaginatedResponse<GPUAllocation>>('/resources/gpu/allocations', { params });
};

// ========== GPU 监控统计 ==========

// 获取 GPU 统计信息
export const getGPUStats = () => {
  return request.get<GPUStats>('/resources/gpu/stats');
};

// 获取 GPU 使用趋势
export const getGPUUsageTrend = (gpuId: string, startDate?: string, endDate?: string) => {
  return request.get<GPUUsageTrend[]>(`/resources/gpu/${gpuId}/usage-trend`, {
    params: { startDate, endDate },
  });
};

// 获取集群 GPU 使用趋势
export const getClusterGPUTrend = (startDate?: string, endDate?: string) => {
  return request.get('/resources/gpu/cluster-trend', {
    params: { startDate, endDate },
  });
};

// 获取 GPU 性能分析
export const getGPUPerformanceAnalysis = (gpuId: string) => {
  return request.get(`/resources/gpu/${gpuId}/performance`);
};

// ========== GPU 驱动管理 ==========

// 获取驱动信息
export const getGPUDriverInfo = (nodeId: string) => {
  return request.get(`/resources/gpu/driver/${nodeId}`);
};

// 更新驱动
export const updateGPUDriver = (nodeId: string, driverVersion: string) => {
  return request.post(`/resources/gpu/driver/${nodeId}/update`, { driverVersion });
};
