/**
 * 快照服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type { Snapshot } from '@/utils/snapshotConfig';

// 获取设备的所有快照
export const getDeviceSnapshots = (deviceId: string): Promise<Snapshot[]> =>
  api.get<Snapshot[]>(`/snapshots/device/${deviceId}`);

// 创建快照
export const createSnapshot = (deviceId: string, data: { name: string; description?: string }): Promise<Snapshot> =>
  api.post<Snapshot>(`/snapshots/device/${deviceId}`, data);

// 恢复快照
export const restoreSnapshot = (snapshotId: string): Promise<void> =>
  api.post<void>(`/snapshots/${snapshotId}/restore`, {});

// 删除快照
export const deleteSnapshot = (snapshotId: string): Promise<void> =>
  api.delete<void>(`/snapshots/${snapshotId}`);

// 获取快照详情
export const getSnapshot = (snapshotId: string): Promise<Snapshot> =>
  api.get<Snapshot>(`/snapshots/${snapshotId}`);

// 获取用户的所有快照
export const getUserSnapshots = (): Promise<Snapshot[]> =>
  api.get<Snapshot[]>('/snapshots');
