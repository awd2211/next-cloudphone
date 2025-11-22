/**
 * 快照管理服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type {
  DeviceSnapshot,
  CreateSnapshotDto,
  SnapshotStats,
  PaginationParams,
  PaginatedResponse,
} from '@/types';

// 获取快照列表
export const getSnapshots = (
  params?: PaginationParams & { deviceId?: string; status?: string }
): Promise<PaginatedResponse<DeviceSnapshot>> =>
  api.get<PaginatedResponse<DeviceSnapshot>>('/snapshots', { params });

// 获取设备的所有快照
export const getDeviceSnapshots = (deviceId: string): Promise<DeviceSnapshot[]> =>
  api.get<DeviceSnapshot[]>(`/snapshots/device/${deviceId}`);

// 获取快照详情
export const getSnapshot = (id: string): Promise<DeviceSnapshot> =>
  api.get<DeviceSnapshot>(`/snapshots/${id}`);

// 创建快照
export const createSnapshot = (data: CreateSnapshotDto): Promise<DeviceSnapshot> =>
  api.post<DeviceSnapshot>(`/snapshots/device/${data.deviceId}`, {
    name: data.name,
    description: data.description,
  });

// 恢复快照
export const restoreSnapshot = (id: string): Promise<void> =>
  api.post<void>(`/snapshots/${id}/restore`);

// 压缩快照
export const compressSnapshot = (id: string): Promise<void> =>
  api.post<void>(`/snapshots/${id}/compress`);

// 删除快照
export const deleteSnapshot = (id: string): Promise<void> =>
  api.delete<void>(`/snapshots/${id}`);

// 批量删除快照
export const batchDeleteSnapshots = (snapshotIds: string[]): Promise<void> =>
  api.post<void>('/snapshots/batch-delete', { snapshotIds });

// 获取快照统计
export const getSnapshotStats = (): Promise<SnapshotStats> =>
  api.get<SnapshotStats>('/snapshots/stats/summary');
