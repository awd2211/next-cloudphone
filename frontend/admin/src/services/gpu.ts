/**
 * GPU 设备管理 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
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
export const getGPUDevices = (
  params?: PaginationParams & { status?: string; nodeId?: string }
): Promise<PaginatedResponse<GPUDevice>> =>
  api.get<PaginatedResponse<GPUDevice>>('/resources/gpu', { params });

// 获取 GPU 设备详情
export const getGPUDevice = (id: string): Promise<GPUDevice> =>
  api.get<GPUDevice>(`/resources/gpu/${id}`);

// 获取 GPU 实时状态
export const getGPUStatus = (id: string): Promise<any> =>
  api.get(`/resources/gpu/${id}/status`);

// ========== GPU 分配管理 ==========

// 分配 GPU 到设备
export const allocateGPU = (
  gpuId: string,
  deviceId: string,
  mode: 'exclusive' | 'shared' = 'exclusive'
): Promise<GPUAllocation> =>
  api.post<GPUAllocation>(`/resources/gpu/${gpuId}/allocate`, { deviceId, mode });

// 释放 GPU 分配
export const deallocateGPU = (gpuId: string, deviceId?: string): Promise<void> =>
  api.delete(`/resources/gpu/${gpuId}/deallocate`, { data: { deviceId } });

// 获取分配记录
export const getGPUAllocations = (
  params?: PaginationParams & { gpuId?: string; deviceId?: string; status?: string }
): Promise<PaginatedResponse<GPUAllocation>> =>
  api.get<PaginatedResponse<GPUAllocation>>('/resources/gpu/allocations', { params });

// ========== GPU 监控统计 ==========

// 获取 GPU 统计信息
export const getGPUStats = (): Promise<GPUStats> =>
  api.get<GPUStats>('/resources/gpu/stats');

// 获取 GPU 使用趋势
export const getGPUUsageTrend = (
  gpuId: string,
  startDate?: string,
  endDate?: string
): Promise<GPUUsageTrend[]> =>
  api.get<GPUUsageTrend[]>(`/resources/gpu/${gpuId}/usage-trend`, {
    params: { startDate, endDate },
  });

// 获取集群 GPU 使用趋势
export const getClusterGPUTrend = (
  startDate?: string,
  endDate?: string
): Promise<any> =>
  api.get('/resources/gpu/cluster-trend', {
    params: { startDate, endDate },
  });

// 获取 GPU 性能分析
export const getGPUPerformanceAnalysis = (gpuId: string): Promise<any> =>
  api.get(`/resources/gpu/${gpuId}/performance`);

// ========== GPU 驱动管理 ==========

// 获取驱动信息
export const getGPUDriverInfo = (nodeId: string): Promise<any> =>
  api.get(`/resources/gpu/driver/${nodeId}`);

// 更新驱动
export const updateGPUDriver = (nodeId: string, driverVersion: string): Promise<void> =>
  api.post(`/resources/gpu/driver/${nodeId}/update`, { driverVersion });
