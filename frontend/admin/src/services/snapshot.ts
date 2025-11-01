import request from '@/utils/request';
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
) => {
  return request.get<PaginatedResponse<DeviceSnapshot>>('/snapshots', { params });
};

// 获取设备的所有快照
export const getDeviceSnapshots = (deviceId: string) => {
  return request.get<DeviceSnapshot[]>(`/snapshots/device/${deviceId}`);
};

// 获取快照详情
export const getSnapshot = (id: string) => {
  return request.get<DeviceSnapshot>(`/snapshots/${id}`);
};

// 创建快照
export const createSnapshot = (data: CreateSnapshotDto) => {
  return request.post<DeviceSnapshot>(`/snapshots/device/${data.deviceId}`, {
    name: data.name,
    description: data.description,
  });
};

// 恢复快照
export const restoreSnapshot = (id: string) => {
  return request.post(`/snapshots/${id}/restore`);
};

// 压缩快照
export const compressSnapshot = (id: string) => {
  return request.post(`/snapshots/${id}/compress`);
};

// 删除快照
export const deleteSnapshot = (id: string) => {
  return request.delete(`/snapshots/${id}`);
};

// 批量删除快照
export const batchDeleteSnapshots = (snapshotIds: string[]) => {
  return request.post('/snapshots/batch-delete', { snapshotIds });
};

// 获取快照统计
export const getSnapshotStats = () => {
  return request.get<SnapshotStats>('/snapshots/stats/summary');
};
